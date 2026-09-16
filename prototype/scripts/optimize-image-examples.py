#!/usr/bin/env python3
"""Сжимает полные JPEG в WebP-превью для сетки /image-examples."""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "public" / "image-examples"
DST = SRC / "thumbs"
HEAVY = {"24-wan-photorealistic.webp", "30-z-image-turbo-auto.webp"}


def convert(jpg: Path) -> None:
    out = DST / f"{jpg.stem}.webp"
    quality = 62 if out.name in HEAVY else 72
    image = Image.open(jpg)
    image.thumbnail((960, 960))
    if image.mode not in ("RGB", "L"):
        image = image.convert("RGB")
    image.save(out, "WEBP", quality=quality, method=4)


def main() -> None:
    DST.mkdir(exist_ok=True)
    files = sorted(SRC.glob("*.jpg"))
    if not files:
        raise SystemExit("no source jpegs")
    for jpg in files:
        convert(jpg)
        print(jpg.stem)


if __name__ == "__main__":
    main()
