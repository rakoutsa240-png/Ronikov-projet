---
name: landing-page-design
description: "Pleino's rules for building or reviewing a marketing page or page section (home page, Premium, Espace Pro pitch): intake, page structure, conversion copy, states and ship checklist, inside the existing green and gold identity. Use when building a new page or section or reviewing one; not for small edits inside app screens."
---

# Landing page design (Pleino version)

Adapted from `landing-page-design` in [elayadesign/ai-design-skills](https://github.com/elayadesign/ai-design-skills) (MIT). Rules that clash with Pleino were removed or changed: invented content, a fixed font list, a fixed icon set, gradient headings, a fixed dark palette and the mandatory word-by-word tagline animation.

A landing page wins one intent: **one offer → one audience → one primary action.** For Pleino the main action is almost always **Réserver** (book fuel at a station); for the Espace Pro pitch it is becoming a partner station.

Work through Part A before touching Part B.

## What always wins

1. **The user's own words** in the request.
2. **Pleino's identity, "Vert et or"**, defined in `src/index.css`: brand green `brand-*`, flag gold `amber-*` (redefined), green-tinted `neutral-*`, Bricolage Grotesque for headings and Figtree for text, `lucide-react` icons, light theme by default. Never swap the fonts, icons or palette from this skill.
3. **The Hallmark stamp** at the top of `src/index.css`: no tracked capital labels, no eyebrows above headings, a visible focus ring, reduced-motion fallbacks, colours through tokens.
4. **Real content only.** See A6.
5. **Every visible text goes through `t('French sentence')`** with an English entry in `src/locales/en.ts` (`src/i18n.test.ts` fails otherwise).

---

# PART A: Strategy and structure

## A1. Intake

Ask only for what is missing, in one message:

- The ONE primary action, and what counts as a conversion (a booking, a partner request).
- Who it is for: drivers in Lomé, moto-taxi riders, station managers, pompistes.
- Their top objections (is the stock real? is Mixx/Flooz payment safe? will the station honour the ticket?).
- Proof the user can supply: real numbers, real quotes with the person's name and consent, logos the user is allowed to show, photos of real stations.

If the user cannot answer, make a reasonable assumption, state it in one line, and continue. Never fill a gap with an invented fact.

## A2. Page structure

**Above the fold**
1. Headline: outcome plus audience.
2. One sentence that says how.
3. Primary action (Réserver), clear verb plus what they get.
4. One real proof signal, only if one exists (live station count, real prices, live wait times from the API).
5. A real picture: the product itself, a real station, or live data. No empty decorative frames.

**Middle**
6. Problem to solution.
7. Three to five benefits, each an outcome.
8. How it works, in steps.
9. Real proof, only when the user supplied it.

**Bottom**
10. FAQ, six to twelve real questions.
11. Risk reversal that is true (for example the ticket validity and refund terms the app actually applies).
12. Final action, the same as the top.

## A3. Layout

Pick one and say why: classic hero plus sections (most common), long story (when people need convincing), minimal page (a single short offer), comparison page.

## A4. Conversion rules

- One primary action. No competing actions above the fold.
- Benefits first; features explain them.
- Be specific with real figures: "Réservez vos litres en 2 minutes" only if that is measured.
- Put an objection's answer right next to the claim it doubts.

## A5. Copy

- Headline patterns: "{Outcome} sans {pain}", "{Category} pour {audience}".
- Action labels: verb plus what they get ("Réserver mon carburant", "Devenir station partenaire"). Never "En savoir plus" or "Envoyer" alone.
- Sentence case for headings and buttons.
- Calm, specific system messages: "Ticket envoyé au 90 12 34 56." Errors say what failed and what to do next. No exclamation marks.
- Banned filler: révolutionner, booster, de pointe, sans effort, nouvelle génération, "révolutionnaire".

## A6. Content honesty (replaces the original "content realism" rule)

- **Never invent** a testimonial, a person's name, a client logo, a partner brand, a rating, a user count or a metric. Pleino removed all of these in PR #30.
- A missing fact stays absent, or becomes a clearly marked slot for the user to fill (`{/* TODO: vraie citation client */}`) that is not rendered in production.
- Numbers shown to visitors come from the API or from the user.
- Station brand logos: only the official files the user supplied.

## A7. Build order

Hero, benefits, how it works, proof, FAQ, final action. One section at a time, so each diff stays reviewable.

## A8. SEO

Pleino is a single-page app with hash routes. Keep a clear `<title>`, meta description, `og:image` and FAQ in plain question and answer form in `index.html` and the page components.

---

# PART B: Visual rules inside the Pleino system

## B1. Type

- Fonts are the project's: Bricolage Grotesque (headings), Figtree (text), Space Mono only for ticket codes (`.font-code`). Never add a font.
- Use Tailwind's type scale (`text-xs` to `text-6xl`). No new arbitrary sizes like `text-[19px]`.
- No italics in the interface.
- Headings use `text-wrap: balance` and body text `text-wrap: pretty` (set globally in `src/index.css`).
- Prefer three weights at most on a screen.

## B2. Spacing

Use Tailwind's spacing scale (multiples of 4px). Avoid arbitrary values.

## B3. Corner radius

Nested radius: when a shape sits inside another with less than 32px of gap, inner radius = outer radius − gap (only if the result is above 2px).

## B4. Borders and backgrounds

- Borders go all the way around a card or not at all.
- No gradients on backgrounds or headings. Surfaces are flat, from the theme tokens.
- No card inside a card.

## B5. Hero

- Headline and sentence capped around 680px wide, with line breaks where the thought breaks.
- Headline, sentence and Réserver all visible on a 1280 × 800 screen and on a phone without scrolling.
- One colour for the whole headline.

## B6. Icons

`lucide-react`, already installed. Icons are never emojis.

## B7. Motion

- Animate only `transform` and `opacity`. Never `transition-all`, never `width`, `height`, `top` or `left`.
- Decelerating curve for movement: `ease-[cubic-bezier(0.22,1,0.36,1)]`, about 500ms. Hover colour changes 200 to 300ms.
- Every animation has a `motion-reduce:` fallback (a global reduced-motion rule also exists in `src/index.css`).
- Scroll reveals use the existing `.reveal` class (CSS scroll timeline). Never an unthrottled scroll listener.

## B8. States

Every interactive element has hover, active, focus (the global ring), disabled, and where relevant loading (shaped skeletons), empty (a short getting-started view) and error (inline and specific, never `window.alert()`).

No dead links: a link or button pointing nowhere is removed or visibly disabled. The current page is marked in the menu.

## B9. Ship checklist

- Legal links in the footer (`#/conditions`, `#/confidentialite`)
- A branded "page introuvable" view
- Client-side validation on forms (phone format, required fields)
- A "Aller au contenu" skip link for keyboard users
- Favicon, `<title>`, meta description, `og:image`
- Alt text on every meaningful image
- Semantic HTML: `<nav>`, `<main>`, `<section>`
- A way back from every page
- Works on a small phone (320px wide) with no sideways scrolling

---

# Output format for a new page

Before writing code, give in one message: the outline, the hero copy (headline, sentence, action, proof only if real), three to five benefits, the steps, the FAQ, and the layout choice with its reason. Then build section by section.

# Quick checklist

- [ ] One offer, one audience, one action (usually Réserver)
- [ ] Nothing invented: every name, number, quote and logo is real and supplied
- [ ] Vert et or tokens, project fonts, lucide icons
- [ ] Every text through `t()` with an English entry
- [ ] No tracked capitals, no eyebrows, no gradients, no card inside a card
- [ ] Only `transform`/`opacity` animated, with reduced-motion fallbacks
- [ ] All states present, focus ring visible
- [ ] Legal links, skip link, alt text, meta tags, works at 320px
