---
name: Beever
description: A honeycomb lit by honey — a cartoon-warm, hexagon-structured web app that teaches kids 6–15 to run a financial life.
colors:
  mel: "#FFC200"
  nectar: "#FFDE00"
  ambar: "#F4B73E"
  cera: "#FFFDF7"
  branco: "#FFFFFF"
  breu: "#111111"
  tinta: "#000000"
  tinta-suave: "#4A4A4A"
  linha: "#E8E2D6"
  acerto: "#2E9E4F"
  acerto-texto: "#268044"
  atencao: "#E07A1F"
  atencao-texto: "#9E5309"
  erro: "#D93A3A"
  erro-texto: "#C42B2B"
typography:
  display:
    fontFamily: "Lilita One, system-ui, sans-serif"
    fontSize: "clamp(2rem, 6vw, 3rem)"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "normal"
  headline:
    fontFamily: "Lilita One, system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 4vw, 2rem)"
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: "normal"
  title:
    fontFamily: "Nunito, system-ui, sans-serif"
    fontSize: "clamp(1.25rem, 2.5vw, 1.5rem)"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "normal"
  body:
    fontFamily: "Nunito, system-ui, sans-serif"
    fontSize: "clamp(1rem, 1.2vw, 1.0625rem)"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Nunito, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "0.04em"
  numero:
    fontFamily: "Lilita One, system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 4vw, 2rem)"
    fontWeight: 400
    lineHeight: 1.1
    fontFeature: "tnum"
rounded:
  sm: "8px"
  favo: "20px"
  pilula: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
  secao: "80px"
components:
  button-primary:
    backgroundColor: "{colors.mel}"
    textColor: "{colors.tinta}"
    typography: "{typography.label}"
    rounded: "{rounded.favo}"
    padding: "12px 24px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.nectar}"
    textColor: "{colors.tinta}"
  button-primary-active:
    backgroundColor: "{colors.ambar}"
    textColor: "{colors.tinta}"
  button-secondary:
    backgroundColor: "{colors.branco}"
    textColor: "{colors.tinta}"
    typography: "{typography.label}"
    rounded: "{rounded.favo}"
    padding: "12px 24px"
    height: "48px"
  button-secondary-hover:
    backgroundColor: "{colors.cera}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.tinta-suave}"
    typography: "{typography.label}"
    rounded: "{rounded.favo}"
    padding: "12px 24px"
    height: "48px"
  input-text:
    backgroundColor: "{colors.branco}"
    textColor: "{colors.tinta}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
    height: "48px"
  input-text-focus:
    backgroundColor: "{colors.branco}"
    textColor: "{colors.tinta}"
  card:
    backgroundColor: "{colors.branco}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.favo}"
    padding: "24px"
  card-recessed:
    backgroundColor: "{colors.cera}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.favo}"
    padding: "24px"
  app-bar:
    backgroundColor: "{colors.mel}"
    textColor: "{colors.tinta}"
    padding: "16px 24px"
  badge-mel:
    backgroundColor: "{colors.nectar}"
    textColor: "{colors.tinta}"
    typography: "{typography.label}"
    rounded: "{rounded.pilula}"
    padding: "4px 12px"
  progress-track:
    backgroundColor: "{colors.linha}"
    rounded: "{rounded.pilula}"
    height: "12px"
  progress-fill:
    backgroundColor: "{colors.mel}"
    rounded: "{rounded.pilula}"
    height: "12px"
  chip-estado:
    backgroundColor: "{colors.cera}"
    textColor: "{colors.tinta-suave}"
    typography: "{typography.label}"
    rounded: "{rounded.pilula}"
    padding: "4px 12px"
---

# Design System: Beever

## Overview

**Creative North Star: "A Colmeia Iluminada"**

Beever is a hive seen from inside, lit by its own honey. Every surface is pale wax — a warm off-white that never goes cold or clinical — and the only light in the room is honey: a saturated `#FFC200` that arrives as a solid field, never as a gradient, never as a glow. Light means "here, act". Wax means "read, think". The system has exactly one voice of color and it is spent on the one thing the child should do next. The public landing page inverts this on purpose: it sits on near-black `#111111` with honey as the only illumination, so that logging in and landing in the pale app literally feels like the lights coming on.

