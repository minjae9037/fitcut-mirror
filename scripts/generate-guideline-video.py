from __future__ import annotations

import math
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "apps" / "web" / "public"
OUTPUT_DIR = PUBLIC / "guideline"
GUIDELINE_IMAGE_DIR = OUTPUT_DIR / "image"
OUTPUT_PATH = OUTPUT_DIR / "mirilook-guideline.mp4"

WIDTH = 1280
HEIGHT = 720
FPS = 18
SECONDS_PER_SCENE = 2.5
SCENE_FRAMES = int(FPS * SECONDS_PER_SCENE)

BG = (17, 16, 14)
PANEL = (23, 21, 17)
PANEL_2 = (32, 27, 19)
GOLD = (243, 210, 138)
GOLD_DARK = (96, 77, 43)
TEXT = (255, 250, 241)
MUTED = (216, 203, 184)
SUBTLE = (143, 130, 111)
PINK = (240, 111, 145)
GREEN = (69, 203, 142)
NEON = (82, 235, 255)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        Path("C:/Windows/Fonts/malgunbd.ttf" if bold else "C:/Windows/Fonts/malgun.ttf"),
        Path("C:/Windows/Fonts/NotoSansKR-Bold.otf" if bold else "C:/Windows/Fonts/NotoSansKR-Regular.otf"),
        Path("C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default()


FONTS = {
    "brand": font(34, True),
    "tiny": font(18, True),
    "small": font(22),
    "small_bold": font(22, True),
    "body": font(28),
    "body_bold": font(28, True),
    "title": font(46, True),
    "hero": font(58, True),
}


def load_image(relative: str) -> Image.Image:
    return Image.open(PUBLIC / relative).convert("RGB")


def load_guideline_image(number: int) -> Image.Image:
    if not GUIDELINE_IMAGE_DIR.exists():
        raise FileNotFoundError(f"Missing guideline image folder: {GUIDELINE_IMAGE_DIR}")

    matches: list[Path] = []
    for candidate in GUIDELINE_IMAGE_DIR.iterdir():
        if candidate.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp"}:
            continue
        match = re.match(r"^0*(\d+)", candidate.stem)
        if match and int(match.group(1)) == number:
            matches.append(candidate)

    if not matches:
        raise FileNotFoundError(f"Missing guideline image #{number} in {GUIDELINE_IMAGE_DIR}")
    return Image.open(sorted(matches, key=lambda path: path.name)[0]).convert("RGB")


ASSETS = {
    "logo": load_image("brand/mirilook-icon-512.png"),
    "background": load_image("mock/premium-salon-suite.png"),
    "originals": [load_guideline_image(index) for index in range(1, 4)],
    "recommendation": load_guideline_image(4),
    "angles": [load_guideline_image(index) for index in range(5, 14)],
}


def rounded(draw: ImageDraw.ImageDraw, box, radius=18, fill=None, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def paste_cover(base: Image.Image, image: Image.Image, box, radius=0, opacity=255):
    x1, y1, x2, y2 = box
    target_w = x2 - x1
    target_h = y2 - y1
    scale = max(target_w / image.width, target_h / image.height)
    resized = image.resize((math.ceil(image.width * scale), math.ceil(image.height * scale)), Image.Resampling.LANCZOS)
    left = (resized.width - target_w) // 2
    top = (resized.height - target_h) // 2
    cropped = resized.crop((left, top, left + target_w, top + target_h)).convert("RGBA")
    if opacity < 255:
        cropped.putalpha(opacity)
    if radius:
        mask = Image.new("L", (target_w, target_h), 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, target_w, target_h), radius=radius, fill=255)
        base.paste(cropped, (x1, y1), mask)
    else:
        base.paste(cropped, (x1, y1), cropped)


def paste_contain(base: Image.Image, image: Image.Image, box, radius=0, opacity=255) -> tuple[int, int, int, int]:
    x1, y1, x2, y2 = box
    target_w = x2 - x1
    target_h = y2 - y1
    scale = min(target_w / image.width, target_h / image.height)
    resized = image.resize((math.floor(image.width * scale), math.floor(image.height * scale)), Image.Resampling.LANCZOS)
    resized = resized.convert("RGBA")
    if opacity < 255:
        resized.putalpha(opacity)
    paste_x = x1 + (target_w - resized.width) // 2
    paste_y = y1 + (target_h - resized.height) // 2
    if radius:
        mask = Image.new("L", resized.size, 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, resized.width, resized.height), radius=radius, fill=255)
        base.paste(resized, (paste_x, paste_y), mask)
    else:
        base.paste(resized, (paste_x, paste_y), resized)
    return paste_x, paste_y, paste_x + resized.width, paste_y + resized.height


