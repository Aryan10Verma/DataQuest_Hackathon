# Motion reference

Source: `motion-reference.mp4` (12 s, 720×720 screen capture). `motion-reference-frames.png` is a contact sheet sampled at 1.5 fps.

The reference is a dark, cinematic museum landing page (a mock "Louvre – Museum of Ancient Art"). This file records the motion language we want to reproduce. The museum content and branding are only the example; our site keeps its own subject.

## Look

- Near-black stage with soft spotlit light falling on a single hero object (a bronze statue). The object is the only bright thing besides the type.
- High-contrast serif display type (Didone / Bodoni-like), large, set in two or three stacked lines with ragged alignment.
- Tiny sans-serif UI chrome: logo top left, a thin nav row, a grid icon top right, a vertical progress/section indicator on the left edge.
- Faint vertical column guides across the page.
- One luminous accent: a glowing white ring behind the object.

## Motion beats (in order)

1. **Hero idle.** The statue rotates slowly in place (a 3D turntable feel). The ring holds behind it. The headline "Museum / of Ancient / Art" sits over the statue's base, with a short body paragraph beside it.
2. **Ring sweep.** On scroll, the ring slides right and scales up, partly leaving the frame. At the same time the headline drifts up and fades, and the statue turns and zooms in toward the camera. All three move together on a single scroll timeline.
3. **Scene change.** The camera ends in a close, side-lit profile of the statue on the right half. The left half is empty.
4. **Detail reveal.** Three facts (name, size, place of origin) type in letter by letter, staggered: each heading builds left to right with letters rising and un-blurring, then its small body text fades in beneath. Each fact starts roughly 150 ms after the one above it.
5. **Exit.** The fact block scrolls up and off while the statue zooms closer.
6. **Next chapter.** A new headline ("Discover…") builds in letter by letter. The ring returns, now cropped at the top of the frame. The statue settles, and a two-column caption fades in at the bottom right.

## Feel

- Slow and weighty: transitions run 0.8–1.4 s with ease-out (`power3.out` / `expo.out`), never bouncy.
- Scroll-driven and scrubbed. Scroll position controls the animation, so scrolling back reverses it.
- Only one main movement per beat, and type always moves less than the object.
- No hover wiggle or decorative entrance on every block.

## How to build it

| Effect | Approach |
|---|---|
| Scroll-scrubbed scenes, pinning | GSAP ScrollTrigger (`scrub: true`, `pin: true`), with Lenis for smooth scroll |
| Letter-by-letter reveals | GSAP SplitText (or manual span splitting), animating `y`, `opacity` and `filter: blur()` with a stagger |
| Rotating, zooming hero object | One of these: (a) a 3D model (`.glb`) in Three.js / React Three Fiber, with the camera driven by scroll; (b) an image sequence (about 120 high-res frames) drawn to `<canvas>` by scroll position, as on Apple product pages; (c) a scrubbed video |
| Glowing ring | SVG circle or CSS `border` with layered `box-shadow` / `filter: drop-shadow`, transformed by the same timeline |
| HD sharpness | Render text as real DOM text (never baked into images), serve 2× images or AVIF/WebP, and size the canvas to `devicePixelRatio` |
| Accessibility | Respect `prefers-reduced-motion` by swapping scrubbed motion for simple cross-fades, and keep the text readable without JS |

## The asset we need

The motion is all code. The **photoreal rotating object is the one asset code can't create**: it needs a 3D model, a rendered image sequence, or a video. Options:
- A free or licensed 3D scan (for example from Sketchfab or a museum open-access collection) in `.glb` format.
- A product or subject render exported as a frame sequence.
- A stylized object built in Three.js (procedural geometry or particles), if a photoreal one isn't necessary.
