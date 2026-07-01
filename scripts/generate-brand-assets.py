from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE_PATH = ROOT / "icon" / "mirilook main theme.png"
PUBLIC_DIR = ROOT / "apps" / "web" / "public"
BRAND_DIR = PUBLIC_DIR / "brand"
STORE_DIR = PUBLIC_DIR / "store"

GOLD = (245, 205, 124)
PALE = (255, 248, 235)
MUTED = (207, 191, 163)
DARK = (13, 12, 10)
BORDER = (179, 139, 67)


def load_source_square() -> Image.Image:
    source = Image.open(SOURCE_PATH).convert("RGB")
    side = min(source.size)
    left = (source.width - side) // 2
    top = (source.height - side) // 2
    return source.crop((left, top, left + side, top + side))


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    font_paths = [
        Path(r"C:\Windows\Fonts\malgunbd.ttf"),
        Path(r"C:\Windows\Fonts\malgun.ttf"),
        Path(r"C:\Windows\Fonts\arialbd.ttf"),
        Path(r"C:\Windows\Fonts\arial.ttf"),
    ]
    preferred = (
        [font_paths[0], font_paths[2], font_paths[1], font_paths[3]]
        if bold
        else [font_paths[1], font_paths[3], font_paths[0], font_paths[2]]
    )

    for path in preferred:
        if path.exists():
            return ImageFont.truetype(str(path), size)

    return ImageFont.load_default()


def rounded_mask(size: tuple[int, int], radius: int) -> Image.Image:
    width, height = size
    mask = Image.new("L", (width, height), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, width - 1, height - 1), radius=radius, fill=255)
    return mask


