# Body scan site

A scroll-driven landing page that walks around a full body scan in five views (front, back, left, right, above). Its motion follows `design/reference/MOTION.md`.

## Run it

Open `index.html` in a browser, or serve the folder:

```sh
cd web && python3 -m http.server 8000   # then open http://localhost:8000
```

Everything is bundled locally: GSAP 3.12.5 and ScrollTrigger in `vendor/`, and Lenis 1.1.13 for smooth scrolling. Only the fonts (Bodoni Moda and Manrope) load from Google Fonts.

## Files

- `index.html`, `styles.css`, `main.js`: the page.
- `assets/source-scan-sheet.webp`: the original five-view image.
- `assets/{front,back,left,right,top}.webp`: each view cut out of that image by `tools/cut_views.py`, which paints over the image's built-in UI boxes and turns the background to black.

## Swapping in sharper images

The source image is 988×394, so each body is only about 160×320 pixels before upscaling. For a crisp result, export each view at least 1000 px tall on a black background and replace the files in `assets/` with the same names. No code changes are needed.