The second structural idea is the hexagon. It is not decoration applied on top of rectangles; it is the load-bearing shape of the product. Content modules (favos), avatars, section icons, the trail, day-picker cards and frames are hexagonal. Rectangles are reserved for running text and form fields, where a clipped corner would fight legibility. This is what keeps a bright, friendly children's product from reading as a generic rounded-card SaaS dashboard in yellow.

The tone is tactile and playful without being fragile. Components respond: they lift under the cursor, sink under a press, and money counts up rather than snapping to its new value. Depth is carried by soft, diffuse shadow — a deliberate departure from the heavier cartoon convention of a black 2 px keyline and a hard offset shadow, which this system has explicitly declined. The character lives in the shape language, the honey, the mascot Beenie and the motion, not in an outline. Beenie is the only illustrated voice in the system; she is never replaced by an emoji or a generic icon.

The audience spans 6 to 15, which is a wide gap in taste. The resolution is: friendly geometry and generous touch targets for the youngest, restrained chrome and real numbers for the oldest. Nothing in the interface talks down.

**Key Characteristics:**
- Pale wax surfaces (`#FFFDF7`) with honey (`#FFC200`) as the single accent and the single light source.
- Hexagon as structural shape, not ornament.
- Soft diffuse depth, no keylines, no gradients, no decorative blur beyond the shadow scale.
- Two typefaces with fixed jobs: Lilita One announces, Nunito explains.
- Tactile response — lift on hover, sink on press, numbers that count.
- Mobile-first geometry that owes the desktop a real composition, not a centered phone.
- Money is always tabular, always the largest number on the screen.

## Colors

Honey is the light, wax is the room, ink is the voice; everything else is a semantic signal earning its place.

### Primary
- **Mel** (`#FFC200`): the product's single accent and only light source. Primary buttons, the app bar, active hexagons, progress fills, the honey in any illustration. It is a surface color — text sits *on* it, never *in* it.
- **Néctar** (`#FFDE00`): the brighter honey, used for highlight, hover state on primary, success sparkle, and as the one color allowed as text on the dark landing surface (`#FFDE00` on `#111111` passes AA).
- **Âmbar** (`#F4B73E`): honey in shadow. Pressed state of primary controls, inactive hexagons, depth edges, and the focus ring.

### Neutral
- **Cera** (`#FFFDF7`): the app's default surface. Deliberately a warm off-white — pure white vibrates next to this much yellow.
- **Branco** (`#FFFFFF`): raised surfaces only. Cards, sheets and fields sit in white *on* wax, which is how elevation reads before any shadow is applied.
- **Breu** (`#111111`): the landing page's ground. Never `#000000`, because Beenie's black cartoon outline would disappear into it.
- **Tinta** (`#000000`): body and heading text, and the mandatory text color on any honey surface.
- **Tinta suave** (`#4A4A4A`): secondary text, captions, helper copy, resolved metadata.
- **Linha** (`#E8E2D6`): dividers, field borders, empty progress track. Structure you notice only when you look for it.

### Tertiary (semantic only)
- **Acerto** (`#2E9E4F`): correct answers, completed goals, positive net-worth movement.
- **Atenção** (`#E07A1F`): upkeep costs, deadlines closing in, an item about to fall into default.
- **Erro** (`#D93A3A`): validation failure and destructive confirmation. Never used to punish a wrong answer — a wrong answer is a teaching moment, not a red X.

Each semantic also has a darkened **text variant** — acerto-texto (`#268044`), atenção-texto (`#9E5309`), erro-texto (`#C42B2B`) — because the identity values fail AA as small text: measured on wax they land at 3.37:1, 2.96:1 and 4.47:1. The base value paints fills, icons, borders and bars; the text variant carries words. Same hue, enough luminance.

### Named Rules

**The Honey-Is-Light Rule.** Honey is a surface, never a text color on a light ground. `#FFC200` on white fails every WCAG level. Text on honey is always `#000000`. Text on `#111111` is white or `#FFDE00`, and nothing else.

**The One Light Rule.** One honey-filled primary action per screen. If two things on a screen are honey-colored and clickable, the screen has no primary action and the child has to guess.

**The Token-Only Rule.** No literal color value ever appears in an EJS template or an inline style. If a color is needed and no token holds it, the answer is a design decision, not a hex code in markup.

**The No-Gradient Rule.** Zero decorative gradients. When something needs to look brighter, it becomes a solid area of `#FFDE00`.

