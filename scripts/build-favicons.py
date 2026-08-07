"""
Builds the site's icons from the league's own crest.

Run by hand when the crest changes:

    python3 scripts/build-favicons.py

Why these files exist, each of them:

- `favicon.ico` matters even though nothing links it: crawlers and browsers ask
  for the path by convention, and on this host an absent file falls into the SPA
  rewrite and answers **HTML with a 200**. Google's favicon fetcher got exactly
  that, and the search results showed a generic globe instead of the league's
  mark. A real file at the real path is the fix.
- The PNGs give Google the square, multiple-of-48px icon its documentation asks
  for, and give browsers a raster when they prefer one.
- `apple-touch-icon.png` is what an iPhone uses when somebody pins the site; it
  gets the site's own night background because iOS flattens transparency to
  black on its own terms otherwise.

The crest is portrait, so every icon pads it onto a square canvas rather than
cropping: the mug loses its foam or its base in any square crop.
"""

from pathlib import Path

from PIL import Image

REPO = Path(__file__).resolve().parent.parent
CREST = REPO / 'public/ubl-crest.webp'
OUT = REPO / 'public'

NIGHT = (10, 14, 20, 255)


def squared(size: int, background: tuple[int, int, int, int] | None) -> Image.Image:
    crest = Image.open(CREST).convert('RGBA')
    canvas = Image.new('RGBA', (size, size), background or (0, 0, 0, 0))
    # Nine per cent of margin so the drawing never kisses the edge.
    box = round(size * 0.91)
    crest.thumbnail((box, box), Image.LANCZOS)
    canvas.paste(
        crest, ((size - crest.width) // 2, (size - crest.height) // 2), crest
    )
    return canvas


def main() -> None:
    for size, name in ((48, 'favicon-48.png'), (192, 'favicon-192.png')):
        squared(size, None).save(OUT / name, 'PNG', optimize=True)
        print(f'{name}: {(OUT / name).stat().st_size} bytes')

    squared(180, NIGHT).convert('RGB').save(
        OUT / 'apple-touch-icon.png', 'PNG', optimize=True
    )
    print('apple-touch-icon.png')

    squared(48, None).save(
        OUT / 'favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)]
    )
    print('favicon.ico (16/32/48)')


if __name__ == '__main__':
    main()
