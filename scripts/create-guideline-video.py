from __future__ import annotations

import math
import os
import shutil
import subprocess
from functools import lru_cache
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFont


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "apps" / "web" / "public"
OUT_DIR = PUBLIC / "guideline"
FRAME_DIR = OUT_DIR / "_frames"
AUDIO_DIR = OUT_DIR / "_audio"
SILENT_FILE = OUT_DIR / "_mirilook-guideline-silent.mp4"
OUT_FILE = OUT_DIR / "mirilook-guideline.mp4"

NARRATION_FILE = AUDIO_DIR / "narration.wav"
EDGE_NARRATION_FILE = AUDIO_DIR / "narration-edge.mp3"
MUSIC_FILE = AUDIO_DIR / "background.wav"
NARRATION_TEXT_FILE = AUDIO_DIR / "narration.txt"
SUBTITLE_FILE = AUDIO_DIR / "guideline-subtitles.ass"
GOOD_JOB_DIR = Path("D:/Claude_Cowork/good-job")
GOOD_JOB_TTS_SCRIPT = GOOD_JOB_DIR / "gen-tts-gemini.py"
GOOD_JOB_TTS_MODEL = "gemini-2.5-flash-preview-tts"
GOOD_JOB_TTS_VOICE = "Charon"
GOOD_JOB_TTS_STYLE = "차분하고 신뢰감 있는 남성 나레이터 톤으로, 또박또박 읽어줘:"

W, H = 1280, 720
OUTPUT_H = 840
CAPTION_BAR_H = OUTPUT_H - H
FPS = 24
TOTAL_SCENES = 5
MIN_SCENE_SECONDS = 6.8

BG = (17, 16, 14)
PANEL = (23, 21, 17)
PANEL_2 = (31, 27, 20)
LINE = (69, 58, 39)
GOLD = (243, 210, 138)
GOLD_DARK = (161, 132, 75)
TEXT = (255, 250, 241)
MUTED = (216, 203, 184)
SOFT = (184, 170, 149)
BLACK_GLASS = (0, 0, 0, 156)
GREEN = (84, 184, 134)

NARRATION_TEXT = """미리룩에 오신 여러분, 환영합니다.
미리룩 서비스를 이용하는 방법에 대해 안내해드리겠습니다.
첫 번째, 홈페이지에서 내 얼굴에 어울리는 헤어스타일 추천 서비스를 시작합니다.
두 번째, 회원가입 또는 로그인을 진행합니다.
세 번째, 로그인 후 좌측면, 정면, 우측면 사진 3장을 업로드합니다. 정면을 포함한 최소 2장의 사진이 필요하고, 3장을 업로드해주시면 추천 품질이 올라갑니다.
네 번째, 추천 받기 버튼을 눌러 9개의 추천 스타일을 확인합니다.
다섯 번째, 마음에 드는 스타일을 선택해 상담용 이미지 9장을 생성하고, 미용실에서 나에게 맞는 헤어스타일로 변화해보세요."""

SUBTITLE_CUES = [
    (0.40, 3.70, "미리룩에 오신 여러분, 환영합니다."),
    (3.70, 8.20, "미리룩 서비스를 이용하는 방법에 대해\\N안내해드리겠습니다."),
    (8.20, 14.20, "첫 번째, 홈페이지에서 내 얼굴에 어울리는\\N헤어스타일 추천 서비스를 시작합니다."),
    (14.20, 19.30, "두 번째, 회원가입 또는 로그인을 진행합니다."),
    (19.30, 28.30, "세 번째, 로그인 후 좌측면, 정면, 우측면\\N사진 3장을 업로드합니다."),
    (28.30, 37.40, "정면을 포함한 최소 2장이 필요하고,\\N3장을 올리면 추천 품질이 올라갑니다."),
    (37.40, 43.80, "네 번째, 추천 받기 버튼을 눌러\\N9개의 추천 스타일을 확인합니다."),
    (43.80, 50.60, "다섯 번째, 마음에 드는 스타일을 선택해\\N상담용 이미지 9장을 생성하고,"),
    (50.60, 55.10, "미용실에서 나에게 맞는 헤어스타일로\\N변화해보세요."),
]

SCENE_COPY = [
    {
        "title": "1. 메인 홈 페이지",
        "subtitle": "미리룩 첫 화면에서 추천 서비스를 시작합니다.",
        "narration": "미리룩에 오신 여러분, 환영합니다.",
    },
    {
        "title": "2. 회원가입 / 로그인",
        "subtitle": "계정을 만들고 상담 이력과 결제, 커뮤니티 기능을 연결합니다.",
        "narration": "첫 번째, 회원가입을 합니다.",
    },
    {
        "title": "3. 내 사진 3장 업로드",
        "subtitle": "좌측면, 정면, 우측면 사진을 업로드해 추천 정확도를 높입니다.",
        "narration": "두 번째, 내 사진을 업로드합니다.",
    },
    {
        "title": "4. 추천 스타일 9개 확인",
        "subtitle": "추천 받기 버튼을 누르면 9개의 헤어스타일 후보가 생성됩니다.",
        "narration": "세 번째, 추천 받은 스타일 9개 중에 1개를 고릅니다.",
    },
    {
        "title": "5. 상담용 이미지 9장 생성",
        "subtitle": "선택한 스타일을 다양한 각도의 상담 이미지로 확장합니다.",
        "narration": "상담용 이미지를 저장하고 미용실에서 나에게 맞는 스타일로 변화해보세요.",
    },
]


