"""
Builds `public/ubl-share.jpg`, the card WhatsApp shows when the site is shared.

Run by hand, not in CI, because it changes about as often as the crest does:

    python3 -m venv .venv-share
    .venv-share/bin/pip install pillow fonttools brotli
    .venv-share/bin/python scripts/build-share-card.py

Python and not TypeScript, alone among the scripts here, for a plain reason: this
needs to rasterise text in the site's own typeface, the repository has no image
library on the Node side, and adding one to draw a picture twice a year is a worse
trade than a script somebody runs with a virtual environment. The panel's own image
resizing happens in the browser and cannot help here.

Why the card exists at all: the crest is portrait, 700 by 839, so it lands in a
small square preview. A 1200 by 630 image is what a wide card wants and it comes
out several times larger in the same conversation.

This drawing is the fallback the league chose. They are looking for a horizontal
photo of the ice; when it arrives, load it here as the background, keep the crest
and the words on top, and run this again.

The claim in the last two lines is narrow on purpose. "The most southern ice hockey
league in the world" is not true, by the league's own correction: it collides with
CFM and with a league that once existed in Ushuaia. "The most southern beer league"
is the one they stand behind.
"""

from pathlib import Path

from fontTools.ttLib.woff2 import decompress
from PIL import Image, ImageDraw, ImageFont

REPO = Path(__file__).resolve().parent.parent
FONTS = REPO / 'src/assets/fonts'
# Decompressed next to the fonts they come from, and ignored by git: a woff2 is
# what the site ships and Pillow cannot read one.
WORK = REPO / '.share-card'

# The site's own background and gold, from src/styles/tokens.css.
BACKGROUND = (10, 14, 20)
GOLD = (232, 168, 32)
MUTED = (150, 162, 176)
WHITE = (245, 247, 250)

WIDTH, HEIGHT = 1200, 630


def face(name: str, size: int) -> ImageFont.FreeTypeFont:
    """One of the site's own faces, out of the woff2 the site ships."""
    WORK.mkdir(exist_ok=True)
    ttf = WORK / f'{name}.ttf'
    if not ttf.exists():
        decompress(FONTS / f'{name}.woff2', ttf)
    return ImageFont.truetype(str(ttf), size)


def main() -> None:
    card = Image.new('RGB', (WIDTH, HEIGHT), BACKGROUND)

    crest = Image.open(REPO / 'public/ubl-crest.webp').convert('RGBA')
    crest_height = 470
    crest_width = round(crest.width * crest_height / crest.height)
    crest = crest.resize((crest_width, crest_height), Image.LANCZOS)

    crest_x = 90
    card.paste(crest, (crest_x, (HEIGHT - crest_height) // 2), crest)

    draw = ImageDraw.Draw(card)
    text_x = crest_x + crest_width + 70

    # The name on two lines: "USHUAIA BEER LEAGUE" on one line in a face this wide
    # either overflows the card or shrinks to nothing.
    draw.text((text_x, 176), 'USHUAIA', font=face('bebas-neue-400', 96), fill=WHITE)
    draw.text(
        (text_x, 268), 'BEER LEAGUE', font=face('bebas-neue-400', 58), fill=GOLD
    )

    # A gold rule, the same device the site uses under a section title.
    draw.rectangle([(text_x, 336), (text_x + 120, 340)], fill=GOLD)

    caption = face('barlow-condensed-400', 34)
    draw.text(
        (text_x, 352), 'La beer league de hockey sobre hielo', font=caption, fill=MUTED
    )
    draw.text((text_x, 390), 'más austral del mundo', font=caption, fill=MUTED)

    # JPEG rather than WebP: some clients still refuse a WebP preview, and this is
    # the one image whose whole job is to render inside somebody else's app. A few
    # hundred kilobytes is also where some of them quietly skip it.
    out = REPO / 'public/ubl-share.jpg'
    card.save(out, 'JPEG', quality=88, optimize=True, progressive=True)

    print(f'{out.relative_to(REPO)}: {out.stat().st_size / 1024:.0f} kB, '
          f'{card.width}x{card.height}')


if __name__ == '__main__':
    main()
