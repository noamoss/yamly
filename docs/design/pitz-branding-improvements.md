# How to Maintain Pitz Branding but Improve the Look

This guide captures a UI/UX review of the yamly app (at the time of the Pitz branding pass) and gives actionable directions to improve the look while keeping The Pitz Studio branding intact. Use it as the source of truth when refining the UI.

---

## 1. Branding constraints to preserve

When making visual changes, keep these fixed:

- **Palette**
  - Page background: `#E8DCC4` (warm beige) — `--background` in [ui/app/globals.css](../../ui/app/globals.css)
  - Primary text: `#1A1A1A` — `--foreground` / `--brand-text`
  - Secondary text: `#6C6C6C` — `--brand-secondary`
  - Accent (sparingly): `#9DC9B8` (sage) — `--brand-accent`
  - Primary CTAs: `#000000` background, white text — `--brand-cta-bg` / `--brand-cta-text`
  - Cards/surfaces: white `#FFFFFF` — `--brand-background`
- **Typography:** Instrument Serif (headings), Work Sans (body). Loaded in [ui/app/layout.tsx](../../ui/app/layout.tsx). Keep JetBrains Mono for code.
- **Credit footer:** The floating “The Pitz Studio” link in the bottom-right ([ui/components/BrandingBubble.tsx](../../ui/components/BrandingBubble.tsx)) is required; do not remove or move it. See the Pitz skill “Credit Footer” spec for styling.
- **Shadows and cards:** Subtle shadow `0 4px 12px rgba(0,0,0,0.08)` is the standard card shadow; you may introduce a second, stronger shadow only for primary content (see improvement 3).