def font(size: int, bold: bool = False, family: str = "body") -> ImageFont.FreeTypeFont:
    if family == "hero":
        candidates = [
            Path("C:/Windows/Fonts/Gungsuh.ttf"),
            Path("C:/Windows/Fonts/gungsuh.ttc"),
            Path("C:/Windows/Fonts/batang.ttc"),
            Path("C:/Windows/Fonts/HANBatangB.ttf" if bold else "C:/Windows/Fonts/HANBatang.ttf"),
            Path("C:/Windows/Fonts/timesbd.ttf" if bold else "C:/Windows/Fonts/times.ttf"),
        ]
    else:
        candidates = [
            Path("C:/Windows/Fonts/Pretendard-Bold.otf" if bold else "C:/Windows/Fonts/Pretendard-Regular.otf"),
            Path("C:/Windows/Fonts/malgunbd.ttf" if bold else "C:/Windows/Fonts/malgun.ttf"),
            Path("C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf"),
            Path("C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf"),
        ]

    for path in candidates:
        if path.exists():
            return ImageFont.truetype(str(path), size)

    return ImageFont.load_default()


F12 = font(12)
F14 = font(14)
F16 = font(16)
F18 = font(18)
F20B = font(20, True)
F22B = font(22, True)
F24B = font(24, True)
F30B = font(30, True)
F38B = font(38, True)
F48H = font(48, True, "hero")
F52H = font(52, True, "hero")


@lru_cache(maxsize=80)
def load_image(path: str, size: tuple[int, int], crop: bool = True) -> Image.Image:
    image = Image.open(PUBLIC / path).convert("RGB")

    if not crop:
        return image.resize(size, Image.Resampling.LANCZOS)

    scale = max(size[0] / image.width, size[1] / image.height)
    resized = image.resize(
        (math.ceil(image.width * scale), math.ceil(image.height * scale)),
        Image.Resampling.LANCZOS,
    )
    left = (resized.width - size[0]) // 2
    top = (resized.height - size[1]) // 2

    return resized.crop((left, top, left + size[0], top + size[1]))


def rounded_image(image: Image.Image, radius: int) -> Image.Image:
    mask = Image.new("L", image.size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, image.width, image.height), radius=radius, fill=255)
    out = Image.new("RGBA", image.size)
    out.paste(image.convert("RGBA"), (0, 0), mask)
    return out


def paste_round(base: Image.Image, image: Image.Image, xy: tuple[int, int], radius: int) -> None:
    base.alpha_composite(rounded_image(image, radius), xy)


def text_size(draw: ImageDraw.ImageDraw, text: str, f: ImageFont.FreeTypeFont) -> tuple[int, int]:
    bbox = draw.textbbox((0, 0), text, font=f)
    return bbox[2] - bbox[0], bbox[3] - bbox[1]


def draw_center_text(
    draw: ImageDraw.ImageDraw,
    box: tuple[int, int, int, int],
    text: str,
    fill=TEXT,
    f=F18,
) -> None:
    tw, th = text_size(draw, text, f)
    x = box[0] + (box[2] - box[0] - tw) // 2
    y = box[1] + (box[3] - box[1] - th) // 2
    draw.text((x, y), text, fill=fill, font=f)


