# PRISM website design plan

## Concept: the scan

PRISM reads a student from several angles and shows the family what it found. The website stages that literally:
- **Landing page:** a cinematic scan. The holographic body turns through five views as you scroll, and each view is one part of the questionnaire.
- **App screens:** the quiet room you enter after the scan. Each screen has one luminous object (a score ring, a gauge, a timeline), and everything around it stays dark and still.

Decisions confirmed with the client: dark only, one cyan accent, six score colours used only inside charts, and every screen in the spec (P0 to P2).

## Colour

| Token | Hex | Use |
|---|---|---|
| Void | `#02050B` | Page background |
| Deep | `#08101D` | Raised panels: drawer, dialogs, the stats bar |
| Line | `rgba(143,208,255,0.14)` | Hairlines and dividers. Panels are defined by a hairline, not a shadow. |
| Ink | `#E8F0FF` | Text |
| Muted | `#8592AB` | Secondary text (meets AA on Void) |
| Scan | `#8FD0FF` | The only accent: focus rings, the active nav item, links, the ring, primary buttons |

**Score parts (charts only).** These are the spec's hues, lifted for a dark background. They are the only other colours in the product.

| Part | Hex |
|---|---|
| Fit | `#9488F2` |
| Market | `#5E9CF2` |
| Affordability | `#3FC1AE` |
| Return on investment | `#86C35F` |
| Family alignment | `#E8B54A` |
| Disruption | `#EF6F68`, hatched because it subtracts |

**Funding class has no colour,** so colour keeps a single meaning. It is a four-step meter with a text label:
- Comfortable: ▮▮▮▮
- Stretch: ▮▮▮▯
- Loan-dependent: ▮▮▯▯
- Out of reach: ▮▯▯▯

## Type

