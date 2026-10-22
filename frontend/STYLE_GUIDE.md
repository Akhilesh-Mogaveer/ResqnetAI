# RESQNET AI — Claymorphism Design System Style Guide

This style guide documents the **Claymorphism Design System** implemented for RESQNET AI. All features, components, and pages adhere to these tokens, utility classes, and styling rules to ensure tactile depth, strong hierarchy, and high contrast.

---

## 1. Design Direction & Core Philosophy

- **Tactile Depth & Physical Contrast:** Surfaces are visibly distinct at a glance. Page background is distinctly cool-tinted (`#D9E0EC`), cards pop forward as soft clay pads (`#EDF1F8`), elevated modals lift higher (`#F7F9FD`), and wells recess deeply (`#CFD7E6`).
- **Strong Clay Shadows:** Dual soft outer shadows (bottom-right dark shadow + top-left crisp highlight) paired with inner bevels using calibrated `rgba(120, 135, 165, ...)` tones.
- **Punchy Color Over Washed-Out Tints:** Core indicators (KPI chips, primary buttons, severity pills, active sidebar links) use solid, vibrant fills with high-contrast text rather than faint, washed-out 10–12% tints.
- **Strict Nesting Limits (Max 2 Levels):** Avoid card-in-card mud. Layouts flow from `Page Background -> Clay Card -> (Optional) Inset Well`. Containers around lists of cards use clean spacing and section headers with colored icon chips, not redundant outer cards.
- **Accessibility & Restraint:** High contrast text (minimum WCAG AA), no dark neon glow halos, no harsh 1px borders, and zero low-contrast text lighter than muted (`#66718A`).

---

## 2. Color Palette & Surfaces

Configured in `tailwind.config.js` and defined in `index.css`:

### Surfaces & Backgrounds
| Surface Token | Hex Value | Tailwind Class | Description & Role |
|---|---|---|---|
| **Page Background** | `#D9E0EC` | `bg-background` | Visibly tinted canvas with subtle vertical gradient (`#E1E7F1` to `#D3DBE9`) |
| **Card Surface** | `#EDF1F8` | `bg-surface-card` | Tactile level-1 clay pads for dashboard panels, metrics, and incident cards |
| **Elevated / Modal** | `#F7F9FD` | `bg-surface-elevated` | Elevated modal dialogs, flyout drawers, and raised segmented thumbs |
| **Inset Well** | `#CFD7E6` | `bg-surface-inset` / `bg-surface-well` | Recessed wells, form inputs, search bars, and thumbnail frames |

### Typography & Contrast
| Text Token | Hex Value | Tailwind Class | Usage & Contrast Rules |
|---|---|---|---|
| **Primary Text** | `#111A2B` | `text-text-primary` | Headings, titles, KPI values, primary labels (12.5:1 on card) |
| **Secondary Text** | `#3E4A60` | `text-text-secondary` | Body text, descriptions, section subtitles, active badges |
| **Muted Text** | `#66718A` | `text-text-muted` | Minimum threshold for timestamps, captions, units. Nothing lighter anywhere |

### Brand Colors
| Brand Token | Hex Value | Tailwind Class | Usage |
|---|---|---|---|
| `brand-primary` | `#4F6BED` | `bg-brand-primary` | Primary buttons, active sidebar item, brand indicators |
| `brand-hover` | `#3F57D1` | `hover:bg-brand-hover` | Interactive hover transitions |
| `brand-50` | `#EEF2FD` | `bg-brand-50` | Flat soft badges and table headers |

### Solid Severity Tokens
Severity indicators use solid fills with white or dark text:

| Severity Level | Solid Color | Text Color | Tailwind Classes |
|---|---|---|---|
| **Critical** | `#E5484D` | `#FFFFFF` (white) | `bg-severity-critical text-white font-bold` |
| **High** | `#F5A524` | `#111A2B` (dark) | `bg-severity-high text-text-primary font-bold` |
| **Medium / Moderate** | `#4F6BED` | `#FFFFFF` (white) | `bg-severity-medium text-white font-bold` |
| **Low** | `#7B8794` | `#FFFFFF` (white) | `bg-severity-low text-white font-bold` |
| **Success / Verified** | `#2FB67C` | `#FFFFFF` (white) | `bg-severity-success text-white font-bold` |