def wrap_text(draw: ImageDraw.ImageDraw, text: str, f: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""

    for word in words:
        trial = f"{current} {word}".strip()
        if draw.textlength(trial, font=f) <= max_width:
            current = trial
            continue
        if current:
            lines.append(current)
        current = word

    if current:
        lines.append(current)

    return lines


def draw_wrapped(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    text: str,
    max_width: int,
    fill=MUTED,
    f=F18,
    line_gap: int = 7,
) -> int:
    y = xy[1]

    for line in wrap_text(draw, text, f, max_width):
        draw.text((xy[0], y), line, fill=fill, font=f)
        y += f.size + line_gap

    return y


def draw_progress(draw: ImageDraw.ImageDraw, scene_index: int) -> None:
    labels = ["홈", "로그인", "사진 업로드", "9개 추천", "상담 이미지"]
    x, y = 72, 646
    gap = 230

    for idx, label in enumerate(labels):
        cx = x + idx * gap
        active = idx <= scene_index

        if idx < len(labels) - 1:
            draw.line(
                (cx + 28, y + 16, cx + gap - 28, y + 16),
                fill=GOLD_DARK if active else LINE,
                width=3,
            )

        draw.ellipse(
            (cx, y, cx + 32, y + 32),
            fill=GOLD if active else PANEL_2,
            outline=GOLD_DARK,
            width=1,
        )
        draw_center_text(
            draw,
            (cx, y, cx + 32, y + 32),
            str(idx + 1),
            fill=BG if active else SOFT,
            f=F14,
        )
        draw_center_text(
            draw,
            (cx - 42, y + 40, cx + 76, y + 64),
            label,
            fill=GOLD if idx == scene_index else SOFT,
            f=F14,
        )


def draw_brand_mark(frame: Image.Image, draw: ImageDraw.ImageDraw) -> None:
    logo = load_image("brand/mirilook-web-mark.png", (48, 48), True)
    draw.rounded_rectangle((70, 56, 122, 108), radius=14, fill=PANEL_2, outline=GOLD_DARK, width=1)
    paste_round(frame, logo, (72, 58), 12)
    draw.text((138, 62), "Miri Look", fill=TEXT, font=F24B)
    draw.text((140, 94), "AI Salon Consultation", fill=GOLD, font=F14)


def base_frame(scene_index: int) -> Image.Image:
    copy = SCENE_COPY[scene_index]
    bg = load_image("mock/premium-salon-suite.png", (W, H), True).convert("RGBA")
    bg = ImageEnhance.Brightness(bg).enhance(0.24)
    frame = Image.alpha_composite(bg, Image.new("RGBA", (W, H), (17, 16, 14, 184)))
    draw = ImageDraw.Draw(frame)

    draw.rounded_rectangle(
        (42, 38, 1238, 682),
        radius=24,
        fill=(17, 16, 14, 212),
        outline=(255, 255, 255, 22),
        width=1,
    )
    draw_brand_mark(frame, draw)
    draw.text((70, 142), copy["title"], fill=TEXT, font=F38B)
    draw.text((72, 190), copy["subtitle"], fill=MUTED, font=F18)
    draw.rounded_rectangle((70, 225, 600, 259), radius=10, fill=(31, 27, 20, 220), outline=(255, 255, 255, 18))
    draw.text((88, 233), copy["narration"], fill=GOLD, font=F16)
    draw_progress(draw, scene_index)

    return frame


def browser_shell(frame: Image.Image, xy: tuple[int, int], size: tuple[int, int], title: str) -> tuple[int, int, int, int]:
    draw = ImageDraw.Draw(frame)
    x, y = xy
    w, h = size

    draw.rounded_rectangle(
        (x, y, x + w, y + h),
        radius=16,
        fill=(12, 11, 10),
        outline=(255, 255, 255, 28),
        width=1,
    )
    draw.rounded_rectangle((x, y, x + w, y + 42), radius=16, fill=(33, 31, 28))

    for i, color in enumerate([(255, 95, 87), (255, 189, 46), (40, 201, 64)]):
        draw.ellipse((x + 18 + i * 22, y + 15, x + 30 + i * 22, y + 27), fill=color)

    draw.rounded_rectangle((x + 98, y + 10, x + w - 22, y + 32), radius=8, fill=(18, 17, 16))
    draw.text((x + 116, y + 13), title, fill=SOFT, font=F12)

    return (x + 22, y + 58, x + w - 22, y + h - 22)


def draw_cursor(draw: ImageDraw.ImageDraw, x: int, y: int, pulse: float = 0.0) -> None:
    r = int(18 + 10 * pulse)
    draw.ellipse((x - r, y - r, x + r, y + r), outline=(243, 210, 138, 140), width=3)
    draw.polygon([(x, y), (x + 20, y + 42), (x + 28, y + 25), (x + 48, y + 24)], fill=TEXT, outline=BG)


def draw_button(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], label: str, active: bool = True) -> None:
    draw.rounded_rectangle(
        box,
        radius=10,
        fill=GOLD if active else PANEL_2,
        outline=GOLD if not active else None,
        width=2,
    )
    draw_center_text(draw, box, label, fill=BG if active else GOLD, f=F18)


def draw_guideline_button(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int]) -> None:
    x1, y1, x2, y2 = box
    draw.rounded_rectangle(box, radius=12, fill=PANEL_2, outline=GOLD, width=2)
    cx, cy = x1 + 30, y1 + 35
    draw.ellipse((cx - 12, cy - 12, cx + 12, cy + 12), outline=GOLD, width=2)
    draw.polygon([(cx - 3, cy - 7), (cx - 3, cy + 7), (cx + 8, cy)], fill=GOLD)
    draw.text((x1 + 54, y1 + 11), "가이드라인", fill=GOLD, font=F18)
    draw.text((x1 + 54, y1 + 39), "(Guideline)", fill=MUTED, font=F14)


def load_raw_image(path: str) -> Image.Image:
    return Image.open(PUBLIC / path).convert("RGB")


def resize_cover(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    scale = max(size[0] / image.width, size[1] / image.height)
    resized = image.resize(
        (math.ceil(image.width * scale), math.ceil(image.height * scale)),
        Image.Resampling.LANCZOS,
    )
    left = (resized.width - size[0]) // 2
    top = (resized.height - size[1]) // 2
    return resized.crop((left, top, left + size[0], top + size[1]))


def paste_contain(
    base: Image.Image,
    image: Image.Image,
    box: tuple[int, int, int, int],
    radius: int = 0,
) -> tuple[int, int, int, int]:
    x1, y1, x2, y2 = box
    target_w = x2 - x1
    target_h = y2 - y1
    scale = min(target_w / image.width, target_h / image.height)
    resized = image.resize(
        (math.floor(image.width * scale), math.floor(image.height * scale)),
        Image.Resampling.LANCZOS,
    ).convert("RGBA")
    px = x1 + (target_w - resized.width) // 2
    py = y1 + (target_h - resized.height) // 2

    if radius:
        mask = Image.new("L", resized.size, 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, resized.width, resized.height), radius=radius, fill=255)
        base.alpha_composite(Image.composite(resized, Image.new("RGBA", resized.size), mask), (px, py))
    else:
        base.alpha_composite(resized, (px, py))

    return px, py, px + resized.width, py + resized.height


def paste_cover_box(
    base: Image.Image,
    image: Image.Image,
    box: tuple[int, int, int, int],
    radius: int = 0,
) -> None:
    x1, y1, x2, y2 = box
    fitted = resize_cover(image, (x2 - x1, y2 - y1)).convert("RGBA")

    if radius:
        mask = Image.new("L", fitted.size, 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, fitted.width, fitted.height), radius=radius, fill=255)
        base.alpha_composite(Image.composite(fitted, Image.new("RGBA", fitted.size), mask), (x1, y1))
    else:
        base.alpha_composite(fitted, (x1, y1))


