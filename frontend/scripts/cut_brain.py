"""Cut the five brain views and the neural close-up out of the 4x brain sheet for the home page.

    python -I frontend/scripts/cut_brain.py brain-x4.png frontend/public/brain

The sheet is first upscaled 4x with Real-ESRGAN (realesrgan-x4plus) from
design/reference/brain/brain-sheet-original.jpg. Boxes below are in original-sheet pixels. Each view
is lifted to pure black, so the page can lay it over any background with `mix-blend-mode: screen`,
and its edges are feathered so no frame or label shows. Writes <name>.webp (1600px) and
<name>-sm.webp (800px).
"""

import sys
from pathlib import Path

import cv2
import numpy as np

src, out = sys.argv[1], Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)
S = 4
BOXES = {
    "top": (170, 30, 560, 418),
    # The side, front and back views sit in faint frames: crop just inside them.
    "left": (45, 488, 431, 787),
    "front": (486, 486, 829, 789),
    "right": (884, 487, 1279, 787),
    "back": (476, 855, 834, 1197),
    "neural": (914, 61, 1239, 362),  # inside the close-up's rounded frame
}
BG = np.array([38, 19, 8], np.float32)  # the sheet's night blue (BGR) plus a margin that also swallows frame traces

sheet = cv2.imread(src)
for name, (x0, y0, x1, y1) in BOXES.items():
    crop = sheet[y0 * S : y1 * S, x0 * S : x1 * S].astype(np.float32)
    h, w = crop.shape[:2]
    if name != "neural":
        crop = np.clip((crop - BG) * 1.05, 0, 255)
    # Feather: fade the outer 6% to black (12% for the close-up, which fills the screen when zoomed).
    edge = 0.12 if name == "neural" else 0.07
    ry = np.clip(np.minimum(np.arange(h), np.arange(h)[::-1]) / (edge * h), 0, 1)
    rx = np.clip(np.minimum(np.arange(w), np.arange(w)[::-1]) / (edge * w), 0, 1)
    mask = (np.outer(ry, rx) ** 1.5)[..., None]
    img = (crop * mask).astype(np.uint8)
    for suffix, width in (("", 1600), ("-sm", 800)):
        scale = width / w
        resized = cv2.resize(img, (width, round(h * scale)), interpolation=cv2.INTER_AREA)
        cv2.imwrite(str(out / f"{name}{suffix}.webp"), resized, [cv2.IMWRITE_WEBP_QUALITY, 86])
    print(name, f"{w}x{h} ->", ", ".join(f"{(out / f'{name}{s}.webp').stat().st_size // 1024} KB" for s in ("", "-sm")))