def draw_text(draw: ImageDraw.ImageDraw, xy, text: str, fill=TEXT, font_key="body", anchor=None):
    draw.text(xy, text, fill=fill, font=FONTS[font_key], anchor=anchor)


def draw_wrapped(draw: ImageDraw.ImageDraw, xy, text: str, max_width: int, fill=MUTED, font_key="body", line_gap=8):
    words = text.split(" ")
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if draw.textbbox((0, 0), candidate, font=FONTS[font_key])[2] <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    x, y = xy
    line_height = FONTS[font_key].size + line_gap
    for index, line in enumerate(lines):
        draw_text(draw, (x, y + line_height * index), line, fill=fill, font_key=font_key)


def draw_chrome(draw: ImageDraw.ImageDraw, title: str, step: str, progress: float):
    rounded(draw, (48, 34, 1232, 104), 22, fill=(10, 9, 8, 230), outline=(255, 255, 255, 26), width=1)
    draw.ellipse((70, 51, 112, 93), fill=(32, 26, 16), outline=GOLD)
    draw_text(draw, (132, 50), "Miri Look", fill=TEXT, font_key="brand")
    draw_text(draw, (132, 82), "AI SALON CONSULTATION", fill=GOLD, font_key="tiny")
    draw_text(draw, (1000, 58), step, fill=GOLD, font_key="small_bold")
    bar_x1, bar_y1, bar_x2, bar_y2 = 1000, 86, 1190, 94
    rounded(draw, (bar_x1, bar_y1, bar_x2, bar_y2), 5, fill=(53, 45, 32))
    rounded(draw, (bar_x1, bar_y1, int(bar_x1 + (bar_x2 - bar_x1) * progress), bar_y2), 5, fill=GOLD)
    draw_text(draw, (64, 130), title, fill=TEXT, font_key="title")