**The Two-Tone Focus Rule.** The focus indicator is a 2px ink ring hugging the element plus a 3px âmbar outline at 2px offset. Âmbar alone measures 1.77:1 against wax and fails WCAG 2.2's 3:1 floor for focus indicators; the ink ring is what makes it perceivable, and the âmbar band is what makes it ours.

## Typography

**Display Font:** Lilita One (fallback `system-ui, sans-serif`)
**Body Font:** Nunito (fallback `system-ui, sans-serif`)

**Character:** Lilita One is a cartoon poster face — heavy, confident, one weight only — and it carries the mascot's line into the type. Nunito does everything else: rounded terminals, exceptionally legible at small sizes for young readers, and complete Portuguese accent coverage. The two are never confused about their jobs.

### Hierarchy
- **Display** (Lilita One 400, `clamp(2rem, 6vw, 3rem)` = 32→48px, line-height 1.1): page and section titles, hero statements. Never running text.
- **Headline** (Lilita One 400, `clamp(1.5rem, 4vw, 2rem)` = 24→32px, line-height 1.15): screen titles and card group titles.
- **Title** (Nunito 700, `clamp(1.25rem, 2.5vw, 1.5rem)` = 20→24px, line-height 1.25): card headings, item names, question stems.
- **Body** (Nunito 400, `clamp(1rem, 1.2vw, 1.0625rem)` = 16→17px, line-height 1.5): all running text. Cap measure at 65–75 characters; on desktop that means the reading column stops well before the container edge.
- **Label** (Nunito 700, 14px, letter-spacing 0.04em): buttons, field labels, badges, metadata. 14px is the floor — nothing in this product is smaller.
- **Número** (Lilita One 400, `clamp(1.5rem, 4vw, 2rem)`, `font-variant-numeric: tabular-nums`): mel balance, patrimônio, level, streak count.

### Named Rules

**The Two-Jobs Rule.** Lilita One is for section titles and standout numbers only. Running text set in display exhausts a child within a paragraph.

**The Steady-Money Rule.** Every currency and score figure uses tabular figures. A balance whose digits shift width while it animates reads as a bug, not a reward.

**The Sentence-Case Rule.** Sentence case everywhere. Uppercase is allowed only inside a badge of one or two words.

## Layout

**Beever is a cross-platform web product: phone and desktop are both shipping targets.** Layout is authored mobile-first — the 320px base first, breakpoints widening outward — but a screen is not finished until its desktop composition has been designed. A phone layout centered inside a wide empty page is a defect, not a responsive result.

- **Container widths:** 3xl (768px) for single-column reading and task flows such as Metas; 5xl (1024px) for grid surfaces such as the Colmeia, Loja and Painel. Horizontal padding is 24px at every width.
- **Breakpoints:** `sm` 640px, `md` 768px, `lg` 1024px. The observed pattern holds: one column below `sm`, two at `sm`, three at `lg` for catalog grids; split-screen halves (mascot panel + form) appear at `md` and collapse to the form alone below it.
- **Spacing rhythm:** a 4px base with 8 / 16 / 24 / 40 as the working steps and 80px between major landing sections. Card interiors use 24px; page sections breathe at 40px.
- **Density:** low. An app screen that runs past two phone-heights is carrying too much. On desktop the answer to extra room is a wider grid and larger numbers, never more items crammed into the fold.
- **The fixed top strip** (level + XP, mel, patrimônio, sequência) is the app's persistent orientation bar and stays visible without scrolling on the Colmeia.
- **Touch targets** are never smaller than 44×44px, with real space between them, on every breakpoint — including desktop, where the same components serve mouse and touch laptops.

### Named Rules

**The Desktop-Owes-A-Composition Rule.** Every breakpoint above `md` must use its extra width deliberately — a second column, a larger number, a wider trail — or the screen is unfinished.

**The Two-Screens Rule.** If an app screen exceeds two phone viewport heights, remove content before adding scroll.

## Elevation & Depth

Depth is soft and atmospheric, not drawn. This system uses diffuse shadows over white surfaces sitting on wax; it has **deliberately declined** the hard cartoon convention of a 2px black keyline plus a solid offset shadow (`0 4px 0`). No component carries a black outline. That decision is normative here and supersedes the older description in `docs/04-DESIGN-SYSTEM-E-LANDING.md` §2.3.

Layering order, from ground up: wax page (`#FFFDF7`) → white card → shadow. The color change does most of the work; the shadow only confirms it.