Reference: [The Pitz Studio brand skill](file:///Users/noam/.cursor/skills/thepitz-branding/SKILL.md) and [ui/app/globals.css](../../ui/app/globals.css).

---

## 2. Current issues (expert review summary)

These are the main issues identified with the current look so you know what to improve:

1. **Full-page beige with no relief** — The whole page uses the same beige background. There’s no variation (e.g. a clear content band or alternate background), so the beige dominates and feels flat.
2. **No elevation hierarchy** — Almost every surface uses the same shadow. Nothing reads as “closer” or “primary,” so the layout feels flat.
3. **Weak typographic hierarchy** — The app title (“YAML Diff Viewer”) and section title (“What is yamly?”) are similar in size/weight. There’s no clear step-up (e.g. 2xl/3xl for the app name). Most body copy is small, so the page reads as one level.
4. **Secondary controls look samey and low-contrast** — Test API, Help, and Export use similar gray/sage tints. Only “Run diff” reads as primary. Secondary actions don’t feel intentionally tiered.
5. **Inconsistent use of sage and off-brand color** — Sage is used in many places without a clear rule. The “Input Requirements” accordion in the demo section still uses hardcoded blue (`text-blue-900`, `bg-blue-100`, etc.), which clashes with the Pitz palette.

---

## 3. Improvement directions with implementation notes

Follow these directions one by one (or in small batches) to improve the look without breaking branding.

### 3.1 Tame full-page beige with clear content bands

- **What to do:** Keep `#E8DCC4` as the page background, but make most of the visible UI sit in a dominant “content” band (white or very light tint) so beige acts as a frame, not the main field.
- **Where to change:** [ui/app/page.tsx](../../ui/app/page.tsx). Wrap the main content (e.g. from the tabs down, or from the demo section down) in a wrapper that uses `bg-[var(--brand-background)]` (or a very light tint). Keep the header and BrandingBubble placement and styling as-is.
- **Concrete hint:** Add a main content wrapper with `bg-[var(--brand-background)]` and max-width; keep beige only on `body` or as outer margins/sides so the center reads as a clear content band.

### 3.2 Increase header and section typography contrast

- **What to do:** Give the app a clear top level (e.g. “YAML Diff Viewer” larger and in Instrument Serif). Make “What is yamly?” clearly secondary. Add one more step for body (e.g. intro at `text-base`, captions at `text-sm`).
- **Where to change:** [ui/app/page.tsx](../../ui/app/page.tsx) for the app title; [ui/components/DemoSection.tsx](../../ui/components/DemoSection.tsx) for “What is yamly?” and section headings.
- **Concrete hint:** Use `text-2xl` or `text-3xl` with Instrument Serif for “YAML Diff Viewer”; use `text-lg` or a different weight/color for “What is yamly?” so hierarchy is obvious.

### 3.3 Vary card elevation instead of one shadow

- **What to do:** Keep the current shadow for most cards. Introduce a stronger shadow only for 1–2 key surfaces (e.g. main editor container or the primary “Run diff” card) so primary content reads as elevated.
- **Where to change:** [ui/app/globals.css](../../ui/app/globals.css) — add a second variable, e.g. `--shadow-primary: 0 8px 24px rgba(0,0,0,0.12)`. Apply it only to the main content card(s) in [ui/app/page.tsx](../../ui/app/page.tsx) and/or the editor/diff container.
- **Concrete hint:** Leave header and small UI cards with the existing lighter shadow; use the new variable only for the main content area so elevation hierarchy is clear.

### 3.4 Tier secondary buttons and links

- **What to do:** Keep black for the single primary CTA (“Run diff”). Define two tiers: (1) “tool” actions (e.g. Test API, Export) with slightly stronger treatment; (2) “support” actions (e.g. Help, doc links) with a lighter treatment (e.g. text + hover only). Use the same palette; differentiate by contrast and weight.
- **Where to change:** [ui/app/page.tsx](../../ui/app/page.tsx) for header buttons; any component that renders secondary actions.
- **Concrete hint:** Tool actions: border or background at 25–30% opacity (sage or gray). Support actions: text color + hover underline or light background, no heavy border.

### 3.5 Replace blue in Input Requirements with brand colors

- **What to do:** Remove all blue from the “Input Requirements” accordion so it uses only Pitz tokens.
- **Where to change:** [ui/components/DemoSection.tsx](../../ui/components/DemoSection.tsx). Find the expanded content for `expandedSection === "requirements"` and all nested blocks that use `text-blue-900`, `text-blue-800`, `bg-blue-100`, `text-blue-600`, etc.
- **Concrete hint:** Replace with `--foreground` / `--brand-secondary` for text and `--brand-accent` (or `--brand-accent/10`–`/20`) for backgrounds and bullets. Keep structure and copy; only swap colors.

### 3.6 Add subtle background variation in the main area

- **What to do:** Within the main content band, add one level of separation using existing palette only (e.g. very light sage tint for the demo strip, or a light gray tint for the editor area).
- **Where to change:** [ui/app/page.tsx](../../ui/app/page.tsx) and/or [ui/components/DemoSection.tsx](../../ui/components/DemoSection.tsx). Use CSS variables with low opacity (e.g. `bg-[var(--brand-accent)]/5`).
- **Concrete hint:** Avoid new hex colors; use `--brand-accent` or `--brand-secondary` at 3–5% opacity so it still reads as Pitz.

### 3.7 Tighten spacing rhythm and breathing room

- **What to do:** Slightly increase vertical spacing between major sections (e.g. demo block vs editor) and give the editor grid a bit more vertical padding so the two columns don’t feel cramped.
- **Where to change:** [ui/app/page.tsx](../../ui/app/page.tsx) — main content wrapper and spacing between sections; [ui/app/globals.css](../../ui/app/globals.css) if you add spacing utilities.
- **Concrete hint:** Add `mb-10` or a spacer between the demo section and the main content; increase padding around the editor grid. Keep existing gaps inside components; only adjust between big blocks.

### 3.8 Use sage deliberately for “active” and key emphasis

- **What to do:** Define a simple rule: sage for “selected/active” and for one level of emphasis (e.g. selected tab, selected example card, primary focus ring). Use gray (`--brand-secondary`) for neutral borders and secondary text.
- **Where to change:** [ui/app/page.tsx](../../ui/app/page.tsx) (tabs); [ui/components/DemoSection.tsx](../../ui/components/DemoSection.tsx) (example cards); [ui/components/ModeSelector.tsx](../../ui/components/ModeSelector.tsx); focus styles in [ui/app/globals.css](../../ui/app/globals.css).
- **Concrete hint:** Apply sage consistently for active/selected states and one level of emphasis; use gray for everything else neutral so the accent feels intentional.

---

## 4. Implementation checklist

Use this checklist when implementing the improvements (e.g. one item per PR or batch a few together):

- [ ] **Content band** — Main content area on white/light band; beige as frame
- [ ] **Header typography** — Larger Instrument Serif app title; clear section hierarchy
- [ ] **Elevation variation** — Second shadow variable for primary content only
- [ ] **Button tiers** — Tool vs support secondary actions; same palette, different weight/contrast
- [ ] **Remove blue** — Replace all blue in DemoSection Input Requirements with brand tokens
- [ ] **Background variation** — One subtle tint (accent or gray) in main area
- [ ] **Spacing** — More vertical space between major sections and in editor area
- [ ] **Sage-for-active** — Consistent rule: sage = active/emphasis; gray = neutral

---

## References

- [The Pitz Studio brand guidelines](file:///Users/noam/.cursor/skills/thepitz-branding/SKILL.md) (skill)
- [ui/app/globals.css](../../ui/app/globals.css) — CSS variables and base styles
- [ui/app/layout.tsx](../../ui/app/layout.tsx) — Fonts and root layout
- [ui/app/page.tsx](../../ui/app/page.tsx) — Main page structure and header
- [ui/components/DemoSection.tsx](../../ui/components/DemoSection.tsx) — Demo strip and Input Requirements accordion
