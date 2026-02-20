# Section Styles Refactoring Guide

## Executive Summary

This document analyzes the current section styles in `site.css` and `_section.json`, identifies overlapping/redundant styles, maps which blocks are directly affected by section styles, and provides a migration plan to move block-specific styles to their respective block CSS files.

---

## Table of Contents

1. [Current Section Styles Overview](#current-section-styles-overview)
2. [Style Categories Analysis](#style-categories-analysis)
3. [Overlapping & Redundant Styles](#overlapping--redundant-styles)
4. [Block-to-Section Style Mapping](#block-to-section-style-mapping)
5. [Proposed Simplified Section Styles](#proposed-simplified-section-styles)
6. [Migration Plan](#migration-plan)
7. [Implementation Checklist](#implementation-checklist)

---

## Current Section Styles Overview

### All Section Styles in `_section.json`

| Style Name | Value | Lines in CSS | Purpose |
|------------|-------|--------------|---------|
| Highlight | `highlight` | ~5 | Light background |
| Background Gray | `bg-primary` | ~5 | Dark gray background (#282b3a) |
| Background Green | `bg-secondary` | ~5 | Green background with opacity |
| Home 2 Col Title Text | `home-two-col-title-text` | ~50 | Specific page layout |
| Mission 2 Col Title Text | `mission-two-col-title-text` | ~60 | Specific page layout |
| Text with link icon | `text-with-link` | ~30 | Link styling |
| Image Grid | `image-grid` | ~120 | Grid layout for images |
| Image Grid Color | `image-grid-color` | ~5 | Background color variant |
| 2 Col Video Carousel Left | `video-carousel-left` | ~100 | Split layout left |
| 2 Col Video Carousel Right | `video-carousel-right` | ~80 | Split layout right |
| Express Card | `express-card` | ~5 | Card variant |
| Join CTA Links | `join-cta-links` | ~150 | Full-width CTA layout |
| Advocacy Card | `advocacy-card` | ~15 | Card color variant |
| Grid 3 Columns | `grid-3` | ~80 | 3-column grid (in sovm-cards.css) |
| No Grid (Stacked) | `no-grid` | ~10 | Stacked layout |
| 2 Col Text Carousel | `text-carousel` | ~100 | Text + carousel layout |
| Col Card Image | `col-card-image` | ~40 | Card with background image |
| 2 Col Text Carousel Collab | `text-carousel-collab` | ~25 | Variant of text-carousel |
| 2 Col Lottie Left | `two-col-title-button-text-lottie-left-section` | ~100 | Left panel for 2-col Lottie |
| 2 Col Lottie Right | `two-col-title-button-text-lottie-right-section` | ~80 | Right panel for 2-col Lottie |
| Stay In Know | `stay-in-know` | ~20 | Specific card style |
| 2 Col Lottie Left Variation | `two-col-title-button-text-lottie-left-section-variation` | ~80 | Variant |
| 2 Col Lottie Right Variation | `two-col-title-button-text-lottie-right-section-variation` | ~60 | Variant |
| Row | `row` | ~50 | Flexbox row layout |

**Total: 24 section styles** (~1,200+ lines of CSS)

---

## Style Categories Analysis

### Category 1: Pure Layout Styles (KEEP as Section Styles)
These control only layout behavior and can be composed with other styles:

| Style | Purpose | Composable? |
|-------|---------|-------------|
| `row` | Flexbox row layout | ✅ Yes |
| `grid-3` | 3-column grid | ✅ Yes |
| `no-grid` | Stacked layout | ✅ Yes |

### Category 2: Background/Theme Styles (KEEP as Section Styles)
These control only visual theming:

| Style | Purpose | Composable? |
|-------|---------|-------------|
| `highlight` | Light background | ✅ Yes |
| `bg-primary` | Dark background + white text | ✅ Yes |
| `bg-secondary` | Green background | ✅ Yes |
| `image-grid-color` | Cyan background | ✅ Yes |

### Category 3: Page-Specific Compound Styles (CANDIDATES FOR REMOVAL)
These combine layout + styling + block-specific rules:

| Style | Blocks Affected | Should Move To |
|-------|-----------------|----------------|
| `home-two-col-title-text` | `columns` | `columns.css` as variant |
| `mission-two-col-title-text` | `columns` | `columns.css` as variant |
| `text-with-link` | `columns`, `text` | `columns.css` or `text.css` |
| `image-grid` | `columns`, `sovm-carousel` | `columns.css` + `sovm-carousel.css` |
| `video-carousel-left` | `sovm-carousel`, `icon-button` | New `video-carousel` block |
| `video-carousel-right` | `sovm-carousel` | New `video-carousel` block |
| `text-carousel` | `sovm-carousel`, `icon-button`, `text` | `sovm-carousel.css` as variant |
| `text-carousel-collab` | `sovm-carousel` | `sovm-carousel.css` as variant |
| `join-cta-links` | `icon-button`, `fragment` | New `cta-banner` block |
| `col-card-image` | `fragment` | `fragment.css` |
| `express-card` | `fragment` | `fragment.css` as variant |
| `advocacy-card` | `fragment` | `fragment.css` as variant |
| `stay-in-know` | `fragment` | `fragment.css` as variant |

### Category 4: Two-Column Layout Pairs (CONSOLIDATE)
These are always used together and should be merged:

| Left Style | Right Style | Should Become |
|------------|-------------|---------------|
| `video-carousel-left` | `video-carousel-right` | Single `video-carousel` block |
| `two-col-title-button-text-lottie-left-section` | `two-col-title-button-text-lottie-right-section` | Single `lottie-split` block |
| `two-col-title-button-text-lottie-left-section-variation` | `two-col-title-button-text-lottie-right-section-variation` | Variant of `lottie-split` |

---

## Overlapping & Redundant Styles

### 1. Background Styles That Duplicate Each Other

**`bg-primary` vs `home-two-col-title-text`:**
```css
/* bg-primary */
.section.bg-primary {
    background: rgba(var(--bg-primary-rgb), var(--bg-opacity-primary));
    color: var(--color-text-inverse);
}

/* home-two-col-title-text ALSO sets background */
.section.home-two-col-title-text {
    background-color: var(--bg-primary);  /* REDUNDANT */
    padding-top: 6.375rem;
    padding-bottom: 0;
}
```

**Recommendation:** Remove `background-color` from `home-two-col-title-text` and use `bg-primary` + `home-two-col-title-text` together.

### 2. Padding/Spacing Patterns Repeated

The following breakpoint padding pattern appears **5+ times**:
```css
@media (width >= 36em) { max-width: 30.25rem; }
@media (width >= 48em) { max-width: 43rem; }
@media (width >= 62em) { max-width: 58rem; }
@media (width >= 75em) { max-width: 69.25rem; }
@media (width >= 87.5em) { max-width: 74rem; }
```

Found in:
- Base section styles (lines 64-91)
- `image-grid` (lines 510-538 AND 540-575)
- `row` (in styles.css)

**Recommendation:** Create a CSS custom property or mixin for container widths.

### 3. Two-Column Float Layouts Duplicated

Both `video-carousel` and `two-col-title-button-text-lottie` use the same float-based 50/50 split pattern:
```css
width: 50%;
float: left;
```

**Recommendation:** Create a generic `cols-2-split` section style or use CSS Grid.

### 4. Typography Styles Embedded in Section Styles

`home-two-col-title-text`, `mission-two-col-title-text`, `text-carousel`, and others all define:
- `font-family: "Vulf Sans"`
- `font-weight: 700`
- `font-size` at various breakpoints

**Recommendation:** Use typography utility classes or move to respective blocks.

---

## Block-to-Section Style Mapping

### Which Blocks Are Affected by Each Section Style

| Section Style | Affected Blocks | CSS Selectors |
|---------------|-----------------|---------------|
| `home-two-col-title-text` | `columns` | `.section.home-two-col-title-text .columns > div`, `.columns-wrapper` |
| `mission-two-col-title-text` | `columns` | `.section.mission-two-col-title-text .columns > div > div` |
| `text-with-link` | `columns` | `.text-with-link .columns > div`, `.text-with-link .columns > div > div` |
| `image-grid` | `columns`, `sovm-carousel` | `.image-grid .columns > div > div`, `.image-grid .sovm-carousel-wrapper`, `.section.image-grid .sovm-carousel` |
| `video-carousel-left` | `icon-button`, `sovm-carousel` | `.section.video-carousel-left .icon-button-wrapper` |
| `video-carousel-right` | `sovm-carousel` | `.section.video-carousel-right .sovm-carousel-wrapper`, `.section.video-carousel-right .sovm-carousel` |
| `text-carousel` | `icon-button`, `sovm-carousel` | `.section.text-carousel .icon-button-wrapper`, `.section.text-carousel .sovm-carousel-wrapper`, `.section.text-carousel .sovm-carousel` |
| `text-carousel-collab` | `sovm-carousel` | `.section.text-carousel.text-carousel-collab .sovm-carousel` |
| `grid-3` | `sovm-cards` | `.section.grid-3` (entire style is in sovm-cards.css) |
| `no-grid` | `sovm-cards` | `.sovm-cards-wrapper.no-grid` (in sovm-cards.css) |
| `col-card-image` | `fragment` | `.section.col-card-image .fragment-wrapper` |
| `express-card` | `fragment` | `.section.express-card .fragment-wrapper` |
| `advocacy-card` | `fragment` | `.section.advocacy-card .fragment-wrapper` |
| `stay-in-know` | `fragment` | `.section.col-card-image.stay-in-know .fragment` |
| `join-cta-links` | `icon-button`, `fragment` | `.section.join-cta-links .icon-button-wrapper`, `.section.join-cta-links .fragment-wrapper` |
| `two-col-*-lottie-left-section` | `icon-button`, `cards` | `.two-col-*-left-section .icon-button-wrapper`, `.cards-wrapper` |
| `two-col-*-lottie-right-section` | `cards`, `lottie-player` | `.cards-wrapper`, `.lottie-player-container` |

---

## Proposed Simplified Section Styles

### New `_section.json` Structure

```json
{
  "options": [
    // LAYOUT (pick one)
    { "name": "Row (Side by Side)", "value": "row" },
    { "name": "2 Columns Split", "value": "cols-2-split" },
    { "name": "3 Column Grid", "value": "grid-3" },
    { "name": "Stacked", "value": "stacked" },
    
    // BACKGROUNDS (pick one)
    { "name": "Background Dark", "value": "bg-primary" },
    { "name": "Background Green", "value": "bg-secondary" },
    { "name": "Background Cyan", "value": "bg-cyan" },
    { "name": "Background Light", "value": "bg-light" },
    
    // WIDTH
    { "name": "Full Width", "value": "full-width" },
    { "name": "Narrow", "value": "narrow" },
    
    // LEGACY (for backwards compatibility - migrate over time)
    { "name": "[Legacy] Home 2-Col", "value": "home-two-col-title-text" },
    { "name": "[Legacy] Mission 2-Col", "value": "mission-two-col-title-text" },
    // ... etc
  ]
}
```

### Styles to KEEP (8 total)
1. `row` - Generic row layout
2. `cols-2-split` - NEW: 50/50 split layout
3. `grid-3` - 3-column grid
4. `stacked` / `no-grid` - Stacked layout
5. `bg-primary` - Dark background
6. `bg-secondary` - Green background
7. `bg-cyan` / `image-grid-color` - Cyan background
8. `full-width` - Breaks out of container

### Styles to MIGRATE TO BLOCKS (move CSS to block files)

| Section Style | Target Block | New Block Variant |
|---------------|--------------|-------------------|
| `home-two-col-title-text` | columns | `columns.var-home-intro` |
| `mission-two-col-title-text` | columns | `columns.var-mission-intro` |
| `text-with-link` | columns | `columns.var-text-link` |
| `image-grid` | columns + sovm-carousel | `columns.var-image-grid` |
| `text-carousel` | sovm-carousel | `sovm-carousel.var-text-layout` |
| `text-carousel-collab` | sovm-carousel | `sovm-carousel.var-collab` |
| `col-card-image` | fragment | `fragment.var-card-image` |
| `express-card` | fragment | `fragment.var-express` |
| `advocacy-card` | fragment | `fragment.var-advocacy` |
| `stay-in-know` | fragment | `fragment.var-stay-know` |

### Styles to CREATE AS NEW BLOCKS

| Current Sections | New Block Name | Reason |
|------------------|----------------|--------|
| `video-carousel-left` + `video-carousel-right` | `video-split` | Always used together, complex layout |
| `join-cta-links` | `cta-banner` | Self-contained component |
| `two-col-*-lottie-*` (4 styles) | `lottie-split` | Always used as pairs, complex |

---

## Migration Plan

### Phase 1: Create Block Variants (Non-Breaking)

1. **Add variant classes to blocks** in their existing CSS files
2. **Keep section styles working** as-is
3. Test that both approaches work

Example for `columns.css`:
```css
/* New variant - can be used instead of section style */
.columns.var-home-intro > div {
    display: grid;
    grid-template-columns: 0.5fr 0.5fr;
    /* ... rest of home-two-col-title-text styles */
}
```

### Phase 2: Update Content to Use Block Variants

1. Update Universal Editor component models to expose variants
2. Migrate existing pages to use block variants instead of section styles
3. Validate pages still look correct

### Phase 3: Create New Blocks for Complex Layouts

1. Create `video-split` block from `video-carousel-left/right`
2. Create `cta-banner` block from `join-cta-links`
3. Create `lottie-split` block from `two-col-*-lottie-*`
4. Update content to use new blocks

### Phase 4: Remove Legacy Section Styles

1. Remove migrated styles from `site.css`
2. Remove deprecated options from `_section.json`
3. Update documentation

---

## Implementation Checklist

### Immediate Actions (Low Risk)

- [ ] Add `cols-2-split` as a generic section style
- [ ] Rename `image-grid-color` to `bg-cyan` for consistency
- [ ] Add `full-width` section style
- [ ] Create container width CSS custom properties

### Short-Term (Phase 1-2)

- [ ] Add `var-home-intro` variant to `columns` block
- [ ] Add `var-mission-intro` variant to `columns` block  
- [ ] Add `var-text-link` variant to `columns` block
- [ ] Add `var-card-image` variant to `fragment` block
- [ ] Add `var-text-layout` variant to `sovm-carousel` block
- [ ] Document new variants in block READMEs

### Medium-Term (Phase 3)

- [ ] Create `video-split` block with left/right variants
- [ ] Create `cta-banner` block
- [ ] Create `lottie-split` block with variants
- [ ] Update Universal Editor models

### Long-Term (Phase 4)

- [ ] Deprecate legacy section styles in `_section.json`
- [ ] Remove legacy CSS after migration complete
- [ ] Update all documentation

---

## CSS Line Count Summary

| Category | Current Lines | After Refactor |
|----------|---------------|----------------|
| Base section styles | ~100 | ~100 (keep) |
| Background styles | ~20 | ~30 (expand) |
| Layout styles | ~50 | ~80 (expand) |
| Block-specific (to move) | ~900 | 0 |
| Legacy (to remove) | ~130 | 0 |
| **Total in site.css** | **~1,200** | **~210** |

**Result: ~83% reduction in section-related CSS in site.css**

---

## Appendix: File Reference

### Files That Need Changes

| File | Changes |
|------|---------|
| `styles/site.css` | Remove migrated styles |
| `models/_section.json` | Simplify options |
| `blocks/columns/columns.css` | Add variants |
| `blocks/sovm-carousel/sovm-carousel.css` | Add variants |
| `blocks/fragment/fragment.css` | Add variants |
| `blocks/video-split/` | NEW block |
| `blocks/cta-banner/` | NEW block |
| `blocks/lottie-split/` | NEW block |

### Current CSS Distribution

```
site.css section styles:     ~1,200 lines
├── bg-primary/secondary:       ~10 lines (KEEP)
├── highlight:                   ~5 lines (KEEP)
├── home-two-col-title-text:   ~50 lines (MOVE to columns)
├── mission-two-col-title-text:~60 lines (MOVE to columns)
├── text-with-link:            ~30 lines (MOVE to columns)
├── image-grid:               ~120 lines (MOVE to columns/carousel)
├── video-carousel-*:         ~180 lines (NEW video-split block)
├── two-col-lottie-*:         ~320 lines (NEW lottie-split block)
├── text-carousel:            ~125 lines (MOVE to sovm-carousel)
├── join-cta-links:           ~150 lines (NEW cta-banner block)
├── col-card-image/express/advocacy: ~60 lines (MOVE to fragment)
└── stay-in-know:              ~20 lines (MOVE to fragment)
```