def screenshot_frame(scene_index: int, screenshot_path: str) -> tuple[Image.Image, tuple[int, int, int, int]]:
    screenshot = load_raw_image(screenshot_path)
    bg = resize_cover(screenshot, (W, H))
    frame = ImageEnhance.Brightness(bg).enhance(0.36).convert("RGBA")
    frame = Image.alpha_composite(frame, Image.new("RGBA", (W, H), (17, 16, 14, 84)))
    draw = ImageDraw.Draw(frame)
    draw.rounded_rectangle((30, 24, 1250, 696), radius=22, fill=(17, 16, 14, 108), outline=(255, 255, 255, 30), width=1)
    placed = paste_contain(frame, screenshot, (44, 38, 1236, 682), radius=18)
    draw_scene_badge(frame, scene_index)
    return frame, placed


def draw_scene_badge(frame: Image.Image, scene_index: int) -> None:
    draw = ImageDraw.Draw(frame)
    copy = SCENE_COPY[scene_index]
    draw.rounded_rectangle((54, 52, 480, 122), radius=16, fill=(0, 0, 0, 158), outline=(243, 210, 138, 120), width=1)
    draw.text((78, 66), copy["title"], fill=TEXT, font=F22B)
    draw.text((80, 96), copy["subtitle"], fill=MUTED, font=F14)


def draw_status_pill(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], text: str) -> None:
    draw.rounded_rectangle(box, radius=14, fill=(17, 16, 14, 214), outline=GOLD, width=2)
    draw_center_text(draw, box, text, fill=GOLD, f=F18)


def draw_real_home(progress: float) -> Image.Image:
    frame, placed = screenshot_frame(0, "guideline/screenshots/01.png")
    draw = ImageDraw.Draw(frame)
    x1, y1, x2, y2 = placed
    sx = (x2 - x1) / 1618
    sy = (y2 - y1) / 909
    highlight = (
        int(x1 + 1060 * sx),
        int(y1 + 128 * sy),
        int(x1 + 1198 * sx),
        int(y1 + 190 * sy),
    )
    draw.rounded_rectangle(highlight, radius=10, outline=(243, 210, 138, 230), width=4)
    draw_cursor(draw, int(highlight[0] + 48 + progress * 38), int(highlight[1] + 31), pulse=math.sin(progress * math.pi) ** 2)
    return frame


def draw_real_login(progress: float) -> Image.Image:
    frame, placed = screenshot_frame(1, "guideline/screenshots/02.png")
    draw = ImageDraw.Draw(frame)
    x1, y1, x2, y2 = placed
    sx = (x2 - x1) / 1688
    sy = (y2 - y1) / 880
    button = (
        int(x1 + 326 * sx),
        int(y1 + 719 * sy),
        int(x1 + 858 * sx),
        int(y1 + 764 * sy),
    )
    draw.rounded_rectangle(button, radius=10, outline=(243, 210, 138, 226), width=4)
    draw_cursor(draw, int(button[0] + 180 + progress * 90), int(button[1] + 24), pulse=math.sin(progress * math.pi) ** 2)
    return frame


def draw_real_upload(progress: float) -> Image.Image:
    frame, placed = screenshot_frame(2, "guideline/screenshots/03.png")
    draw = ImageDraw.Draw(frame)
    x1, y1, x2, y2 = placed
    sx = (x2 - x1) / 1570
    sy = (y2 - y1) / 911
    source_boxes = [
        (310, 504, 596, 762, "좌측면"),
        (609, 504, 895, 762, "정면"),
        (909, 504, 1195, 762, "우측면"),
    ]
    originals = [
        load_raw_image("guideline/image/1. origin 01.jpg"),
        load_raw_image("guideline/image/2. origin 02.png"),
        load_raw_image("guideline/image/3. origin 03.jpg"),
    ]
    visible = min(3, max(1, int(progress * 4)))

    for idx, (src_box, image) in enumerate(zip(source_boxes, originals)):
        ox1, oy1, ox2, oy2, label = src_box
        box = (
            int(x1 + ox1 * sx),
            int(y1 + oy1 * sy),
            int(x1 + ox2 * sx),
            int(y1 + oy2 * sy),
        )
        draw.rounded_rectangle(box, radius=14, fill=(12, 11, 10, 235), outline=GOLD, width=2)
        if idx < visible:
            paste_cover_box(frame, image, (box[0] + 8, box[1] + 8, box[2] - 8, box[3] - 52), radius=12)
            draw.rounded_rectangle((box[0] + 14, box[3] - 44, box[2] - 14, box[3] - 12), radius=9, fill=(0, 0, 0, 156))
            draw_center_text(draw, (box[0] + 14, box[3] - 44, box[2] - 14, box[3] - 12), f"{label} 업로드 완료", fill=TEXT, f=F14)

    button = (922, 812, 1196, 858)
    button_box = (
        int(x1 + button[0] * sx),
        int(y1 + button[1] * sy),
        int(x1 + button[2] * sx),
        int(y1 + button[3] * sy),
    )
    draw_status_pill(draw, button_box, "추천 받기")
    draw_cursor(draw, int(button_box[0] + 120 + progress * 30), int(button_box[1] + 22), pulse=math.sin(progress * math.pi) ** 2)
    return frame


