# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary user: a child or teenager from 6 to 15 years old**, using the product on a phone, on their own, in short sessions (5, 10, or 20 minutes) on the weekdays they themselves picked during onboarding. They are not there because someone assigned homework — they are there because the loop is fun, and the financial learning arrives through the consequences of their choices.

The audience splits into three difficulty bands, chosen at onboarding, which change how much text a screen may carry, which mechanics are active, and how large rewards are:

| Band | Internal name | Age | Content characteristics |
|---|---|---|---|
| A | Explorador | 6–8 | Minimal text, heavy icon/audio, whole-number currency, no item maintenance, no penalties |
| B | Aprendiz | 9–11 | Simple budgeting, saving toward a goal, first notions of interest |
| C | Investidor | 12–15 | Compound interest, asset vs. liability, passive income, long-term planning |

**Secondary audience: the parent or guardian**, who never uses the app itself but must authorize the child's registration and decide the product is trustworthy. They read the public landing page, specifically a section written in an adult, sober tone, and they care about three things: what the child actually learns, LGPD compliance, and the absence of real money and advertising.

By the TCC delivery, both real usage and the presentation matter: a real group of children in the 6–15 range will create accounts and use the product before delivery, and the evaluation board will see it demonstrated afterward. Neither seeded demo data nor a working first-run flow can be sacrificed for the other.

## Product Purpose

Beever teaches financial literacy to children and teenagers by turning abstract concepts — saving, budgeting, interest, asset vs. liability, net worth — into a game loop with visible progression.

Core loop: **Activities/Games → XP / Pólen / Mel → Loja → Inventário → Patrimônio → new stages unlocked.**

Success is a child who keeps returning on the days they chose, and whose *patrimônio* (net worth) grows because they understood why a house appreciates and a car does not — not because they memorized a quiz answer.

## Positioning

Beever is not a quiz with points. It is a **simulated financial life**: what the child buys has lasting consequence. A car depreciates and charges maintenance; a house appreciates; a business generates passive income. Net worth is the real scoreboard, and it is the only number that carries the pedagogy.

Two further positions a neighboring product could not truthfully copy:

- **A fair streak.** The streak only advances or breaks on the days the user themselves marked as available. Activity on an unmarked day still earns XP and mel but is neutral for the streak. The product refuses to manufacture guilt to drive engagement.
- **Goals sized to the child's real availability.** The number of active goals, their deadline, their difficulty, and their reward multiplier are all derived from how many days per week the child said they can play (1–2 days → 1 goal, 28-day deadline, 2.0× reward; 3–4 days → 2 goals, 14 days, 1.5×; 5–7 days → 3 goals, 7 days, 1.0×). Changing availability later recalculates goals without losing progress already made.

Nothing is ever punitive: an expired goal is offered for renewal at half reward, never by removing XP, mel, or net worth.

## Operating Context

Beever is a **cross-platform web application**: it must work properly both on a desktop computer and on a phone, always as the web. Mobile-first describes the order in which layout is written — the narrow-screen base first, breakpoints widening from there — never a licence to ship a screen that only makes sense on a phone and sits stretched or empty on a desktop. Every screen owes the desktop a composition that was actually designed: container width, real use of the columns, appropriate density. A future native mobile app is not the current target and must not steer decisions now.

The usage scene is short bursts, often on a mediocre connection. The eight-year-old test governs every screen: *does a child of eight understand what to do here in three seconds?*

The user's journey through the product:

```
LANDING (public, animated)
   └─ CTA "Começar"
LOGIN / REGISTRO
   └─ registration → guardian consent
ONBOARDING (blocking)
   nickname → age band → AVAILABLE DAYS → session length
   → initial objective → avatar → automatic goal generation
COLMEIA (Home)
   level+XP · mel · patrimônio · sequência · nearest goal (%+prize)
   · honeycomb trail · today's tasks · cycle events · [Continuar]
      ├─ FAVO → CÉLULA → JOGO → RESULT (stars, XP, mel, pólen)
      ├─ LOJA (balance + net worth at the top)
      │     └─ item → confirmation explaining impact → purchase → INVENTÁRIO
      ├─ INVENTÁRIO (assets vs. cosmetics, current value, income/cost)
      ├─ COFRE (deposit, withdraw, goal, projection)
      └─ PERFIL (edit availability → recalculates goals)
```

