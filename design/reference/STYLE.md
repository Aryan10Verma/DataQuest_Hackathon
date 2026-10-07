# Visual style reference

The look we want: **minimal colour, premium feel**, sitting on top of the scroll-driven motion in `MOTION.md` (that motion runs in the background of every page).

Reference images are in `style/`:

| File | What to take from it |
|---|---|
| `nuorbit.png` | A single figure walking through a glowing ring. A wide-tracked headline runs behind and through the subject. Monochrome teal, a stats row along the bottom. |
| `cyber-of-x.webp` | A huge headline set behind the character's head, so the subject overlaps the type. One accent colour (pink-red) on near-black. A thin vertical social rail on the left. |
| `atelier.png` | The most restrained: an elegant spaced serif, a deep oxblood near-black, a split layout with copy panel left and portrait right, and one quiet button. |
| `samurai.webp` | A light variant: grey concrete with a single red brush stroke behind the subject. Proof that one colour is enough. |
| `kamui.webp` | Warm, low light with candle glow as the only bright colour. Copy on the left, illustrated subject on the right. |

## Rules these share

- **One hero subject** (figure, object or body), large, centre or right, lit so it is the brightest thing on the page.
- **Two or three colours in total:** a near-black (or a single light neutral), white type, and **one** accent that also appears as light in the image (glow, ring, brush stroke, candle).
- **Oversized headline that interacts with the subject:** set behind it, cut through by it, or overlapping its base. The type is part of the composition, not a caption.
- **Quiet chrome:** a thin top nav, one outlined button, small supporting text. Extra UI lives in a slim bottom bar (stats, play video) or a side rail.
- **Lots of dark negative space;** nothing competes with the subject.
- **Atmosphere over decoration:** fog, glow, grain, or soft light falloff instead of gradients and cards.

## Applied to this project

The PRISM landing page (`frontend/src/landing/`) and the app follow these rules:
- Near-black background, white type, and a cyan glow ring as the one accent. The six score-part colours appear only inside charts.
- The word *PRISM* is set huge behind the body (as in NUORBIT and METAVERSE). On scroll it spreads apart and dissolves.
- A slim stats bar runs along the bottom of the landing page (74 questions, 25 minutes, 6 score parts) and of the Results screen (the six overall scores).

The full design system is in `design/PLAN.md`.
