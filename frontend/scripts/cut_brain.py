"""Cut the five brain views and the neural close-up out of the 4x brain sheet for the home page.

    python -I frontend/scripts/cut_brain.py brain-x4.png frontend/public/brain

    python -I frontend/scripts/cut_brain.py --map map-clean-x4.png frontend/public/map

The sheet is first upscaled 4x with Real-ESRGAN (realesrgan-x4plus) from
design/reference/brain/brain-sheet-original.jpg. Boxes below are in original-sheet pixels. Each view
is lifted to pure black and its edges feathered so no frame or label shows; the page screen-blends
the layer that holds them, so black vanishes against whatever is behind. (Real transparency was tried:
alpha from brightness looks the same but triples the file size.) Writes <name>.webp (1600px) and
<name>-sm.webp (800px).
With --map, the cleaned 4x India map gets the same treatment (india.webp 2400px, india-sm.webp 1200px).
"""

import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

def save(img: np.ndarray, out: Path, name: str, widths: tuple[tuple[str, int], ...]) -> None:
    h, w = img.shape[:2]
    for suffix, width in widths:
        resized = cv2.resize(img, (width, round(h * width / w)), interpolation=cv2.INTER_AREA)
        Image.fromarray(resized[..., ::-1]).save(out / f"{name}{suffix}.webp", quality=84, method=6)
    print(name, f"{w}x{h} ->", ", ".join(f"{(out / f'{name}{s}.webp').stat().st_size // 1024} KB" for s, _ in widths))


if sys.argv[1] == "--map":
    out = Path(sys.argv[3])
    out.mkdir(parents=True, exist_ok=True)
    save(cv2.imread(sys.argv[2]), out, "india", (("", 2400), ("-sm", 1200)))
    sys.exit()

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
    save((crop * mask).astype(np.uint8), out, name, (("", 1600), ("-sm", 800)))