Three moments are pedagogically load-bearing and must exist as real screens, not afterthoughts: the **end-of-cycle weekly summary** (yield, costs, passive income, net worth movement), the **return after absence** (a welcoming screen explaining what happened, with an adjusted goal — never a zeroed streak with no explanation), and the **guided first purchase** (the mascot explaining, in three steps, the difference between an item that appreciates, one that costs, and one that generates income).

## Capabilities and Constraints

**Confirmed product terminology** — this vocabulary is the UI language, in Portuguese, and must not be translated or paraphrased in the interface:

| UI term | Technical concept |
|---|---|
| **Colmeia** | Home / user hub |
| **Favo** | Content module/world (hexagonal block) |
| **Célula** | Individual activity/lesson inside a favo |
| **Mel** | Currency spent in the shop (`coins`) |
| **Pólen** | Progress points from tasks and goals (`points`) |
| **Néctar/XP** | Experience that raises the level (`xp`) |
| **Sequência** | Streak, counted only on chosen days |
| **Cofre** | Simulated savings with yield |
| **Patrimônio** | Wallet + Cofre + current value of owned goods |

**Confirmed functionality:** authentication with guardian consent; blocking onboarding; Colmeia; content trail of favos and células; interactive games (quiz, budget builder, compound-interest vault); goals and streak; shop, inventory, net worth, and cofre; daily tasks; profile; admin area; public landing page.

**Hard product constraints:**

- Three rewards — XP, pólen, mel — are independent and never convert into one another. XP is never spent or lost.
- Mel never goes negative; game money is always integers, never floats.
- Every reward value comes from database configuration per activity type and age band, never hardcoded.
- Reward calculation happens exclusively on the server, from the recorded game session. The client sends answers, never a score.
- Repeating a completed célula yields 25% XP and zero mel, to prevent farming.
- Band A (6–8) has depreciation, maintenance cost, and default penalties switched off entirely.
- Cosmetic items never count toward net worth.
- A purchase stores the price paid at purchase time and never recalculates it from the current item price.
- Every change to XP, pólen, mel, every purchase, and every admin action is written to an audit log.
- The parent/guardian dashboard is out of MVP scope but modeled in the database for later.
- **No real money, ever** — permanently out of scope. The UI must state explicitly that the currency is fictional. No advertising, no real-spend mechanic, no paid random loot box.
- LGPD (Art. 14) minimal data collection for minors: nickname and avatar only, no sensitive data. Guardian consent at registration (checkbox + guardian e-mail in the MVP).

**Technical constraints:** server-rendered EJS, no SPA and no view bundler; Tailwind CLI for CSS; game interactivity is plain JavaScript on the page. Performance budget for the landing page: LCP ≤ 2.5s on simulated 4G, CLS ≈ 0, 60 fps scrolling, no image above 200 KB, total landing JS under 30 KB uncompressed. App pages respond in ≤2s, games in <1s.

## Brand Commitments

**The visual identity already exists and is not up for redefinition.** Design work happens *inside* it.