def button(draw, box, text, fill=GOLD, text_fill=(18, 16, 13), outline=None):
    rounded(draw, box, 14, fill=fill, outline=outline or fill)
    x1, y1, x2, y2 = box
    draw_text(draw, ((x1 + x2) // 2, (y1 + y2) // 2), text, fill=text_fill, font_key="small_bold", anchor="mm")


def cursor(frame: Image.Image, draw: ImageDraw.ImageDraw, x: float, y: float, pulse: float):
    points = [(x + 8, y + 7), (x + 38, y + 21), (x + 23, y + 27), (x + 18, y + 43)]
    closed = points + [points[0]]
    glow = Image.new("RGBA", frame.size, (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow, "RGBA")
    glow_draw.line(closed, fill=(*NEON, 130), width=16, joint="curve")
    glow_draw.line(closed, fill=(*GOLD, 105), width=8, joint="curve")
    glow = glow.filter(ImageFilter.GaussianBlur(5 + int(2 * pulse)))
    frame.paste(Image.alpha_composite(frame.convert("RGBA"), glow).convert("RGB"))
    draw = ImageDraw.Draw(frame, "RGBA")
    draw.polygon(points, fill=TEXT, outline=NEON)
    draw.line(closed, fill=NEON, width=3, joint="curve")
    draw.line([(x + 23, y + 27), (x + 32, y + 44)], fill=GOLD, width=3)


def base_frame(scene_index: int, local: float, title: str) -> Image.Image:
    frame = Image.new("RGB", (WIDTH, HEIGHT), BG)
    paste_cover(frame, ASSETS["background"], (0, 0, WIDTH, HEIGHT), opacity=95)
    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (17, 16, 14, 130))
    frame = Image.alpha_composite(frame.convert("RGBA"), overlay).convert("RGB")
    draw = ImageDraw.Draw(frame, "RGBA")
    draw_chrome(draw, title, f"{scene_index + 1}/6", (scene_index + local) / 6)
    return frame


def scene_home(local: float) -> Image.Image:
    frame = base_frame(0, local, "홈페이지 화면")
    draw = ImageDraw.Draw(frame, "RGBA")
    draw_text(draw, (74, 210), "내 얼굴에 어울리는", fill=TEXT, font_key="hero")
    draw_text(draw, (74, 280), "남자 헤어스타일 추천", fill=TEXT, font_key="hero")
    draw_wrapped(draw, (78, 370), "남자 사진 3장을 올리고 AI 추천 스타일과 다각도 상담 이미지를 한 번에 준비합니다.", 650)
    button(draw, (78, 460, 262, 516), "시작하기")
    button(draw, (284, 460, 466, 516), "가이드라인", fill=PANEL_2, text_fill=GOLD, outline=(193, 157, 92))
    cursor(frame, draw, 375 + 10 * math.sin(local * math.pi), 488, local)
    return frame


def scene_login(local: float) -> Image.Image:
    frame = base_frame(1, local, "회원가입 / 로그인")
    draw = ImageDraw.Draw(frame, "RGBA")
    rounded(draw, (386, 178, 894, 604), 28, fill=(16, 14, 12, 235), outline=(255, 255, 255, 28))
    draw_text(draw, (432, 230), "계정으로 시작하기", fill=TEXT, font_key="title")
    draw_wrapped(draw, (434, 294), "결제, 히스토리, DM, 프로필 사진을 같은 계정에서 관리합니다.", 430)
    button(draw, (434, 384, 846, 444), "이메일로 로그인")
    button(draw, (434, 462, 846, 522), "회원가입 후 계속하기", fill=PANEL_2, text_fill=GOLD, outline=(193, 157, 92))
    cursor(frame, draw, 638, 414 + 18 * math.sin(local * math.pi), local)
    return frame


def scene_gender(local: float) -> Image.Image:
    frame = base_frame(2, local, "남성 선택")
    draw = ImageDraw.Draw(frame, "RGBA")
    draw_text(draw, (82, 192), "추천 기준 선택", fill=TEXT, font_key="title")
    draw_wrapped(draw, (84, 254), "성별과 원하는 분위기를 먼저 고르면 더 자연스러운 9개 스타일을 추천합니다.", 560)
    rounded(draw, (86, 360, 430, 526), 24, fill=(18, 16, 13), outline=(255, 255, 255, 30), width=1)
    draw_text(draw, (118, 404), "여성", fill=MUTED, font_key="title")
    draw_text(draw, (118, 466), "레이어, 볼륨, 컬러 추천", fill=SUBTLE, font_key="small")
    rounded(draw, (468, 360, 812, 526), 24, fill=(44, 35, 21), outline=GOLD, width=3)
    draw_text(draw, (500, 404), "남성", fill=TEXT, font_key="title")
    draw_text(draw, (500, 466), "컷 라인, 두상 보완, 다운펌 추천", fill=MUTED, font_key="small")
    cursor(frame, draw, 594, 442, local)
    return frame


def scene_upload(local: float) -> Image.Image:
    frame = base_frame(3, local, "내 사진 3장 업로드")
    draw = ImageDraw.Draw(frame, "RGBA")
    draw_text(draw, (78, 180), "좌 / 정 / 우 사진 등록", fill=TEXT, font_key="title")
    labels = ["좌측면", "정면", "우측면"]
    images = ASSETS["originals"]
    reveal = min(3, int(local * 4))
    for i, (label, image) in enumerate(zip(labels, images)):
        x = 92 + i * 368
        rounded(draw, (x, 258, x + 300, 590), 22, fill=PANEL, outline=(255, 255, 255, 30))
        if i <= reveal:
            paste_cover(frame, image, (x + 18, 280, x + 282, 512), radius=16)
            draw.ellipse((x + 238, 292, x + 268, 322), fill=GREEN)
            draw.line(
                [(x + 245, 307), (x + 251, 314), (x + 263, 298)],
                fill=(13, 23, 17),
                width=4,
                joint="curve",
            )
        else:
            draw_text(draw, (x + 150, 396), "+", fill=GOLD, font_key="hero", anchor="mm")
        draw_text(draw, (x + 150, 548), label, fill=TEXT, font_key="body_bold", anchor="mm")
    cursor(frame, draw, 214 + min(local, 0.95) * 736, 544, local)
    return frame


def scene_recommend(local: float) -> Image.Image:
    frame = base_frame(4, local, "9개 스타일 추천")
    draw = ImageDraw.Draw(frame, "RGBA")
    rounded(draw, (64, 132, 600, 678), 24, fill=PANEL, outline=(255, 255, 255, 30))
    grid_box = paste_contain(frame, ASSETS["recommendation"], (88, 150, 576, 660), radius=18)
    draw = ImageDraw.Draw(frame, "RGBA")

    gx1, gy1, gx2, gy2 = grid_box
    cell_w = (gx2 - gx1) / 3
    cell_h = (gy2 - gy1) / 3
    for index in range(9):
        if index == 8:
            continue
        row, col = divmod(index, 3)
        shade = (
            int(gx1 + col * cell_w + 5),
            int(gy1 + row * cell_h + 5),
            int(gx1 + (col + 1) * cell_w - 5),
            int(gy1 + (row + 1) * cell_h - 5),
        )
        rounded(draw, shade, 10, fill=(0, 0, 0, 68))

    row, col = divmod(8, 3)
    selected = (
        int(gx1 + col * cell_w + 4),
        int(gy1 + row * cell_h + 4),
        int(gx1 + (col + 1) * cell_w - 4),
        int(gy1 + (row + 1) * cell_h - 4),
    )
    rounded(draw, selected, 12, outline=PINK, width=5)
    check_x, check_y = selected[2] - 26, selected[1] + 24
    draw.ellipse((check_x - 17, check_y - 17, check_x + 17, check_y + 17), fill=GOLD, outline=TEXT, width=2)
    draw.line(
        [(check_x - 8, check_y), (check_x - 2, check_y + 7), (check_x + 10, check_y - 9)],
        fill=(18, 16, 13),
        width=4,
        joint="curve",
    )

    rounded(draw, (650, 192, 1148, 578), 24, fill=(16, 14, 12, 235), outline=(255, 255, 255, 30))
    draw_text(draw, (694, 244), "9번 스타일 선택", fill=TEXT, font_key="title")
    draw_wrapped(draw, (696, 314), "추천된 9개 남자 스타일 중 9번을 고르고, 같은 헤어를 여러 각도 상담 이미지로 제작합니다.", 390)
    button(draw, (696, 438, 922, 496), "9번으로 생성")
    cursor(frame, draw, 1000 - local * 280, 468, local)
    return frame


def scene_angles(local: float) -> Image.Image:
    frame = base_frame(5, local, "1개 선택 후 9장 다각도 생성")
    draw = ImageDraw.Draw(frame, "RGBA")
    rounded(draw, (64, 198, 384, 668), 24, fill=PANEL, outline=GOLD, width=2)
    paste_cover(frame, ASSETS["angles"][0], (88, 224, 360, 508), radius=18)
    draw_text(draw, (224, 548), "선택한 9번 스타일", fill=TEXT, font_key="body_bold", anchor="mm")
    draw_text(draw, (224, 586), "다각도 상담 이미지", fill=GOLD, font_key="small_bold", anchor="mm")
    grid_x, grid_y = 440, 188
    cell_w, cell_h = 220, 132
    angle_images = ASSETS["angles"]
    labels = ["정면", "좌측", "우측", "45도", "측후면", "후면", "상반신", "프로필", "상담컷"]
    visible = min(9, max(1, int(local * 16)))
    for i in range(9):
        row, col = divmod(i, 3)
        x = grid_x + col * (cell_w + 22)
        y = grid_y + row * (cell_h + 18)
        rounded(draw, (x, y, x + cell_w, y + cell_h), 16, fill=PANEL_2, outline=(255, 255, 255, 26))
        if i < visible:
            paste_cover(frame, angle_images[i], (x + 8, y + 8, x + cell_w - 8, y + cell_h - 34), radius=12)
            draw_text(draw, (x + 16, y + cell_h - 24), labels[i], fill=GOLD, font_key="tiny")
    cursor(frame, draw, 284 + 70 * math.sin(local * math.pi), 590, local)
    return frame


SCENES = [scene_home, scene_login, scene_gender, scene_upload, scene_recommend, scene_angles]


def add_intro_fade(frame: Image.Image, global_index: int, total_frames: int) -> Image.Image:
    fade_in = min(1, global_index / 12)
    fade_out = min(1, (total_frames - global_index - 1) / 12)
    alpha = min(fade_in, fade_out)
    if alpha >= 1:
        return frame
    black = Image.new("RGB", frame.size, (0, 0, 0))
    return Image.blend(black, frame, max(0, alpha))


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    total_frames = len(SCENES) * SCENE_FRAMES

    with tempfile.TemporaryDirectory(prefix="mirilook-guideline-frames-") as temp:
        temp_path = Path(temp)
        for scene_index, scene in enumerate(SCENES):
            for frame_in_scene in range(SCENE_FRAMES):
                local = frame_in_scene / max(1, SCENE_FRAMES - 1)
                global_index = scene_index * SCENE_FRAMES + frame_in_scene
                frame = scene(local)
                frame = add_intro_fade(frame, global_index, total_frames)
                frame.save(temp_path / f"frame_{global_index:04d}.jpg", quality=88, optimize=True)

        ffmpeg = shutil.which("ffmpeg")
        if not ffmpeg:
            raise RuntimeError("ffmpeg is required to create the guideline video.")

        subprocess.run(
            [
                ffmpeg,
                "-y",
                "-framerate",
                str(FPS),
                "-i",
                str(temp_path / "frame_%04d.jpg"),
                "-c:v",
                "libx264",
                "-pix_fmt",
                "yuv420p",
                "-movflags",
                "+faststart",
                "-preset",
                "medium",
                "-crf",
                "22",
                "-an",
                str(OUTPUT_PATH),
            ],
            check=True,
        )

    print(f"created {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