---

## 3. Stronger Shadows Scale

Defined in `index.css` and `tailwind.config.js` using `rgba(120, 135, 165, ...)`:

### `.clay-card` (Level 1 Surface)
```css
box-shadow: 
  10px 10px 24px rgba(120, 135, 165, 0.45),
  -8px -8px 20px rgba(255, 255, 255, 0.85),
  inset 2px 2px 3px rgba(255, 255, 255, 0.70),
  inset -3px -3px 6px rgba(120, 135, 165, 0.18);
```

### `.clay-card-interactive`
- Adds hover lift (`transform: translateY(-2px)`) with shadow expansion.

### `.clay-inset` (Recessed Wells & Inputs)
```css
box-shadow: 
  inset 5px 5px 10px rgba(120, 135, 165, 0.40),
  inset -5px -5px 10px rgba(255, 255, 255, 0.80);
```

### `.clay-button` (Tactile Action)
```css
box-shadow: 
  4px 4px 10px rgba(120, 135, 165, 0.40),
  -3px -3px 8px rgba(255, 255, 255, 0.90),
  inset 1px 1px 2px rgba(255, 255, 255, 0.80),
  inset -1px -1px 3px rgba(120, 135, 165, 0.20);
```

### `.clay-button-primary` (Solid Brand Action)
- Solid `#4F6BED` background, white text.
- Puffy shadow: `0 4px 14px rgba(79, 107, 237, 0.40), inset 0 2px 3px rgba(255, 255, 255, 0.45)`.

### `.clay-modal` / `.clay-card-elevated`
```css
box-shadow: 
  14px 18px 40px rgba(120, 135, 165, 0.50),
  -10px -10px 28px rgba(255, 255, 255, 0.95),
  inset 2px 2px 4px rgba(255, 255, 255, 0.80);
```

---

## 4. Typography Hierarchy & Sizing

- **KPI Numbers:** `text-[32px]` to `text-[34px] font-black` (`font-mono` or `font-sans`).
- **Page Titles:** `text-2xl` to `text-[28px] font-black tracking-tight text-text-primary`.
- **Section Headers:** `text-sm sm:text-base font-bold text-text-primary`.
- **Body & Descriptions:** `text-sm text-text-secondary`.
- **Labels & Badges:** `text-xs font-semibold` (minimum 12px for standard labels, 10-11px only for compact badges).
- Titles are visually much heavier than metadata so information hierarchy is immediately obvious.

---

## 5. Nesting & Density Rules

1. **Maximum 2 Levels:**
   - Level 0: `#D9E0EC` Page Background
   - Level 1: `#EDF1F8` Clay Card
   - Level 2: `#CFD7E6` Inset Well (inputs, telemetry wells, thumbnail frames)
2. **No Outer Card Wrappers:**
   - Remove `clay-card` containers around rows or grids of cards (e.g. Summary KPI row, Equity Monitor, Incident feeds, Coordinator attention row). Use plain spacing (`gap-5`) and section headers.
3. **No Double Shadows on Small Tags:**
   - Chips and tags inside clay cards must use flat tinted fills (e.g., `bg-emerald-100 text-emerald-800`), without `shadow-clay-pill` to eliminate shadow mud.
4. **Spacing & Density:**
   - Standard card padding: `p-5`.
   - Grid spacing between cards: `gap-5`.
   - Keep key operational information above the fold on Overview.

---

## 6. Map & Images

1. **Leaflet Basemaps:**
   - Default basemap: **Esri World Imagery (High-Resolution Satellite)**.
   - Alternatives available via the layer switcher: **OpenStreetMap Streets** and **Esri World Topo (Terrain)**.
   - No external API key required; zero watermarks.
2. **Incident Thumbnails:**
   - 16px clay-inset framing: `p-1 bg-surface-inset rounded-[16px] shadow-clay-inset` with inner image `rounded-[12px]`.