def draw_real_recommendations(progress: float) -> Image.Image:
    frame, _ = screenshot_frame(3, "guideline/screenshots/03.png")
    draw = ImageDraw.Draw(frame)
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 148))
    frame = Image.alpha_composite(frame, overlay)
    draw = ImageDraw.Draw(frame)
    draw.rounded_rectangle((278, 72, 1002, 668), radius=24, fill=(17, 16, 14, 238), outline=(243, 210, 138, 145), width=2)
    draw.text((326, 104), "추천 스타일 9개", fill=TEXT, font=F30B)
    draw.text((328, 144), "3장 업로드 후 추천 받기를 누르면 스타일 후보가 생성됩니다.", fill=MUTED, font=F16)
    recommendation = load_raw_image("guideline/image/4. style recommend.png")
    placed = paste_contain(frame, recommendation, (410, 178, 870, 610), radius=16)
    draw.rounded_rectangle(placed, radius=16, outline=GOLD, width=3)
    draw_cursor(draw, int(735 - progress * 110), 562, pulse=math.sin(progress * math.pi) ** 2)
    return frame


def draw_real_angle_grid(progress: float) -> Image.Image:
    frame, _ = screenshot_frame(4, "guideline/screenshots/03.png")
    draw = ImageDraw.Draw(frame)
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 162))
    frame = Image.alpha_composite(frame, overlay)
    draw = ImageDraw.Draw(frame)
    draw.rounded_rectangle((208, 48, 1072, 686), radius=24, fill=(17, 16, 14, 242), outline=(243, 210, 138, 145), width=2)
    draw.text((256, 84), "상담 이미지 9장", fill=TEXT, font=F30B)
    draw.text((258, 124), "선택한 스타일을 미용실 상담용 3x3 이미지로 정리합니다.", fill=MUTED, font=F16)

    labels = ["좌상단", "상단", "우상단", "좌측", "정면", "우측", "좌후면", "후면", "우후면"]
    images = [load_raw_image(f"guideline/image/{idx}.jpg") for idx in range(5, 14)]
    start_x, start_y = 322, 158
    cell, gap = 136, 24
    visible = min(9, max(1, int(progress * 12)))

    for idx, image in enumerate(images):
        row, col = divmod(idx, 3)
        x = start_x + col * (cell + gap)
        y = start_y + row * (cell + 34)
        draw.rounded_rectangle((x - 6, y - 6, x + cell + 6, y + cell + 34), radius=16, fill=PANEL_2, outline=GOLD if idx < visible else LINE, width=2)
        card = image if idx < visible else ImageEnhance.Brightness(image).enhance(0.18)
        paste_cover_box(frame, card, (x, y, x + cell, y + cell), radius=12)
        draw.rounded_rectangle((x + 8, y + cell - 36, x + cell - 8, y + cell - 8), radius=8, fill=BLACK_GLASS)
        draw_center_text(draw, (x + 8, y + cell - 36, x + cell - 8, y + cell - 8), labels[idx], fill=TEXT, f=F14)

    draw_status_pill(draw, (790, 610, 1018, 656), "상담 자료 완성")
    draw_cursor(draw, int(900 + 28 * math.sin(progress * math.pi)), 636, pulse=math.sin(progress * math.pi) ** 2)
    return frame


def draw_home(progress: float) -> Image.Image:
    frame = base_frame(0)
    draw = ImageDraw.Draw(frame)
    x1, y1, x2, y2 = browser_shell(frame, (390, 116), (770, 470), "https://mirilook.com/")

    draw.rounded_rectangle((x1, y1, x2, y2), radius=14, fill=BG, outline=LINE)
    draw.text((x1 + 30, y1 + 28), "내 얼굴에 어울리는", fill=TEXT, font=F48H)
    draw.text((x1 + 30, y1 + 88), "헤어스타일 추천", fill=GOLD, font=F52H)
    draw_wrapped(
        draw,
        (x1 + 34, y1 + 172),
        "사진을 올리고, 추천 스타일 9개를 받은 뒤 상담 이미지까지 생성합니다.",
        450,
        fill=MUTED,
        f=F18,
    )

    guideline = (x2 - 204, y1 + 55, x2 - 34, y1 + 126)
    draw_guideline_button(draw, guideline)
    draw_button(draw, (x1 + 34, y2 - 88, x1 + 210, y2 - 38), "시작하기")
    draw_cursor(
        draw,
        int(guideline[0] + 60 + progress * 42),
        int(guideline[1] + 30),
        pulse=math.sin(progress * math.pi) ** 2,
    )

    return frame


def draw_login(progress: float) -> Image.Image:
    frame = base_frame(1)
    draw = ImageDraw.Draw(frame)
    x1, y1, x2, y2 = browser_shell(frame, (408, 116), (724, 470), "mirilook.com/login")

    draw.rounded_rectangle((x1 + 120, y1 + 28, x2 - 120, y2 - 28), radius=16, fill=PANEL, outline=LINE)
    draw.text((x1 + 160, y1 + 66), "로그인 / 회원가입", fill=TEXT, font=F30B)
    draw.text((x1 + 162, y1 + 108), "이메일 또는 소셜 계정으로 미리룩을 시작합니다.", fill=MUTED, font=F16)

    for label, y in [("이메일", y1 + 166), ("비밀번호", y1 + 226)]:
        draw.rounded_rectangle((x1 + 160, y, x2 - 160, y + 46), radius=9, fill=(14, 13, 12), outline=(255, 255, 255, 26))
        draw.text((x1 + 178, y + 13), label, fill=SOFT, font=F16)

    draw_button(draw, (x1 + 160, y1 + 300, x2 - 160, y1 + 350), "로그인하고 시작")
    draw_cursor(draw, int(x1 + 490 - progress * 110), int(y1 + 325), pulse=math.sin(progress * math.pi) ** 2)

    return frame


