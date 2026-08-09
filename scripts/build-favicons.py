"""
Builds the site's icons from the league's own mark.

Run by hand when the mark changes:

    python3 scripts/build-favicons.py

Why these files exist, each of them:

- `favicon.ico` matters even though nothing links it: crawlers and browsers ask
  for the path by convention, and on this host an absent file falls into the SPA
  rewrite and answers **HTML with a 200**. Google's favicon fetcher got exactly
  that, and the search results showed a generic globe instead of the league's
  mark. A real file at the real path is the fix.
- The PNGs give Google the square, multiple-of-48px icon its documentation asks
  for, and give browsers a raster when they prefer one.
- `apple-touch-icon.png` is what an iPhone uses when somebody pins the site.

Two things this script does deliberately, both learned from what Google showed:

- **The source is `public/ubl-icon.png`, the mark on solid black**, not the
  transparent crest the pages use. A white line drawing on transparency is
  invisible or a smudge at 16px, which is the size that actually decides what a
  search result shows.
- **Every icon keeps that black ground**; none is transparent. The mark is
  light-on-dark, so a transparent icon would be a light shape on whatever the
  browser puts behind it — white, usually, which erases it.

There is no `favicon.svg` any more. It used to hold a provisional puck-shaped
mark drawn before the league sent its crest, and because the HTML listed the
SVG first, that stand-in was the icon Google published for the site. The
league's own mug replaced it on 2026-08-09.

The mark is portrait, so every icon pads it onto a square rather than cropping:
the mug loses its foam or its base in any square crop.
"""

from pathlib import Path

from PIL import Image

REPO = Path(__file__).resolve().parent.parent
MARK = REPO / 'public/ubl-icon.png'
OUT = REPO / 'public'

BLACK = (0, 0, 0, 255)


def squared(size: int) -> Image.Image:
    mark = Image.open(MARK).convert('RGBA')
    canvas = Image.new('RGBA', (size, size), BLACK)
    # Six per cent of margin: enough that the mark never kisses the edge, tight
    # enough that at 16px the mug is still a mug rather than a speck.
    box = round(size * 0.94)
    mark.thumbnail((box, box), Image.LANCZOS)
    canvas.paste(
        mark, ((size - mark.width) // 2, (size - mark.height) // 2), mark
    )
    return canvas


def main() -> None:
    for size, name in ((48, 'favicon-48.png'), (192, 'favicon-192.png')):
        squared(size).convert('RGB').save(OUT / name, 'PNG', optimize=True)
        print(f'{name}: {(OUT / name).stat().st_size} bytes')

    squared(180).convert('RGB').save(
        OUT / 'apple-touch-icon.png', 'PNG', optimize=True
    )
    print('apple-touch-icon.png')

    squared(48).convert('RGB').save(
        OUT / 'favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)]
    )
    print(f'favicon.ico: {(OUT / "favicon.ico").stat().st_size} bytes')


if __name__ == '__main__':
    main()