- **Name:** Beever. **Mascot:** *Beenie*, a bee. The existing PNGs in `src/public/img/` are the definitive art — `beenie_howdy.png`, `beenie_login.png`, `beenie_login_render.png`, `beenie_vem.png`, `beenie_1real.png`, `babybee.png`, plus `1real.gif`. Use only the art that exists; never substitute the mascot with an emoji or a generic icon. Missing assets are to be listed for the user to provide, not invented.
- **Logos:** `beever_logo_black.png`, `beever_logo_white.png`, `beever_logo_yellow.png`, `beever-icon.png`. Currency icon: `mel-moeda-virtual.png`.
- **Palette (fixed):** Mel `#FFC200` (primary), Néctar `#FFDE00` (highlight), Âmbar `#F4B73E` (depth/solid button shadow), white `#FFFFFF`, black `#000000` (cartoon outline and text). Permitted derivatives are neutrals and semantics only — never a new brand color: app light surface `#FFFDF7`, landing dark surface `#111111`, secondary text `#4A4A4A`, divider `#E8E2D6`, success `#2E9E4F`, warning `#E07A1F`, error `#D93A3A`.
- **Non-negotiable contrast rule:** yellow is never used as a text color on white.
- **Surface contrast between landing and app is intentional:** the landing is dark, the app is light. Entering the app should feel like turning the lights on.
- **Voice:** active voice, verb first ("Continuar", "Guardar no cofre", "Comprar casa pequena"). An action's name never changes mid-flow. Errors state what happened and what to do ("Faltam 200 de mel. Conclua 2 atividades para chegar lá."), never "operação inválida". Empty states are invitations. Zero unexplained jargon — "Patrimônio" appears the first time with a one-line explanation: "tudo o que você tem somado".

The detailed design system, component inventory, and landing-page structure live in `docs/04-DESIGN-SYSTEM-E-LANDING.md`.

## Evidence on Hand

- **Real assets:** the twelve mascot, logo, and currency images in `src/public/img/` listed above. These are the only image assets that exist.
- **Statistics on financial literacy in Brazil:** the user has real sources and will supply them when the landing page is built. Until they are supplied, no figure may be written into the page — placeholders must be explicit and flagged, never plausible-looking invented numbers.
- **TCC institution and credits:** known to the user and to be supplied for the landing footer. Do not guess an institution name.
- **Seeded shop catalog:** six items exist via `scripts/seed.js`, spanning housing (appreciates), transport (depreciates + upkeep), technology (depreciates fast), business (generates income), cosmetics (neutral, excluded from net worth), and utilities (consumable).
- **No testimonials, no user counts, no press, no pricing, no partnerships exist.** None may be fabricated for any surface.

## Product Principles

1. **Consequence is the lesson.** Every purchase, deposit, and skipped week must show its effect on net worth in a way a child can read. If a screen hides the consequence, it has failed regardless of how good it looks.
2. **Never punish; always offer a way forward.** Expired goals, broken streaks, and long absences get an explanation and an adjusted path, never subtraction of XP, mel, or net worth.
3. **The child sets the pace.** Availability chosen in onboarding governs goals, deadlines, rewards, and the streak. The product adapts to the child's week, not the reverse.
4. **Three seconds, on a phone, at eight years old.** Comprehension speed is the acceptance criterion for every screen; the age band decides how much text is even allowed.
5. **The money is fictional and the product says so.** No real transactions, no advertising, no dark pattern, minimal data from minors — stated plainly in the interface, not buried in terms.

## Accessibility & Inclusion

Required floor, verified rather than estimated:

- Mobile-first, fully functional from 320 px up to large desktop screens — both are shipping targets, neither is an afterthought.
- AA contrast minimum (4.5:1 for text) on every color pair. Yellow is never text on white.
- Touch targets ≥ 44×44 px, with spacing between them.
- Keyboard navigation with visible focus in the brand's own line — a 3 px amber ring, never `outline: none`. Both the landing and the Colmeia must be navigable end to end with the keyboard alone.
- Drag-and-drop games must have an equivalent click and keyboard path.
- Nothing is communicated by color alone — icon plus text.
- `prefers-reduced-motion` disables parallax and all non-essential animation; the landing must remain fully usable with motion off.
- Language suited to the age band: short sentences, active voice, no unexplained financial jargon.
- Semantic HTML: `<button>` for actions, `<a>` for navigation, `<h1>`–`<h3>` in order; informative images carry descriptive `alt`, decorative ones `alt=""`.
