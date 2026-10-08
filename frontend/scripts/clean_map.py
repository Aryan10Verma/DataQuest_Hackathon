"""Clean the India map artwork for the website: erase the drawn city dots and names, keep only India
(mainland, Andaman & Nicobar, Lakshadweep) on pure black, and drop the frame, legend and compass.

    python -I frontend/scripts/clean_map.py design/reference/map/india-map-original.jpg out.png

Run Real-ESRGAN on the result afterwards: cleaning first means the repairs are sharpened too.
The site draws its own live dots at the same places (frontend/src/landing/cities.ts).
"""

import sys

import cv2
import numpy as np

src, dst = sys.argv[1], sys.argv[2]
im = cv2.imread(src)
h, w = im.shape[:2]
f = im.astype(np.float32)
b, g, r = f[..., 0], f[..., 1], f[..., 2]
L = f.mean(2)

# 1. Drawn red dots, and the white names around them (the network itself is blue, not white).
red = ((r > 150) & (g < 140) & (b < 160) & (r - g > 60)).astype(np.uint8)
white = ((r > 150) & (g > 150) & (b > 150) & (np.abs(r - b) < 70)).astype(np.uint8)
dots = cv2.connectedComponentsWithStats(cv2.dilate(red, np.ones((3, 3), np.uint8), iterations=2))
near = np.zeros_like(red)
for i in range(1, dots[0]):
    x, y, bw, bh, area = dots[2][i]
    cx, cy = x + bw // 2, y + bh // 2
    if area < 8 or (cx > 600 and cy < 350):  # the legend list is cut away below anyway
        continue
    # Names sit to the right of their dot; Jaipur's is to the left and Lakshadweep's above.
    near[max(0, cy - 12):cy + 13, max(0, cx - 12):cx + 13] = 1
    if abs(cx - 313) < 6 and abs(cy - 556) < 6:
        near[cy - 18:cy + 16, cx - 80:cx] = 1
    elif abs(cx - 122) < 6 and abs(cy - 1213) < 6:
        near[cy - 36:cy - 6, cx - 12:cx + 100] = 1
    else:
        near[cy - 22:cy + 16, cx:cx + 180] = 1
labels = cv2.dilate((white & near) | red, np.ones((3, 3), np.uint8), iterations=3)

# Paint the network over the names first, so the coastline under a name stays whole.
im = cv2.inpaint(im, labels, 5, cv2.INPAINT_TELEA)
f = im.astype(np.float32)
b, g, r = f[..., 0], f[..., 1], f[..., 2]

# Each dot also left a soft red halo. Inside a disc around each dot, recolour red-tinted pixels to the
# network's own blue at the same brightness, so the texture stays and only the colour changes.
yy, xx = np.mgrid[0:h, 0:w]
discs = np.zeros((h, w), bool)
for i in range(1, dots[0]):
    x, y, bw, bh, area = dots[2][i]
    cx, cy = x + bw // 2, y + bh // 2
    if area >= 8 and not (cx > 600 and cy < 350):
        discs |= (xx - cx) ** 2 + (yy - cy) ** 2 < 30 ** 2
reddish = discs & (r > g + 8)  # pink and red; the network's own blues and violets have green above red
Y = 0.299 * r + 0.587 * g + 0.114 * b
tint = np.array([1.0, 0.62, 0.36], np.float32)  # B, G, R shares of the network blue
blue = np.clip(Y[..., None] * tint / 0.42, 0, 255)
im = np.where(reddish[..., None], blue, f).astype(np.uint8)
L = im.astype(np.float32).mean(2)

# The decorative frames (the island insets) are long, perfectly straight lines out at sea. Find the
# mainland first, then remove straight runs of 40 px or more everywhere outside it.
dense0 = (cv2.GaussianBlur(L, (0, 0), 5) > 30).astype(np.uint8)
n0, lab0, st0, _ = cv2.connectedComponentsWithStats(dense0)
mainland = cv2.dilate((lab0 == 1 + int(np.argmax(st0[1:, 4]))).astype(np.uint8), np.ones((15, 15), np.uint8))
bright = (L > 28).astype(np.uint8)
# A frame line is long one way and only a few pixels thick the other way (a column of islands is not).
open_ = lambda k: cv2.morphologyEx(bright, cv2.MORPH_OPEN, np.ones(k, np.uint8))  # noqa: E731
lines = (open_((1, 41)) & (1 - open_((7, 1)))) | (open_((41, 1)) & (1 - open_((1, 7))))
lines = cv2.dilate(lines, np.ones((5, 5), np.uint8)) & (1 - mainland)
im[lines > 0] = 0
L[lines > 0] = 0

# 2. India's shape: where the network is dense.
dense = cv2.GaussianBlur(L, (0, 0), 5) > 30
n, lab, st, _ = cv2.connectedComponentsWithStats(dense.astype(np.uint8))
keep = np.zeros((h, w), np.uint8)
big = 1 + int(np.argmax(st[1:, 4]))
keep[lab == big] = 1  # the mainland, joined to the north-east through the Siliguri corridor
# Islands are small and sparse, so they get their own, lower threshold inside their two areas.
isl = cv2.dilate((L > 40).astype(np.uint8), np.ones((5, 5), np.uint8))
zone = np.zeros((h, w), np.uint8)
zone[960:1260, 820:940] = 1  # Andaman & Nicobar
zone[1160:1300, 70:190] = 1  # Lakshadweep
n, lab, st, _ = cv2.connectedComponentsWithStats(isl & zone)
for i in range(1, n):
    x, y, bw, bh, area = st[i]
    # Islands (alone or touching in a column) fill their box well; leftover frame corners are sparse.
    compact = max(bw, bh) <= 140 and area >= 0.22 * bw * bh
    if area >= 10 and compact:
        keep[lab == i] = 1
# Fill lakes inside the outline, trim thin spurs left by frame lines, then soften the edge.
cnts, _ = cv2.findContours(keep, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
solid = np.zeros_like(keep)
cv2.drawContours(solid, cnts, -1, 1, thickness=cv2.FILLED)
solid = cv2.morphologyEx(solid, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))
alpha = cv2.GaussianBlur(cv2.dilate(solid, np.ones((5, 5), np.uint8)).astype(np.float32), (0, 0), 3)

# 3. Keep only India, on black.
clean = im
bg = np.array([22, 9, 1], np.float32)  # the artwork's own night blue, in BGR
out = np.clip((clean.astype(np.float32) - bg) * 1.06, 0, 255) * alpha[..., None]

ys, xs = np.where(solid > 0)
pad = 24
x0, x1, y0, y1 = max(0, xs.min() - pad), min(w, xs.max() + pad), max(0, ys.min() - pad), min(h, ys.max() + pad)
cv2.imwrite(dst, out[y0:y1, x0:x1].astype(np.uint8))
print(f"crop offset {x0},{y0} size {x1 - x0}x{y1 - y0}")