### Shadow Vocabulary
- **Repouso** (`box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)`): the default card, shop item, and form panel at rest.
- **Elevado** (`box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)`): hover on an interactive card, and the onboarding panel that owns the screen.
- **Painel** (`box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)`): the single dominant container of a page, such as the Painel shell.
- **Flutuante** (`box-shadow: 0 4px 6px rgb(0 0 0 / 0.1)`): toasts and floating feedback.

### Named Rules

**The Shadow-Is-Not-A-Border Rule.** Shadow communicates that a surface is lifted. It never substitutes for a divider — that is what `#E8E2D6` is for — and it never appears on a flat recessed panel.

**The No-Outline Rule.** No black keylines on buttons, cards, badges or hexagons. The exception is Beenie's own artwork, which carries her outline, and the amber focus ring, which is a state, not a border.

## Shapes

The hexagon is the signature form and it is structural. Content modules (favos), avatars, section icons, the day-picker cards in onboarding, category tabs in the Loja, and the entire progression trail are hexagonal, cut with `clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)` (available as the `.hexagon` / `.hexagon-shape` utility). Vertices read slightly softened rather than needle-sharp.

Rectangles, with generous corner rounding, are reserved for running text, form fields and list rows — anywhere a clipped corner would eat a descender or crowd a label.

Radius scale:
- **Pequeno** (8px): inputs, selects, list rows, small chips.
- **Favo** (20px): buttons, cards, panels — the product's default corner.
- **Pílula** (999px): progress bars, badges, avatars, day dots.

### Named Rules

**The Hexagon-Is-Structure Rule.** If a hexagon appears on a screen, it is holding content or state — a module, an avatar, a step, a category. A hexagon used as loose confetti is a violation.

**The Text-Gets-Corners Rule.** Never clip a paragraph or a form field into a hexagon. Reading surfaces stay rectangular.

## Components

Character across the board: **tactile and playful**. Interactive things lift on hover, sink on press, and numbers count rather than snap. Every state is visible without color alone.

### Buttons
- **Shape:** favo corners (20px), minimum height 48px, label typography (Nunito 700, 14px, +0.04em).
- **Primary:** honey fill (`#FFC200`) with black label. Hover raises to néctar (`#FFDE00`) and lifts 2px; press drops to âmbar (`#F4B73E`) and returns to baseline; disabled holds honey at 40% opacity with `cursor: not-allowed`.
- **Secondary:** white fill on wax, ink label, `#E8E2D6` hairline border. Hover fills to wax.
- **Ghost:** no fill, `#4A4A4A` label, used for "Voltar" and destructive-adjacent actions such as "Sair da conta". Hover darkens to ink.
- **Focus:** the two-tone indicator — 2px ink ring at the element edge plus a 3px âmbar outline at 2px offset — on every variant. `outline: none` without a replacement is forbidden.

### Cards / Containers
- **Corner Style:** favo (20px).
- **Background:** white for raised content; wax (`#FFFDF7`) for recessed panels nested inside a white shell.
- **Shadow Strategy:** *Repouso* at rest, *Elevado* on hover when the whole card is a link or target. Recessed wax panels carry no shadow.
- **Border:** none by default. `#E8E2D6` hairline only where a card sits directly on white and the surface change alone would not read.
- **Internal Padding:** 24px; 32px for a page's dominant panel.

### Inputs / Fields
- **Style:** white fill, `#E8E2D6` 1px border, 8px radius, 48px height, 12px/16px padding, body typography. Label sits above the field in Nunito 700 14px.
- **Focus:** border shifts to honey and the two-tone indicator appears. The indicator is the accessible signal; the border shift is the flourish.
- **Error:** border in `#D93A3A` and helper text in erro-texto (`#C42B2B`), with an icon beside the message — never color alone. The message says what happened and what to do, and it renders inline under the field, not on a separate error page.
- **Disabled:** wax fill, `#4A4A4A` text at reduced opacity.

### App Bar
Honey field (`#FFC200`) spanning the full width, black content, 16px/24px padding. It carries identity plus the persistent economy readout: avatar and nickname on the left, mel balance, patrimônio and the XP track on the right. On the marketing surfaces the bar is replaced by a wax header with the black logo and a one-line tagline over a `#E8E2D6` rule.