def draw_gender(progress: float) -> Image.Image:
    frame = base_frame(2)
    draw = ImageDraw.Draw(frame)
    x1, y1, x2, y2 = browser_shell(frame, (328, 116), (824, 470), "mirilook.com")

    draw.text((x1 + 34, y1 + 30), "추천 기준", fill=TEXT, font=F30B)

    for label, x, y, active in [
        ("남성", x1 + 52, y1 + 104, True),
        ("여성", x1 + 310, y1 + 104, False),
    ]:
        draw.rounded_rectangle(
            (x, y, x + 220, y + 190),
            radius=16,
            fill=(47, 37, 22) if active else PANEL,
            outline=GOLD if active else LINE,
            width=3 if active else 1,
        )
        draw.ellipse((x + 74, y + 38, x + 146, y + 110), fill=GOLD if active else PANEL_2, outline=GOLD_DARK)
        draw_center_text(draw, (x, y + 122, x + 220, y + 158), label, fill=TEXT, f=F24B)

        if active:
            draw.rounded_rectangle((x + 70, y + 160, x + 150, y + 184), radius=8, fill=GOLD)
            draw_center_text(draw, (x + 70, y + 160, x + 150, y + 184), "선택됨", fill=BG, f=F14)

    draw.rounded_rectangle((x1 + 52, y2 - 92, x2 - 52, y2 - 34), radius=12, fill=(14, 13, 12), outline=LINE)
    draw.text((x1 + 72, y2 - 75), "원하는 분위기: 자연스러운 레이어드, 데일리, 부드러운 인상", fill=MUTED, font=F16)
    draw_cursor(draw, int(x1 + 470), int(y1 + 252 - progress * 30), pulse=math.sin(progress * math.pi) ** 2)

    return frame


def photo_strip_images() -> list[Image.Image]:
    return [
        load_image("guideline/image/1. origin 01.jpg", (210, 260), True),
        load_image("guideline/image/2. origin 02.png", (210, 260), True),
        load_image("guideline/image/3. origin 03.jpg", (210, 260), True),
    ]


def draw_upload(progress: float) -> Image.Image:
    frame = base_frame(3)
    draw = ImageDraw.Draw(frame)
    x1, y1, x2, y2 = browser_shell(frame, (250, 112), (900, 480), "mirilook.com")

    draw.text((x1 + 30, y1 + 24), "내 사진 업로드", fill=TEXT, font=F30B)
    labels = ["좌측면", "정면", "우측면"]

    for idx, image in enumerate(photo_strip_images()):
        x = x1 + 44 + idx * 270
        y = y1 + 96
        done = progress > idx / 3
        draw.rounded_rectangle((x, y, x + 220, y + 286), radius=16, fill=PANEL, outline=GOLD if done else LINE, width=2)
        paste_round(frame, image, (x + 5, y + 5), 12)
        draw.rounded_rectangle((x + 12, y + 224, x + 208, y + 270), radius=10, fill=BLACK_GLASS)
        draw_center_text(draw, (x + 12, y + 224, x + 208, y + 248), labels[idx], fill=TEXT, f=F18)
        draw_center_text(draw, (x + 12, y + 246, x + 208, y + 270), "업로드 완료" if done else "대기", fill=GOLD if done else SOFT, f=F14)

    draw_button(draw, (x2 - 224, y2 - 72, x2 - 44, y2 - 26), "사진 저장")
    draw_cursor(draw, int(x1 + 130 + min(progress, 0.95) * 610), int(y1 + 216), pulse=math.sin(progress * math.pi * 3) ** 2)

    return frame


def angle_image_sources(size: tuple[int, int]) -> list[Image.Image]:
    names = [f"guideline/image/{index}.jpg" for index in range(5, 14)]
    return [load_image(name, size, True) for name in names]


def draw_recommendations(progress: float) -> Image.Image:
    frame = base_frame(4)
    draw = ImageDraw.Draw(frame)
    x1, y1, x2, y2 = browser_shell(frame, (260, 94), (880, 520), "mirilook.com")

    draw.text((x1 + 30, y1 + 24), "추천 스타일 9개", fill=TEXT, font=F30B)
    draw.rounded_rectangle((x1 + 30, y1 + 70, x2 - 30, y1 + 104), radius=12, fill=(14, 13, 12), outline=LINE)
    draw.rounded_rectangle((x1 + 32, y1 + 72, x1 + 32 + int((x2 - x1 - 64) * progress), y1 + 102), radius=10, fill=GOLD)
    draw.text((x1 + 40, y1 + 78), "추천 생성 중...", fill=BG if progress > 0.2 else MUTED, font=F14)

    recommendation = load_image("guideline/image/4. style recommend.png", (360, 432), False)
    card_x, card_y = x1 + 238, y1 + 122
    draw.rounded_rectangle((card_x - 8, card_y - 8, card_x + 368, card_y + 440), radius=16, fill=PANEL, outline=GOLD, width=2)
    paste_round(frame, recommendation, (card_x, card_y), 12)
    highlight_alpha = int(110 + 80 * math.sin(progress * math.pi) ** 2)
    draw.rounded_rectangle((card_x + 124, card_y + 142, card_x + 238, card_y + 270), radius=10, outline=(243, 210, 138, highlight_alpha), width=4)
    draw_cursor(draw, int(card_x + 186), int(card_y + 210), pulse=math.sin(progress * math.pi) ** 2)

    return frame


