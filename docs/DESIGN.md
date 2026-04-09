# Design System Document

## 1. Overview & Creative North Star: "The Nocturnal Gala"

This design system moves away from the literal, high-contrast folkloric aesthetic of traditional Mariachi marketing and toward an editorial, boutique experience. Our Creative North Star is **"The Nocturnal Gala."** Imagine the atmosphere of a world-class theater or a private, high-end celebration: the shimmer of brass instruments against deep shadows, the tactile quality of a premium invitation, and the effortless class of a professional ensemble.

We break the "template" look through **intentional asymmetry** and **tonal depth**. Rather than using traditional grids and borders, we use generous whitespace (negative space) and high-contrast typography scales to guide the eye. Elements should feel like they are floating or "staged" rather than trapped in boxes.

---

## 2. Colors: Depth and Metallic Precision

The palette is anchored in the soul of the Mariachi tradition—gold accents against deep charcoal and rich secondary tones.

### Palette Strategy
*   **Primary (`#ffcb46` / `#e1af27`):** Represents the brass and gold embroidery. Use this sparingly for CTAs and highlights.
*   **Surface Hierarchy (`#131313` to `#353535`):** Our charcoal base.
*   **The "No-Line" Rule:** 1px solid borders are strictly prohibited for sectioning. Boundaries must be defined solely through background color shifts. For example, a `surface-container-low` section should sit directly against a `surface` background to define its territory.
*   **The "Glass & Gradient" Rule:** Floating elements (like navigation bars or hovering cards) must utilize Glassmorphism. Use semi-transparent versions of `surface-container` with a `backdrop-blur` of 20px. 
*   **Signature Textures:** For primary buttons, apply a subtle linear gradient from `primary` (`#ffcb46`) to `primary-container` (`#e1af27`) at a 135-degree angle. This adds "visual soul" and mimics the reflection on a polished trumpet.

---

## 3. Typography: The Editorial Voice

We pair the timeless authority of a serif with the modern precision of a sans-serif.

*   **Display & Headlines (Noto Serif):** These are our "Hero" moments. Use `display-lg` for impactful, short statements. The serif font conveys tradition, class, and the musicality of the brand.
*   **Titles & Body (Plus Jakarta Sans):** A clean, high-readability sans-serif. This ensures professionalism and functional clarity.
*   **Hierarchy Note:** Always maintain a high contrast between headline and body sizes. If a headline is `headline-lg`, ensure the body copy is no larger than `body-md` to maintain an editorial, "curated" feel.

---

## 4. Elevation & Depth: Tonal Layering

Depth in this system is a result of light and material, not artificial outlines.

*   **The Layering Principle:** Stack surfaces to create hierarchy. 
    *   *Example:* Place a `surface-container-highest` card on top of a `surface-container-low` background. The natural shift in value creates a "soft lift."
*   **Ambient Shadows:** For floating components, use shadows that are barely perceptible.
    *   **Blur:** 30px - 60px.
    *   **Opacity:** 4% - 8%.
    *   **Color:** Use a tinted version of `on-surface` (warm charcoal) rather than pure black to keep the light feeling natural.
*   **The "Ghost Border" Fallback:** If a border is required for accessibility, use the `outline-variant` token at **15% opacity**. Never use 100% opaque lines.
*   **Immersive Imagery:** Backgrounds should often feature high-quality, desaturated photography with `surface-dim` overlays to allow typography to remain the focal point.

---

## 5. Components

### Buttons
*   **Primary:** Sharp, angular corners (`0`), subtle gold gradient, `on-primary` text.
*   **Secondary:** Ghost style. No background, `outline-variant` (ghost border), `primary` text color.
*   **Tertiary:** Text only with an arrow icon. Use for "Read More" links.

### Cards
*   **Style:** No borders. Use `surface-container-low` for the base. 
*   **Spacing:** Use `spacing-6` (2rem) for internal padding to ensure the content "breathes."
*   **Interactive State:** On hover, shift the background to `surface-container-high` and apply an Ambient Shadow. Do not scale the card; the tonal shift is enough.

### Inputs & Fields
*   **Style:** Bottom-border only (Ghost style) or a very subtle `surface-container-highest` fill.
*   **Focus State:** The bottom border transitions to a `primary` gold glow.

### Signature Component: The "Repertoire Slider"
*   A horizontally scrolling list of services or songs using asymmetrical card sizes. This breaks the rigid grid and makes the user feel they are browsing a bespoke portfolio.

---

## 6. Do's and Don'ts

### Do
*   **Do** use asymmetrical layouts where images bleed off the edge of the screen.
*   **Do** use `display-lg` typography for evocative, emotional hooks (e.g., "A Night to Remember").
*   **Do** prioritize high-quality, warm-toned photography. The visual weight should be 60% imagery, 40% UI.
*   **Do** ensure all interactive elements have a minimum touch target of 44px, despite the minimalist look.

### Don't
*   **Don't** use pure red (`#C51E24`) for anything other than critical error states or very small "live" indicators. It should no longer be a dominant brand color.
*   **Don't** use divider lines to separate list items. Use `spacing-4` (1.4rem) of vertical whitespace instead.
*   **Don't** use standard "drop shadows" with high opacity.
*   **Don't** crowd the interface. If a screen feels full, increase the spacing scale and move content to a secondary layer.