- **Display: Bodoni Moda.** Headlines, the big figures (a career's score, the conflict index), and the giant *PRISM* behind the body. The figures are set large in the serif, as in a museum label.
- **Text and interface: Manrope.** Body copy, controls, and tables, with tabular numbers. There is no monospace face; numbers stay in the text family.
- **Tamil and Hindi:** narratives and reports fall back to Noto Sans Tamil and Noto Sans Devanagari, because Bodoni has no Indic glyphs.
- **Scale (ratio 1.333):** 12 / 14 / 16 / 21 / 28 / 38 / 50 / 67 px, plus the giant word at 7–10 vw. Body text is 16 px with 1.6 line-height and lines under 72 characters.
- **Case:** sentence case everywhere. Capitals only for the wide-tracked giant word.

## Layout

**Shell.**
- **Navigation:** a slim text rail on the left, the same rail as on the landing page, with a cyan marker that slides to the current screen. It holds Home, Questionnaire, Profile, Results, Family, Plan, Explore and How we know.
- **Top bar:** only the logo, the language menu (English, Tamil, Hindi) and the account menu.
- **Phones:** the rail becomes a bottom bar with five items, and a More sheet holds the rest.
- **Alignment:** content is left-aligned on an 8 px grid. Panels have a 14 px radius. Pills and the ring are fully round.

**Results, the hero app screen.** The top career sits inside the same glowing ring as the landing page, so the scan visibly "lands" on an answer.
```
┌─rail─┬───────────────────────────────────────────────────────────────┐
│ Home │  Best match for Ananya                              Run again │
│ Quest│   ╭────────╮   Biomedical Engineer                            │
│ Prof │  (   75    )  Health and life sciences   ▮▮▮▮ Comfortable      │
│▌Res  │   ╰────────╯  [■■■■■■■■■■■■■■■■■■■■■■■▨▨]  0.71–0.84          │
│ Fam  │  Summary headline in plain language, then three short lines   │
│ Plan │ ────────────────────────────────────────────────────────────  │
│ Expl │  Best overall   For you   For your family   Hidden gems …     │
│ How  │  2  Electronics & VLSI     ■■■■■■■■■■■■■▨  0.75  ▮▮▮▮  ₹6.1 L │  Family talk
│      │  3  Computational Biologist■■■■■■■■■■■■▨  0.73  ▮▮▮▮  ₹5.4 L │  32 · mild
│      │  4  AI / ML Engineer       ■■■■■■■■■■■▨   0.72  ▮▮▮▯  ₹9.8 L │  Robustness
├──────┴───────────────────────────────────────────────────────────────┤
│ 76 Readiness │ 75 Aptitude │ 63 Interest clarity │ 95 Finances │ 69 Family │ 67 Market │
└──────────────────────────────────────────────────────────────────────┘
```
The six composite scores live in the bottom stats bar, carried over from the landing page, instead of a grid of tiles.

**Landing page.**
```
Scene 0   PRISM, set huge behind the body       "See every path. Choose yours together."
Scene 1   Front view      Interests             (what you enjoy doing)
Scene 2   Back view       Aptitude              (what comes easily)
Scene 3   Left side       Thinking style        (how you solve problems)
Scene 4   Right side      Values                (what matters to you)
Scene 5   From above      The full picture: the six score parts, one at a time, in their colours
Then      Know yourself  /  Plan with your family  /  See your future
          "Every number shows its source and whether it has been checked."   [Create account] [Sign in]
```

**Other screens.**
- **Sign in and create account:** the form on the left; on the right, the front-view body dimmed inside its ring.
- **Career detail:** a full-height drawer on the right (a full page on phones). It holds:
  - "Why this score": a waterfall in the six colours.
  - "Can we afford it": a ledger in hairline rows.
  - "How you match": paired bars for the student against what the career needs.
  - "Where these numbers come from": the inputs, each marked Checked or Estimate.
  - "Similar paths".
- **Family conversation:** the ring cut in half to make the 0–100 gauge, then three conversation cards and the bridge careers. The student sees only the gentle summary.
- **What-if:** controls on the left and the ranking on the right. When the result comes back, each row moves to its new rank.
- **How we know:** an editorial page. The data statement in large Bodoni, then hairline tables for datasets, formulas and fairness checks.
- **Questionnaire:** full screen with one question at a time, in large serif. The five answer steps are 56 px targets. Progress is a thin cyan line along the top.
- **Profile:** the Holland code as a giant word, a RIASEC hexagon in cyan, and aptitude bars.
- **Plan:** a horizontal five-year timeline with typed milestones, a deadline countdown list, and a 2×2 SWOT.
- **Counsellor and admin:** dense, quiet tables. Status chips use the meter glyph or text, not colour.

## Motion

- **Landing:** the one cinematic sequence, scroll-scrubbed with GSAP and Lenis (already built).
- **App, per screen:** at most one entrance moment. On Results, the ring draws, the score counts up once and the bars grow once. Other screens appear without entrance animation.
- **Responses to actions:** the drawer slides in, the tab marker slides, what-if rows reorder, and saving confirms.
- **Reduced motion:** everything becomes a fade or an instant change.

## Writing

- Plain words, sentence case, and the same name for an action throughout. "Run analysis" leads to a toast that says "Analysis ready".
- Errors show the API's own message plus the next step. Empty screens say what to do, for example "Answer the questionnaire to see your matches".
- Privacy is stated where it applies: "Shared with parents only", never ₹0.

## Build

- **Frontend:** Vite, React 18 and TypeScript, with Tailwind on CSS-variable tokens. TanStack Query, React Router, types generated from `openapi.json`, Recharts styled to the tokens, Framer Motion inside the app, and GSAP, ScrollTrigger and Lenis for the landing page.
- **One command for the finished product:** `./start.sh` seeds the database, builds the frontend and runs everything on http://localhost:8000. FastAPI serves the built site next to the API, through a small static-files mount in the backend.
- **Development:** Vite on port 5173 with a proxy to port 8000.
- **Data modes:** `VITE_DATA_MODE=fixtures` is the offline safety net.
- **Developer tools:** off unless `VITE_DEV_TOOLS=true`, as the spec says.

## Review against the brief: what I changed and why

- **Funding colours:** dropped the spec's green, amber, orange and red classes in favour of the meter glyph. They clashed with the score colours and broke the one-meaning-per-colour rule the client chose.
- **Monospace numbers:** replaced the spec's JetBrains Mono. A mono face for figures is a template default, and the app's figures read better as large serif headline numbers or tabular sans in tables.
- **Composite score tiles:** replaced the grid of six tiles with the bottom stats bar from the landing page. The grid was the generic dashboard default, and the bar ties the app to the landing page.
- **Sidebar:** replaced the icon sidebar with the text rail from the landing page. Same reason: continuity with the one memorable element, the scan.