def draw_angles(progress: float) -> Image.Image:
    frame = base_frame(5)
    draw = ImageDraw.Draw(frame)
    x1, y1, x2, y2 = browser_shell(frame, (250, 92), (900, 524), "mirilook.com")

    draw.text((x1 + 30, y1 + 22), "상담 이미지 9장", fill=TEXT, font=F30B)
    draw.rounded_rectangle((x1 + 30, y1 + 68, x1 + 250, y1 + 118), radius=12, fill=(47, 37, 22), outline=GOLD, width=2)
    draw_center_text(draw, (x1 + 30, y1 + 68, x1 + 250, y1 + 118), "선택 스타일: Soft Layer", fill=GOLD, f=F16)

    angle_labels = ["좌상단", "상단", "우상단", "좌측", "정면", "우측", "좌후면", "후면", "우후면"]
    start_x, start_y = x1 + 86, y1 + 138

    for idx, image in enumerate(angle_image_sources((118, 118))):
        row, col = divmod(idx, 3)
        x, y = start_x + col * 168, start_y + row * 124
        ready = progress >= (idx + 1) / 10
        card = image if ready else ImageEnhance.Brightness(image).enhance(0.18)
        draw.rounded_rectangle((x - 4, y - 4, x + 122, y + 122), radius=12, fill=PANEL, outline=GOLD if ready else LINE)
        paste_round(frame, card, (x, y), 10)
        draw.rounded_rectangle((x + 8, y + 84, x + 110, y + 112), radius=8, fill=BLACK_GLASS)
        draw_center_text(draw, (x + 8, y + 84, x + 110, y + 112), angle_labels[idx], fill=TEXT, f=F12)

    draw_button(draw, (x2 - 230, y2 - 76, x2 - 46, y2 - 28), "상담 자료 완성")
    draw_cursor(draw, int(x2 - 150), int(y2 - 52), pulse=math.sin(progress * math.pi) ** 2)

    return frame


SCENES = [
    draw_real_home,
    draw_real_login,
    draw_real_upload,
    draw_real_recommendations,
    draw_real_angle_grid,
]


def run(command: list[str], env: dict[str, str] | None = None) -> None:
    subprocess.run(command, check=True, env=env)


def probe_duration(path: Path) -> float:
    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(path),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    return float(result.stdout.strip())


def create_narration() -> float:
    NARRATION_TEXT_FILE.write_text(NARRATION_TEXT, encoding="utf-8")
    if GOOD_JOB_TTS_SCRIPT.exists() and os.environ.get("GEMINI_API_KEY"):
        env = os.environ.copy()
        env["GENTTS_LEAD"] = "1"
        run(
            [
                "python",
                str(GOOD_JOB_TTS_SCRIPT),
                GOOD_JOB_TTS_MODEL,
                GOOD_JOB_TTS_VOICE,
                str(NARRATION_FILE),
                NARRATION_TEXT,
                GOOD_JOB_TTS_STYLE,
            ],
            env=env,
        )
    else:
        print("GEMINI_API_KEY is empty; using ko-KR-HyunsuMultilingualNeural fallback instead of the good-job Charon voice.")
        run(
            [
                "edge-tts",
                "--voice",
                "ko-KR-HyunsuMultilingualNeural",
                "--rate",
                "-8%",
                "--pitch",
                "-10Hz",
                "--file",
                str(NARRATION_TEXT_FILE),
                "--write-media",
                str(EDGE_NARRATION_FILE),
            ],
        )
        run(
            [
                "ffmpeg",
                "-y",
                "-i",
                str(EDGE_NARRATION_FILE),
                "-ar",
                "24000",
                "-ac",
                "1",
                str(NARRATION_FILE),
            ],
        )
    return probe_duration(NARRATION_FILE)


def create_background_music(duration: float) -> None:
    run(
        [
            "ffmpeg",
            "-y",
            "-f",
            "lavfi",
            "-i",
            f"sine=frequency=261.63:sample_rate=48000:duration={duration:.2f}",
            "-f",
            "lavfi",
            "-i",
            f"sine=frequency=329.63:sample_rate=48000:duration={duration:.2f}",
            "-f",
            "lavfi",
            "-i",
            f"sine=frequency=392.00:sample_rate=48000:duration={duration:.2f}",
            "-f",
            "lavfi",
            "-i",
            f"sine=frequency=659.25:sample_rate=48000:duration={duration:.2f}",
            "-filter_complex",
            (
                "amix=inputs=4:duration=longest:normalize=0,"
                "volume=0.046,apulsator=hz=0.16,"
                "aecho=0.12:0.18:620:0.16,highpass=f=120,"
                "pan=stereo|c0=c0|c1=c0"
            ),
            str(MUSIC_FILE),
        ],
    )


def ass_timestamp(seconds: float) -> str:
    centiseconds = int(round(seconds * 100))
    hours, rem = divmod(centiseconds, 360000)
    minutes, rem = divmod(rem, 6000)
    secs, centis = divmod(rem, 100)
    return f"{hours}:{minutes:02d}:{secs:02d}.{centis:02d}"


def ass_text(text: str) -> str:
    return text.replace("{", r"\{").replace("}", r"\}")