### Badges
- **Badge de mel:** néctar pill, black tabular figure, honey-drop icon at 16px. Animates by counting when the value changes.
- **Chip de estado** ("Já possui", "Concluída", category tags): wax pill with `#4A4A4A` label, 14px, sentence case. State chips always pair an icon with the word.

### Progress
Pill track in `#E8E2D6`, honey fill, 12px tall (8px in compact contexts), percentage label rendered *outside* the bar in ink — never yellow text inside the fill. Every progress element answers both "where am I" and "how much is left" in the same glance.

### Trilha de Favos (signature component)
The vertical, serpentine trail of hexagonal modules is the product's signature surface and the clearest expression of the North Star. Four states, each carrying shape, color *and* an icon: **bloqueado** (wax fill, `#4A4A4A` padlock), **disponível** (honey fill, slow 3s float), **atual** (néctar fill with a 3px âmbar ring), **concluído** (âmbar fill with a star). On desktop the trail widens and gains breathing room on either side rather than stretching its cells.

### Mascote (signature component)
Beenie appears in fixed poses — neutral, celebrating, thinking, sad, pointing — drawn from the real PNGs in `src/public/img/`. Her idle animation is a 3s ease-in-out float of ±10px; her wings flap at 0.3s when she reacts. Over dark surfaces she is always placed on a light shape (a honey hexagon or a splash of light) so her black outline never dissolves into the ground.

### Estado vazio
Never a bare "nothing here". An empty state is Beenie plus one sentence plus one action, in that order — "Seu inventário está vazio. Sua primeira compra pode ser um patinete por 200." — sitting inside a wax recessed panel.

## Do's and Don'ts

### Do:
- **Do** put every color through a token. Mel `#FFC200`, Néctar `#FFDE00`, Âmbar `#F4B73E`, Cera `#FFFDF7`, Breu `#111111`, Tinta `#000000` / `#4A4A4A`, Linha `#E8E2D6`, plus the three semantics — nothing else exists.
- **Do** set black text on every honey surface, and white or `#FFDE00` on `#111111`.
- **Do** give each screen exactly one honey-filled primary action, sized as the largest tappable thing on it.
- **Do** use the hexagon structurally — modules, avatars, section icons, steps, category tabs, the trail.
- **Do** design the desktop composition of every screen, not just its phone stack; both are shipping targets.
- **Do** render money and scores with `font-variant-numeric: tabular-nums`, as the largest numbers on the screen.
- **Do** pair every state color with an icon and a word, so nothing is carried by color alone.
- **Do** keep touch targets at 44×44px minimum with real spacing, at every breakpoint.
- **Do** use the semantic text variants (`acerto-texto`, `atencao-texto`, `erro-texto`) whenever a semantic color carries words; the base semantics are for fills, icons, borders and bars.
- **Do** show the two-tone focus indicator (2px ink ring + 3px âmbar outline at 2px offset) on every interactive element, and verify the Colmeia and the landing are fully navigable by keyboard alone.
- **Do** animate only `transform` and `opacity`, and let `prefers-reduced-motion: reduce` switch off parallax, loops and reveals while leaving the content complete and the honey column full.
- **Do** write microcopy in active voice and sentence case, verb first, with errors that state what happened and what to do next.

### Don't:
- **Don't** use yellow as a text color on any light surface. It fails WCAG at every level.
- **Don't** draw black keylines around buttons, cards, badges or hexagons — this system carries depth in soft shadow, not outline.
- **Don't** ship decorative gradients. Brightness comes from a solid area of `#FFDE00`.
- **Don't** clip running text or form fields into a hexagon, and don't scatter hexagons as ornament.
- **Don't** substitute Beenie with an emoji, a stock illustration or a generic icon, and don't invent new mascot art — the PNGs in `src/public/img/` are the whole cast.
- **Don't** place Beenie's black outline directly on `#111111` without a light shape behind her.
- **Don't** set running text in Lilita One, and don't go below 14px anywhere.
- **Don't** revive the orphaned shadcn HSL block in `src/styles/tema.css` (`--primary`, `--purple`, `--chart-*`, `.dark`). It is not wired into the Tailwind v4 `@theme`, its purple is not in the identity, and the app has no dark theme — the landing's dark ground is a surface choice, not a mode.
- **Don't** animate `top`, `height`, `margin` or `box-shadow`; it costs frames on the phones this product is used on.
- **Don't** punish a wrong answer with a bare red X. Errors explain, with Beenie, and never remove XP, mel or patrimônio.
