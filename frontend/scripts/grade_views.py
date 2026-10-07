"""Highlight the brain and the heart in the transparent body views.

Usage: python frontend/scripts/grade_views.py design/reference/anatomy/views-ungraded frontend/public/scan [--warm]
Needs Pillow and NumPy. The input views come from cut_views.py.

The body keeps its original blue. The brain (rose) and the heart (garnet) are picked out in colour with a
soft glow, because they stand for what PRISM reads: mind and heart. With --warm, the body is first graded
to a warm silver (tried in the Champagne noir restyle, then set aside in favour of the original blue).
"""

import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

SHADOW = np.array((0.20, 0.17, 0.13), dtype=np.float32)
HIGHLIGHT = np.array((1.00, 0.95, 0.86), dtype=np.float32)
KEEP_ORIGINAL = 0.18
GAMMA = 0.92
BRAIN = np.array((0.88, 0.44, 0.52), dtype=np.float32)  # rose
HEART = np.array((0.86, 0.27, 0.31), dtype=np.float32)  # garnet


def _head(alpha: np.ndarray) -> tuple[float, float, float, float]:
    """Centre x, top y, neck y and width of the head, from the body's outline."""
    h = alpha.shape[0]
    rows = alpha > 0.35
    top = int(np.argmax(rows.any(axis=1)))
    widths = [(int(np.ptp(rows[y].nonzero()[0])) if rows[y].any() else 0) for y in range(h)]
    span = range(top + int(0.09 * h), top + int(0.16 * h))
    neck = min(span, key=lambda y: widths[y] if widths[y] else 10**9)
    head_rows = rows[top:neck]
    xs = head_rows.nonzero()[1]
    return float(np.median(xs)), float(top), float(neck), float(np.percentile(xs, 90) - np.percentile(xs, 10))


def _pink(rgb: np.ndarray, alpha: np.ndarray) -> np.ndarray:
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    return np.clip((r - g) - 0.10, 0, 1) * (b >= g - 0.03) * alpha[..., 0]


def _ellipse(shape: tuple[int, int], cx: float, cy: float, rx: float, ry: float, feather: float) -> np.ndarray:
    m = Image.new("L", (shape[1], shape[0]), 0)
    ImageDraw.Draw(m).ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=255)
    return np.asarray(m.filter(ImageFilter.GaussianBlur(feather)), dtype=np.float32)[..., None] / 255


def organ_masks(view: str, rgb: np.ndarray, alpha: np.ndarray) -> list[tuple[np.ndarray, np.ndarray]]:
    """Soft masks for the brain and the heart in one view (the heart isn't visible from behind)."""
    h, w = alpha.shape[:2]
    pink = _pink(rgb, alpha)
    out = []
    if view == "top":
        for lo, hi, colour in ((0.0, 0.45, BRAIN), (0.40, 0.75, HEART)):
            ys, xs = np.nonzero(pink[int(lo * h) : int(hi * h)] > 0.08)
            ys = ys + int(lo * h)
            cx, cy = np.median(xs), np.median(ys)
            rx, ry = (np.percentile(xs, 95) - np.percentile(xs, 5)) / 2, (np.percentile(ys, 95) - np.percentile(ys, 5)) / 2
            out.append((_ellipse((h, w), cx, cy, rx * 1.1, ry * 1.1, 0.03 * w), colour))
        return out
    cx, top, neck, hw = _head(alpha[..., 0])
    hh = neck - top
    out.append((_ellipse((h, w), cx, top + 0.3 * hh, 0.4 * hw, 0.27 * hh, 0.01 * h), BRAIN))
    if view != "back":
        band = (slice(int(0.20 * h), int(0.34 * h)),)
        ys, xs = np.nonzero(pink[band] > 0.12)
        ys = ys + int(0.20 * h)
        # The heart is the densest pink cluster in the chest: take the median, then its spread.
        hx, hy = np.median(xs), np.median(ys)
        near = (np.abs(xs - hx) < 0.06 * h) & (np.abs(ys - hy) < 0.06 * h)
        hx, hy = np.median(xs[near]), np.median(ys[near])
        out.append((_ellipse((h, w), hx, hy, 0.034 * h, 0.042 * h, 0.012 * h), HEART))
    return out


def grade(path: Path, out: Path, warm: bool = False) -> None:
    im = np.asarray(Image.open(path).convert("RGBA")).astype(np.float32) / 255
    rgb, alpha = im[..., :3], im[..., 3:]
    lum = np.clip((rgb @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32))[..., None] * 1.15, 0, 1)
    mixed = rgb.copy()
    if warm:
        toned = SHADOW * (1 - lum**GAMMA) + HIGHLIGHT * lum**GAMMA
        mixed = toned * (1 - KEEP_ORIGINAL) + rgb * KEEP_ORIGINAL
        mixed = np.clip(mixed * np.clip(lum * 1.4 + 0.15, 0, 1), 0, 1)
    view = path.stem
    for mask, colour in organ_masks(view, rgb, alpha):
        # Tint the organ's own line work (so detail stays), then add a soft glow around it.
        detail = np.clip(lum * 1.35, 0, 1)
        tinted = colour * (0.3 + 0.8 * detail)
        mixed = mixed * (1 - 0.9 * mask) + tinted * (0.9 * mask)
        glow_src = Image.fromarray((np.clip(mask[..., 0] * detail[..., 0], 0, 1) * 255).astype(np.uint8))
        glow = np.asarray(glow_src.filter(ImageFilter.GaussianBlur(0.02 * mask.shape[0])), dtype=np.float32)[..., None] / 255
        mixed = np.clip(mixed + colour * glow * 0.55, 0, 1)
        alpha = np.maximum(alpha, np.clip(glow * 0.9, 0, 1))
    Image.fromarray((np.concatenate([mixed, alpha], -1) * 255).astype(np.uint8)).save(out, quality=90, method=6)


if __name__ == "__main__":
    src, dst = Path(sys.argv[1]), Path(sys.argv[2])
    warm = "--warm" in sys.argv[3:]
    for view in ("front", "back", "left", "right", "top"):
        grade(src / f"{view}.webp", dst / f"{view}.webp", warm)
        print("done", view)