def write_subtitles(video_duration: float) -> None:
    last_safe_end = max(0.0, video_duration - 0.25)
    lines = [
        "[Script Info]",
        "ScriptType: v4.00+",
        "PlayResX: 1280",
        f"PlayResY: {OUTPUT_H}",
        "WrapStyle: 0",
        "ScaledBorderAndShadow: yes",
        "",
        "[V4+ Styles]",
        (
            "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, "
            "OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, "
            "ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, "
            "Alignment, MarginL, MarginR, MarginV, Encoding"
        ),
        (
            "Style: Default,Malgun Gothic,34,&H00FFF8F1,&H000000FF,"
            "&H0011110E,&H96000000,-1,0,0,0,100,100,0,0,1,3,0,"
            "2,68,68,24,1"
        ),
        "",
        "[Events]",
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ]

    for start, end, text in SUBTITLE_CUES:
        if start >= last_safe_end:
            continue
        lines.append(
            "Dialogue: 0,"
            f"{ass_timestamp(start)},{ass_timestamp(min(end, last_safe_end))},"
            f"Default,,0,0,0,,{ass_text(text)}"
        )

    SUBTITLE_FILE.write_text("\n".join(lines) + "\n", encoding="utf-8")


def ffmpeg_filter_path(path: Path) -> str:
    escaped = path.resolve().as_posix().replace("\\", "/")
    escaped = escaped.replace(":", r"\:").replace("'", r"\'").replace(",", r"\,")
    return escaped


def render_frame(index: int, scene_seconds: float) -> Image.Image:
    frames_per_scene = int(FPS * scene_seconds)
    scene_index = min(TOTAL_SCENES - 1, index // frames_per_scene)
    local_index = index - scene_index * frames_per_scene
    progress = local_index / max(1, frames_per_scene - 1)
    frame = SCENES[scene_index](progress)
    fade = 1.0
    fade_frames = FPS // 2

    if local_index < fade_frames:
        fade = local_index / fade_frames
    elif local_index > frames_per_scene - fade_frames:
        fade = (frames_per_scene - local_index) / fade_frames

    if fade < 1:
        black = Image.new("RGBA", (W, H), BG + (255,))
        frame = Image.blend(black, frame, max(0.0, min(1.0, fade)))

    return frame.convert("RGB")


def render_silent_video(scene_seconds: float) -> float:
    total_frames = int(FPS * scene_seconds * TOTAL_SCENES)
    if FRAME_DIR.exists():
        shutil.rmtree(FRAME_DIR)
    FRAME_DIR.mkdir(parents=True)

    for index in range(total_frames):
        render_frame(index, scene_seconds).save(FRAME_DIR / f"frame_{index:04d}.jpg", quality=90)

    run(
        [
            "ffmpeg",
            "-y",
            "-framerate",
            str(FPS),
            "-i",
            str(FRAME_DIR / "frame_%04d.jpg"),
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-profile:v",
            "main",
            "-movflags",
            "+faststart",
            "-crf",
            "24",
            "-preset",
            "medium",
            str(SILENT_FILE),
        ],
    )
    shutil.rmtree(FRAME_DIR)
    return total_frames / FPS


def mix_audio(video_duration: float) -> None:
    create_background_music(video_duration + 0.25)
    write_subtitles(video_duration)
    fade_out_start = max(0.0, video_duration - 2.5)
    run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(SILENT_FILE),
            "-i",
            str(NARRATION_FILE),
            "-i",
            str(MUSIC_FILE),
            "-filter_complex",
            (
                "[1:a]volume=1.12,highpass=f=80,lowpass=f=7600,"
                "acompressor=threshold=-18dB:ratio=2.4:attack=18:release=180[voice];"
                f"[2:a]volume=0.42,afade=t=in:st=0:d=1.5,afade=t=out:st={fade_out_start:.2f}:d=2.4[music];"
                "[voice][music]amix=inputs=2:duration=longest:normalize=0[a]"
            ),
            "-vf",
            (
                f"pad={W}:{OUTPUT_H}:0:0:color=0x11100e,"
                f"drawbox=x=0:y={H}:w=iw:h={CAPTION_BAR_H}:color=0x11100e@1:t=fill,"
                f"drawbox=x=0:y={H}:w=iw:h=2:color=0xf3d28a@0.45:t=fill,"
                f"ass=filename='{ffmpeg_filter_path(SUBTITLE_FILE)}'"
            ),
            "-map",
            "0:v:0",
            "-map",
            "[a]",
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-profile:v",
            "main",
            "-crf",
            "22",
            "-preset",
            "medium",
            "-c:a",
            "aac",
            "-b:a",
            "160k",
            "-shortest",
            "-movflags",
            "+faststart",
            str(OUT_FILE),
        ],
    )


def cleanup() -> None:
    for path in [SILENT_FILE]:
        if path.exists():
            path.unlink()
    if AUDIO_DIR.exists():
        shutil.rmtree(AUDIO_DIR)
    if FRAME_DIR.exists():
        shutil.rmtree(FRAME_DIR)


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    if AUDIO_DIR.exists():
        shutil.rmtree(AUDIO_DIR)
    AUDIO_DIR.mkdir(parents=True)

    narration_duration = create_narration()
    scene_seconds = max(MIN_SCENE_SECONDS, (narration_duration + 3.0) / TOTAL_SCENES)
    video_duration = render_silent_video(scene_seconds)
    mix_audio(video_duration)
    cleanup()


if __name__ == "__main__":
    main()
