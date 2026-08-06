"""
Turns the league's player badges into the webp files the site ships.

Run by hand when the league sends new ones:

    python3 -m venv .venv-images
    .venv-images/bin/pip install pillow
    .venv-images/bin/python scripts/build-player-badges.py ~/Downloads/images/players

Python, like `build-share-card.py` and for the same reason: the repository has no
image library on the Node side and the panel's resizing happens in the browser.

The interesting step is the trimming, and it is why the first version looked wrong.
The files arrive on canvases of different sizes with different amounts of empty
space around the drawing: nine of them waste between three and sixteen per cent, and
one wastes thirty. Fitting each whole canvas into the same box therefore drew nine
badges at about the same size and one visibly smaller, which reads as a broken
layout rather than as a property of the source. So each file is cropped to its own
content, padded to a square, and only then resized. After that every badge fills its
box the same way and the grid is even.

Nothing is cropped into the drawing itself: the padding is added, never taken away.
These are portraits of real people and squaring one off by cutting is not a decision
for a script.
"""

import sys
from pathlib import Path

from PIL import Image

REPO = Path(__file__).resolve().parent.parent
OUT = REPO / 'src/assets/players'

# Twice the size the strip draws them at, so they stay sharp on a phone without
# shipping a two-megabyte portrait per player.
SIDE = 256


def build(source: Path) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    files = sorted(source.glob('beerizar_*.png'))

    if not files:
        raise SystemExit(f'No badges found in {source}')

    for file in files:
        nickname = file.stem.removeprefix('beerizar_').replace('_', '-')
        target = OUT / f'beerizar-{nickname}.webp'

        with Image.open(file) as image:
            image = image.convert('RGBA')

            box = image.getbbox()
            if box is not None:
                image = image.crop(box)

            side = max(image.size)
            square = Image.new('RGBA', (side, side), (0, 0, 0, 0))
            square.paste(
                image, ((side - image.width) // 2, (side - image.height) // 2)
            )
            square.resize((SIDE, SIDE), Image.LANCZOS).save(
                target, 'WEBP', quality=82, method=6
            )

        # The property the layout depends on, asserted rather than assumed.
        with Image.open(target) as check:
            assert check.size == (SIDE, SIDE), f'{target.name}: {check.size}'

        print(f'{target.relative_to(REPO)}  {target.stat().st_size / 1024:.0f} kB')


if __name__ == '__main__':
    if len(sys.argv) != 2:
        raise SystemExit('Usage: build-player-badges.py <folder of badge PNGs>')
    build(Path(sys.argv[1]).expanduser())
