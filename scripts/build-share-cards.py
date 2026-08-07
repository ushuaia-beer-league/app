"""
Draws the per-page `og:image` cards WhatsApp and Facebook show beside a link.

Run by hand when a route, its wording, or the crest changes:

    npm run build:share-cards

The pages come in as JSON on stdin from `scripts/share-pages.ts`, because the
route table lives in TypeScript and this script cannot import it; the npm
script pipes one into the other so neither list is written twice. One JPEG per
page lands in `public/share/` and is committed like the favicons are: the free
database plays no part in serving them, and `share-pages.test.ts` fails when a
page's art is missing.

The cards carry only identity — the page's name, the competition, the crest —
and never a result or a standing. That is the league's own rule from 6 August
2026: a card that names who is winning is only true until somebody enters a
result, and these files are static. It is also why drawing them at build time
is enough, and why nothing here will ever need to ask the database anything.

JPEG rather than PNG because WhatsApp ignores images past ~600 KB and the
night-background cards compress to a tenth of the size with no visible loss.
"""

import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

REPO = Path(__file__).resolve().parent.parent
CREST = REPO / 'public/ubl-crest.webp'
FONTS = REPO / 'src/assets/fonts'
OUT = REPO / 'public/share'

WIDTH, HEIGHT = 1200, 630
PADDING = 84

# The site's own palette, from src/styles/tokens.css.
NIGHT = (10, 14, 20)
TEXT = (232, 230, 227)
MUTED = (139, 143, 152)
GOLD = (232, 168, 32)


def draw_card(heading: str, subheading: str) -> Image.Image:
    card = Image.new('RGB', (WIDTH, HEIGHT), NIGHT)
    draw = ImageDraw.Draw(card)

    # The crest on the right, tall as the card allows, like the hero shows it.
    crest = Image.open(CREST).convert('RGBA')
    box = HEIGHT - PADDING * 2
    crest.thumbnail((box, box), Image.LANCZOS)
    card.paste(
        crest,
        (WIDTH - PADDING - crest.width, (HEIGHT - crest.height) // 2),
        crest,
    )

    text_room = WIDTH - PADDING * 3 - crest.width

    # The heading in the display face, shrunk until it fits its column.
    size = 128
    while size > 48:
        font = ImageFont.truetype(str(FONTS / 'bebas-neue-400.woff2'), size)
        if draw.textlength(heading.upper(), font=font) <= text_room:
            break
        size -= 8

    draw.rectangle((PADDING, 208, PADDING + 76, 216), fill=GOLD)
    draw.text((PADDING, 248), heading.upper(), font=font, fill=TEXT)

    sub_font = ImageFont.truetype(
        str(FONTS / 'barlow-condensed-600.woff2'), 40
    )
    draw.text(
        (PADDING, 248 + size + 28),
        subheading.upper(),
        font=sub_font,
        fill=MUTED,
    )

    site_font = ImageFont.truetype(
        str(FONTS / 'barlow-condensed-600.woff2'), 44
    )
    draw.text((PADDING, HEIGHT - PADDING - 44), 'ubl.com.ar', font=site_font, fill=GOLD)

    return card


def main() -> None:
    pages = json.load(sys.stdin)
    OUT.mkdir(exist_ok=True)

    for page in pages:
        target = OUT / f"{page['slug']}.jpg"
        draw_card(page['heading'], page['subheading']).save(
            target, 'JPEG', quality=85, optimize=True
        )
        print(f'{target.name}: {target.stat().st_size} bytes')


if __name__ == '__main__':
    main()