def gradient_bg(width: int, height: int) -> Image.Image:
    base = Image.new("RGB", (width, height), DARK)
    draw = ImageDraw.Draw(base)

    for y in range(height):
        v = y / max(1, height - 1)
        r = int(20 - 8 * v)
        g = int(18 - 7 * v)
        b = int(15 - 6 * v)
        draw.line((0, y, width, y), fill=(r, g, b))

    glow = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse(
        (-width // 3, -height // 3, int(width * 0.85), int(height * 1.15)),
        fill=(140, 94, 32, 80),
    )
    glow_draw.ellipse(
        (int(width * 0.45), -height // 2, int(width * 1.25), int(height * 0.75)),
        fill=(235, 194, 108, 34),
    )
    glow = glow.filter(ImageFilter.GaussianBlur(max(40, width // 18)))
    out = base.convert("RGBA")
    out.alpha_composite(glow)
    return out.convert("RGB")


def paste_card(
    base: Image.Image,
    source: Image.Image,
    box: tuple[int, int, int, int],
    radius: int,
) -> Image.Image:
    x, y, width, height = box
    card = source.resize((width, height), Image.Resampling.LANCZOS)
    base_rgba = base.convert("RGBA")

    shadow = Image.new("RGBA", base.size, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rounded_rectangle(
        (x + 12, y + 18, x + width + 12, y + height + 18),
        radius=radius,
        fill=(0, 0, 0, 130),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(16))
    base_rgba.alpha_composite(shadow)
    base_rgba.paste(card.convert("RGBA"), (x, y), rounded_mask((width, height), radius))

    draw = ImageDraw.Draw(base_rgba)
    draw.rounded_rectangle(
        (x, y, x + width - 1, y + height - 1),
        radius=radius,
        outline=BORDER + (255,),
        width=3,
    )
    return base_rgba.convert("RGB")


def paste_rounded(base: Image.Image, source: Image.Image, xy: tuple[int, int], radius: int) -> None:
    x, y = xy
    image = source.convert("RGBA")
    base.paste(image, (x, y), rounded_mask(image.size, radius))


def save_square(square: Image.Image, path: Path, size: int) -> None:
    square.resize((size, size), Image.Resampling.LANCZOS).save(path, optimize=True)


def make_social(square: Image.Image, path: Path, width: int, height: int, compact: bool = False) -> None:
    bg = gradient_bg(width, height).convert("RGBA")
    draw = ImageDraw.Draw(bg)
    draw.rounded_rectangle(
        (38, 38, width - 38, height - 38),
        radius=44,
        outline=(190, 150, 80, 95),
        width=3,
    )
    draw.rounded_rectangle(
        (64, 64, width - 64, height - 64),
        radius=34,
        outline=(245, 205, 124, 45),
        width=1,
    )

    icon_size = int(height * (0.58 if compact else 0.68))
    icon_x = 70
    icon_y = (height - icon_size) // 2
    bg = paste_card(
        bg.convert("RGB"),
        square,
        (icon_x, icon_y, icon_size, icon_size),
        radius=max(28, icon_size // 12),
    ).convert("RGBA")

    draw = ImageDraw.Draw(bg)
    text_x = icon_x + icon_size + int(width * 0.07)
    draw.text((text_x, int(height * 0.23)), "Miri Look", font=font(int(height * 0.075), True), fill=PALE)
    draw.text((text_x, int(height * 0.34)), "AI SALON CONSULTATION", font=font(int(height * 0.028)), fill=GOLD)
    draw.multiline_text(
        (text_x, int(height * 0.46)),
        "내 얼굴에 어울리는\n헤어스타일을 먼저 봅니다.",
        font=font(int(height * 0.06), True),
        fill=PALE,
        spacing=8,
    )
    draw.multiline_text(
        (text_x, int(height * 0.69)),
        "사진을 올리면 헤어컷과 컬러를 추천하고,\n미용사 상담용 이미지를 생성합니다.",
        font=font(int(height * 0.031)),
        fill=MUTED,
        spacing=7,
    )
    draw.text((text_x, height - 70), "mirilook.com", font=font(int(height * 0.027)), fill=(170, 145, 100))
    bg.convert("RGB").save(path, quality=92, optimize=True)


def make_feature(square: Image.Image, path: Path) -> None:
    width, height = 1024, 500
    bg = gradient_bg(width, height).convert("RGBA")
    draw = ImageDraw.Draw(bg)
    draw.rounded_rectangle((34, 34, width - 34, height - 34), radius=38, outline=(190, 150, 80, 90), width=2)

    bg = paste_card(bg.convert("RGB"), square, (58, 90, 320, 320), radius=40).convert("RGBA")
    draw = ImageDraw.Draw(bg)
    draw.text((430, 98), "Miri Look", font=font(56, True), fill=PALE)
    draw.text((433, 166), "AI SALON CONSULTATION", font=font(22), fill=GOLD)
    draw.multiline_text((430, 230), "내 얼굴에 어울리는\n헤어스타일 추천", font=font(50, True), fill=PALE, spacing=6)
    draw.text((433, 374), "Upload photos · Preview styles · Share with stylist", font=font(24), fill=MUTED)
    bg.convert("RGB").save(path, quality=92, optimize=True)


def make_phone_preview(square: Image.Image, path: Path, width: int, height: int, title: str, subtitle: str) -> None:
    bg = gradient_bg(width, height).convert("RGBA")
    draw = ImageDraw.Draw(bg)
    margin = int(width * 0.08)
    icon_size = int(width * 0.22)
    bg = paste_card(
        bg.convert("RGB"),
        square,
        (margin, int(height * 0.065), icon_size, icon_size),
        radius=max(24, icon_size // 10),
    ).convert("RGBA")
    draw = ImageDraw.Draw(bg)
    draw.multiline_text((margin, int(height * 0.19)), title, font=font(int(width * 0.077), True), fill=PALE, spacing=8)
    draw.multiline_text((margin, int(height * 0.305)), subtitle, font=font(int(width * 0.033)), fill=MUTED, spacing=8)

    panel_x, panel_y = margin, int(height * 0.43)
    panel_width, panel_height = width - margin * 2, int(height * 0.47)
    draw.rounded_rectangle(
        (panel_x, panel_y, panel_x + panel_width, panel_y + panel_height),
        radius=32,
        fill=(18, 16, 13, 230),
        outline=(190, 150, 80, 120),
        width=3,
    )

    card_gap = int(panel_width * 0.03)
    card_width = int((panel_width - card_gap * 2 - int(panel_width * 0.09)) / 3)
    card_height = int(panel_height * 0.38)
    card_y = panel_y + int(panel_height * 0.08)

    for index, label in enumerate(["추천", "선택", "상담"]):
        card_x = panel_x + int(panel_width * 0.045) + index * (card_width + card_gap)
        thumb = square.resize((card_width, card_height), Image.Resampling.LANCZOS)
        paste_rounded(bg, thumb, (card_x, card_y), 18)
        draw.rounded_rectangle(
            (card_x, card_y, card_x + card_width, card_y + card_height),
            radius=18,
            outline=(245, 205, 124, 90),
            width=2,
        )
        draw.text((card_x + 18, card_y + card_height - 48), label, font=font(int(width * 0.036), True), fill=PALE)

    board_y = panel_y + int(panel_height * 0.58)
    draw.text((panel_x + 36, board_y), "9장 상담 보드", font=font(int(width * 0.041), True), fill=PALE)
    draw.multiline_text(
        (panel_x + 36, board_y + int(width * 0.055)),
        "정면 · 측면 · 상단 · 후면까지\n미용사가 보기 좋은 기준 이미지",
        font=font(int(width * 0.022)),
        fill=MUTED,
        spacing=6,
    )

    grid_size = int(panel_width * 0.34)
    grid_x = panel_x + panel_width - grid_size - 38
    grid_y = board_y - 4
    cell = grid_size // 3
    icon_small = square.resize((cell - 8, cell - 8), Image.Resampling.LANCZOS)

    for row in range(3):
        for col in range(3):
            x = grid_x + col * cell
            y = grid_y + row * cell
            draw.rounded_rectangle((x, y, x + cell - 10, y + cell - 10), radius=10, fill=(36, 31, 24), outline=(95, 76, 45))
            paste_rounded(bg, icon_small, (x + 4, y + 4), 9)

    bg.convert("RGB").save(path, quality=92, optimize=True)


def make_landscape_preview(square: Image.Image, path: Path) -> None:
    width, height = 2796, 1290
    bg = gradient_bg(width, height).convert("RGBA")
    draw = ImageDraw.Draw(bg)
    bg = paste_card(bg.convert("RGB"), square, (150, 210, 660, 660), radius=72).convert("RGBA")
    draw = ImageDraw.Draw(bg)
    draw.text((920, 250), "Miri Look", font=font(104, True), fill=PALE)
    draw.text((928, 382), "AI SALON CONSULTATION", font=font(42), fill=GOLD)
    draw.multiline_text((920, 520), "헤어스타일을\n먼저 확인하세요", font=font(82, True), fill=PALE, spacing=12)
    draw.text((928, 770), "사진 업로드 · 스타일 추천 · 9장 상담 보드", font=font(40), fill=MUTED)

    grid_x, grid_y = 1840, 265
    cell = 230
    small = square.resize((cell - 12, cell - 12), Image.Resampling.LANCZOS)
    for row in range(3):
        for col in range(3):
            x = grid_x + col * (cell + 18)
            y = grid_y + row * (cell + 18)
            draw.rounded_rectangle((x, y, x + cell, y + cell), radius=26, fill=(27, 23, 18), outline=(180, 139, 67, 110), width=2)
            paste_rounded(bg, small, (x + 6, y + 6), 22)

    bg.convert("RGB").save(path, quality=92, optimize=True)


def main() -> None:
    BRAND_DIR.mkdir(parents=True, exist_ok=True)
    STORE_DIR.mkdir(parents=True, exist_ok=True)
    square = load_source_square()

    for path, size in [
        (PUBLIC_DIR / "icon.png", 512),
        (PUBLIC_DIR / "apple-icon.png", 180),
        (BRAND_DIR / "mirilook-icon-1024.png", 1024),
        (BRAND_DIR / "mirilook-icon-512.png", 512),
        (BRAND_DIR / "mirilook-icon-192.png", 192),
        (BRAND_DIR / "mirilook-web-mark.png", 512),
        (STORE_DIR / "ios-app-icon-1024.png", 1024),
        (STORE_DIR / "google-play-icon-512.png", 512),
    ]:
        save_square(square, path, size)

    favicon_sizes = [(16, 16), (32, 32), (48, 48)]
    favicon_images = [
        square.resize(size, Image.Resampling.LANCZOS).convert("RGBA")
        for size in favicon_sizes
    ]
    favicon_images[0].save(ROOT / "apps" / "web" / "src" / "app" / "favicon.ico", sizes=favicon_sizes)
    square.save(BRAND_DIR / "mirilook-source-icon.png", optimize=True)

    make_social(square, BRAND_DIR / "mirilook-og.png", 1200, 630)
    make_social(square, BRAND_DIR / "mirilook-kakao-thumbnail.png", 800, 400, compact=True)
    make_social(square, STORE_DIR / "social-share-1200x630.png", 1200, 630)
    make_feature(square, STORE_DIR / "google-play-feature-1024x500.png")
    make_phone_preview(
        square,
        STORE_DIR / "app-store-preview-1290x2796.png",
        1290,
        2796,
        "헤어스타일을\n먼저 확인하세요",
        "얼굴 사진을 기준으로 추천받고, 상담용 이미지를 저장합니다.",
    )
    make_phone_preview(
        square,
        STORE_DIR / "app-store-preview-1242x2688.png",
        1242,
        2688,
        "나에게 맞는\n스타일 추천",
        "남성·여성 헤어와 컬러를 미용실 상담에 맞게 정리합니다.",
    )
    make_phone_preview(
        square,
        STORE_DIR / "play-store-preview-1080x1920.png",
        1080,
        1920,
        "AI 헤어 상담",
        "사진 업로드부터 9장 상담 보드까지 한 번에 준비하세요.",
    )
    make_landscape_preview(square, STORE_DIR / "app-store-preview-2796x1290.png")

    for path in [
        PUBLIC_DIR / "icon.png",
        PUBLIC_DIR / "apple-icon.png",
        BRAND_DIR / "mirilook-web-mark.png",
        BRAND_DIR / "mirilook-og.png",
        BRAND_DIR / "mirilook-kakao-thumbnail.png",
        STORE_DIR / "ios-app-icon-1024.png",
        STORE_DIR / "google-play-icon-512.png",
        STORE_DIR / "google-play-feature-1024x500.png",
        STORE_DIR / "app-store-preview-1290x2796.png",
        STORE_DIR / "app-store-preview-1242x2688.png",
        STORE_DIR / "app-store-preview-2796x1290.png",
        STORE_DIR / "play-store-preview-1080x1920.png",
    ]:
        print(path.relative_to(ROOT))


if __name__ == "__main__":
    main()
