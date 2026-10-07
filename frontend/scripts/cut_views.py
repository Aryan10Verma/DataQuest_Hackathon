"""Cut the five body views out of the scan sheet, painting over the baked-in UI insets."""
import sys
from PIL import Image, ImageChops, ImageDraw, ImageFilter

# Usage: python frontend/scripts/cut_views.py design/reference/anatomy/scan-sheet-4x.webp frontend/public/scan 4
# SCALE is how much larger SHEET is than the original 988x394 image (4 for the Real-ESRGAN 4x upscale).
# A scaled sheet is cut at full resolution; the original is enlarged 4x with Lanczos instead.
src, out = sys.argv[1], sys.argv[2]
k = int(sys.argv[3]) if len(sys.argv) > 3 else 1
sheet = Image.open(src).convert("RGB")
BG = (4, 12, 22)

# Insets to paint out, in sheet pixels (x0, y0, x1, y1).
PAINT = [
    (27, 45, 68, 118), (152, 30, 215, 84), (158, 30, 215, 88), (171, 88, 215, 106), (27, 238, 76, 314),      # front
    (237, 45, 272, 118), (237, 45, 277, 90), (370, 30, 425, 86), (372, 86, 392, 112), (392, 86, 425, 118), (237, 240, 286, 318),  # back
    (485, 45, 498, 118), (561, 30, 569, 110), (561, 112, 569, 206), (485, 240, 495, 315),  # left
    (675, 45, 682, 120), (744, 30, 749, 210), (675, 240, 686, 318),                      # right
]
mask = Image.new("L", sheet.size, 0)
d = ImageDraw.Draw(mask)
for b in PAINT:
    d.rectangle(tuple(v * k for v in b), fill=255)
mask = mask.filter(ImageFilter.GaussianBlur(2 * k))
sheet = Image.composite(Image.new("RGB", sheet.size, BG), sheet, mask)

def unpremultiply(channel, alpha):
    """Scale a colour channel up by 1/alpha so semi-transparent pixels keep their brightness."""
    c, a = channel.tobytes(), alpha.tobytes()
    return Image.frombytes("L", channel.size, bytes(min(255, x * 255 // y) if y else 0 for x, y in zip(c, a)))


VIEWS = {  # name: (x, y, w, h)
    "front": (36, 34, 160, 320),
    "back": (245, 34, 166, 320),
    "left": (485, 34, 84, 320),
    "right": (675, 34, 74, 320),
    "top": (814, 116, 150, 150),
}
for name, (x, y, w, h) in VIEWS.items():
    im = sheet.crop((x * k, y * k, (x + w) * k, (y + h) * k))
    if k == 1:
        im = im.resize((w * 4, h * 4), Image.LANCZOS)
        im = im.filter(ImageFilter.UnsharpMask(radius=3, percent=60, threshold=2))
    # Crush the navy panel background to pure black so the page shows through.
    im = im.point(lambda v: max(0, v - 26) * 255 // 229)
    # Turn brightness into transparency so the body can sit over page content.
    r, g, b = im.split()
    alpha = ImageChops.lighter(ImageChops.lighter(r, g), b).point(lambda v: min(255, int(v * 2.2)))
    rgba = Image.merge("RGBA", (*(unpremultiply(c, alpha) for c in (r, g, b)), alpha))
    rgba.save(f"{out}/{name}.webp", quality=92, method=6)
    print(name, im.size)
