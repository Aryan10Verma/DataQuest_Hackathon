"""Colour-grade the transparent body views to the Champagne noir palette.

Usage: python frontend/scripts/grade_views.py design/reference/anatomy/views-ungraded frontend/public/scan
Needs Pillow and NumPy. The input views come from cut_views.py.

Each view becomes a warm silver: its brightness is mapped from a graphite shadow to an ivory highlight,
a little of the original colour is kept (so the heart and spine still read), and darks stay dark.
"""

import sys
from pathlib import Path

import numpy as np
from PIL import Image

SHADOW = np.array((0.20, 0.17, 0.13), dtype=np.float32)
HIGHLIGHT = np.array((1.00, 0.95, 0.86), dtype=np.float32)
KEEP_ORIGINAL = 0.18
GAMMA = 0.92


def grade(path: Path, out: Path) -> None:
    im = np.asarray(Image.open(path).convert("RGBA")).astype(np.float32) / 255
    rgb, alpha = im[..., :3], im[..., 3:]
    lum = np.clip((rgb @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32))[..., None] * 1.15, 0, 1)
    toned = SHADOW * (1 - lum**GAMMA) + HIGHLIGHT * lum**GAMMA
    mixed = toned * (1 - KEEP_ORIGINAL) + rgb * KEEP_ORIGINAL
    mixed = np.clip(mixed * np.clip(lum * 1.4 + 0.15, 0, 1), 0, 1)
    Image.fromarray((np.concatenate([mixed, alpha], -1) * 255).astype(np.uint8)).save(out, quality=90, method=6)


if __name__ == "__main__":
    src, dst = Path(sys.argv[1]), Path(sys.argv[2])
    for view in ("front", "back", "left", "right", "top"):
        grade(src / f"{view}.webp", dst / f"{view}.webp")
        print("graded", view)
