# SOVM Authoring Style Sheet

## Overview

This guide documents all available styles, variants, and configuration options for authoring pages in the SOVM AEM Edge Delivery Services site. Use this as a reference when building pages in the Universal Editor.

---

## Table of Contents

1. [Page Settings](#page-settings)
2. [Section Styles](#section-styles)
3. [Block Reference](#block-reference)
   - [SOVM Hero](#sovm-hero)
   - [Spacer](#spacer)
   - [Columns](#columns)
   - [Video](#video)
   - [Fragment](#fragment)
   - [SOVM Carousel](#sovm-carousel)
4. [Page Templates](#page-templates)
   - [Mission Page](#mission-page)
   - [Resource Page](#resource-page)
   - [Self Expression Page](#self-expression-page)
   - [Advocacy Page](#advocacy-page)
   - [Our Mission Our Movement Page](#our-mission-our-movement-page)
   - [Collab Page](#collab-page)
5. [Best Practices](#best-practices)

---

## Page Settings

Configure these settings at the page level in the Universal Editor.

| Setting | Options | Description |
|---------|---------|-------------|
| **Title** | Text | Page title for SEO and browser tab |
| **Description** | Text | Meta description for SEO |
| **Keywords** | Text (multi) | SEO keywords |
| **Page Background Color** | Default, Background Dark, Background Green, Background Cyan | Sets the overall page background |
| **OneTrust Domain Script ID** | Text | Cookie consent ID (set on home page only) |

### Page Background Options

| Option | Value | Use Case |
|--------|-------|----------|
| Default | (none) | Standard white/light background |
| Background Dark | `bg-primary` | Dark gray background (#282b3a) with white text |
| Background Green | `bg-secondary` | Green background with opacity |
| Background Cyan | `image-grid-color` | Cyan/teal accent background |

---

## Section Styles

Sections are containers that hold blocks. Apply styles to control layout and appearance.

### Layout Styles

| Style | Value | Description |
|-------|-------|-------------|
| **Side by Side** | `side-by-side` | Places child blocks in a horizontal row (50/50 split on desktop, stacked on mobile) |
| **Side by Side (large)** | `side-by-side-large` | Larger variant of side-by-side layout with more spacing |
| **Grid 3 Columns** | `grid-3` | Arranges child blocks in a 3-column grid |

### Background Styles

| Style | Value | Description |
|-------|-------|-------------|
| **Background Image** | `bg-image` | Allows section to have a background image. Requires 2 Image components: first for desktop, second for mobile |

### Hero Section Styles

| Style | Value | Description |
|-------|-------|-------------|
| **Hero with Title and Card** | `hero-title-card` | Full-width hero with title overlay and card element |
| **Hero with Card** | `hero-card` | Hero layout with card overlay |

### Combining Styles

You can combine multiple section styles. Common combinations:

| Combination | Use Case |
|-------------|----------|
| `bg-image` + `hero-card` | Background image hero with overlay card |
| `side-by-side` + any background | Two-column layout with background color |

---

## Block Reference

### SOVM Hero

Full-width hero component with video background.

| Field | Type | Description |
|-------|------|-------------|
| Desktop Video URL | Text | Video URL for desktop viewports |
| Mobile Video URL | Text | Video URL for mobile viewports |
| Text | Rich Text | Overlay text content |

**Usage:** Place at the top of the page in its own section.

---

### Spacer

Adds vertical spacing between blocks.

| Size | Value | Height |
|------|-------|--------|
| Small | `s-20` | 20px |
| Medium | `m-54` | 54px (default) |
| Large | `l-70` | 70px |
| XL | `xl-100` | 100px |
| XXL | `xxl-120` | 120px |
| XXXL | `xxxl-140` | 140px |

**Usage:** Place between blocks that need additional vertical spacing.

---

### Columns

Multi-column layout container.

| Field | Type | Description |
|-------|------|-------------|
| Columns | Number | Number of columns (default: 2) |
| Rows | Number | Number of rows (default: 1) |
| Variant | Select | Style variant |

#### Column Variants

| Variant | Value | Description |
|---------|-------|-------------|
| Default | (none) | Basic column layout |
| Two Column Text | `var-two-col-text` | Optimized for title in left column, body text in right column |
| Text with Link Icon | `var-text-link` | Column layout with link icon styling |
| Image Grid | `var-image-grid` | Grid optimized for image content |

**Column Children:** Each column can contain: Text, Image, Button, Title

---

### Video

Embedded video player with placeholder.

| Field | Type | Description |
|-------|------|-------------|
| Video URL | Text | URL to the video file |
| Placeholder Image | Reference | Image shown before video plays |
| Caption | Text | Video caption text |
| Styles | Multi-select | Size variant |

#### Video Styles

| Style | Value | Description |
|-------|-------|-------------|
| Default | (none) | Standard size video player |
| Full Width | `large` | Full-width video player |

---

### Fragment

Reusable content component that references external content.

| Field | Type | Description |
|-------|------|-------------|
| Reference | AEM Content | Path to the fragment content |
| Variant | Select | Display variant |

#### Fragment Variants

| Variant | Value | Description | Use Case |
|---------|-------|-------------|----------|
| Default | (none) | Basic fragment rendering | General content |
| Sub Heading | `var-sub-heading` | Section sub-heading style | Section intros |
| Lottie Player | `lottie-player` | Displays Lottie animation | Animated content |
| Mission Card | `var-mission-card` | Card layout for mission content | Mission section left side |
| Mission Carousel | `var-mission-carousel` | Carousel of mission items | Mission section right side |
| CTA Banner | `var-cta-banner` | Call-to-action banner with buttons | Page CTAs |
| Stay In Know | `var-stay-know` | Newsletter/info signup card | Footer CTAs |

---

### SOVM Carousel

Slide carousel component with multiple layout options.

| Field | Type | Description |
|-------|------|-------------|
| Variation Style | Select | Carousel layout variant |

#### Carousel Variants

| Variant | Value | Description |
|---------|-------|-------------|
| Default | `var-default` | Standard carousel with teal accents |
| CTA Focus | `var-cta` | Emphasizes call-to-action elements |
| Image Only | `var-image` | Image-focused slides without text overlay |
| Alternate | `var-alternate` | Alternate styling with cyan accents |

#### Slide Fields

Each slide contains:

| Field | Type | Description |
|-------|------|-------------|
| Image | Reference | Slide image |
| Alt Text | Text | Image accessibility text |
| Heading | Text | Slide title |
| Svg Path | AEM Content | Path to SVG icon |
| Svg Icon Name | Text | Icon identifier |
| Description | Rich Text | Slide body content |

---

## Page Templates

### Mission Page

Step-by-step guide to building the Mission page.

#### Page Settings
1. Open page properties
2. Set **OneTrust Domain Script ID** (if this is the main site)
3. Set **Page Background Color** to "Background Dark"

#### Page Structure

```
Page
├── Main
│   ├── Section 1: Hero
│   │   └── SOVM Hero (with desktop & mobile video URLs)
│   │
│   ├── Section 2: Intro Content
│   │   ├── Spacer (choose appropriate size)
│   │   └── Columns (Variant: "Two Column Text")
│   │       ├── Column 1: Title block
│   │       └── Column 2: Text block
│   │
│   ├── Section 3: Video
│   │   └── Video (Style: "Full Width")
│   │
│   ├── Section 4: Sub Heading + Animation
│   │   │   Style: "Side by Side"
│   │   ├── Fragment (Variant: "Sub Heading")
│   │   └── Fragment (Variant: "Lottie Player")
│   │
│   ├── Section 5: Mission Cards
│   │   │   Style: "Side by Side (large)"
│   │   ├── Fragment (Variant: "Mission Card")
│   │   └── Fragment (Variant: "Mission Carousel")
│   │
│   └── Section 6: Stay In Know
│       │   Styles: "Background Image" + "Hero with Card"
│       ├── Image (Desktop background)
│       ├── Image (Mobile background)
│       └── Fragment (Variant: "Stay In Know")
```

#### Detailed Steps

##### Section 1: Hero
1. Add new Section
2. Add **SOVM Hero** block
3. Enter Desktop Video URL
4. Enter Mobile Video URL
5. Add overlay text content

##### Section 2: Intro Content
1. Add new Section
2. Add **Spacer** block - select size based on design
3. Add **Columns** block
   - Set Columns: 2
   - Set Rows: 1
   - Set Variant: "Two Column Text"
4. In Column 1: Add **Title** block with heading
5. In Column 2: Add **Text** block with body content

##### Section 3: Video
1. Add new Section
2. Add **Video** block
   - Enter Video URL
   - Upload Placeholder Image
   - Add Caption (optional)
   - Set Style: "Full Width"

##### Section 4: Sub Heading + Animation
1. Add new Section
2. Set Section Style: "Side by Side"
3. Add **Fragment** block
   - Set Reference to sub-heading content
   - Set Variant: "Sub Heading"
4. Add **Fragment** block
   - Set Reference to Lottie animation content
   - Set Variant: "Lottie Player"

##### Section 5: Mission Cards
1. Add new Section
2. Set Section Style: "Side by Side (large)"
3. Add **Fragment** block
   - Set Reference to mission card content
   - Set Variant: "Mission Card"
4. Add **Fragment** block
   - Set Reference to mission carousel content
   - Set Variant: "Mission Carousel"

##### Section 6: Stay In Know (with Background Image)
1. Add new Section
2. Set Section Styles: 
   - Check "Background Image"
   - Check "Hero with Card"
3. Add **Image** block (first) - Desktop background image
4. Add **Image** block (second) - Mobile background image
5. Add **Fragment** block
   - Set Reference to stay-in-know content
   - Set Variant: "Stay In Know"

> **Important:** When using "Background Image" section style, always add two Image blocks. The first image is used for desktop viewports, and the second for mobile viewports.

---

### Resource Page

A content page with title, sub-heading animation, and card grid.

#### Page Settings
- Set **Page Background Color** to "Background Dark"

#### Page Structure

```
Page
├── Main
│   ├── Section 1: Title
│   │   └── Title
│   │
│   ├── Section 2: Sub Heading + Animation
│   │   │   Style: "Side by Side"
│   │   ├── Fragment (Variant: "Sub Heading")
│   │   └── Fragment (Variant: "Lottie Player")
│   │
│   └── Section 3: Card Grid
│       │   Style: "Grid 3 Columns"
│       └── SOVM Cards
```

#### Key Styles Used

| Section | Style | Purpose |
|---------|-------|---------|
| Page | Background Dark | Dark theme throughout |
| Section 2 | Side by Side | Places sub-heading and animation side by side |
| Section 3 | Grid 3 Columns | Displays cards in 3-column grid layout |

---

### Self Expression Page

A page with green background featuring carousel content and CTA sections.

#### Page Settings
- Set **Page Background Color** to "Background Green"

#### Page Structure

```
Page
├── Main
│   ├── Section 1: Title
│   │   └── Title
│   │
│   ├── Section 2: Sub Heading + Carousel
│   │   │   Style: "Side by Side"
│   │   ├── Fragment (Variant: "Sub Heading")
│   │   └── SOVM Carousel (Variant: "CTA Focus")
│   │
│   ├── Section 3: Spacer
│   │   └── Spacer
│   │
│   ├── Section 4: Hero Card
│   │   │   Styles: "Hero with Card" + "Background Image"
│   │   ├── Image (Desktop background)
│   │   ├── Image (Mobile background)
│   │   └── Fragment
│   │
│   └── Section 5: CTA Banner
│       │   Style: "Background Image"
│       ├── Image (Desktop background)
│       ├── Image (Mobile background)
│       └── Fragment (Variant: "CTA Banner")
```

#### Key Styles Used

| Section | Style | Purpose |
|---------|-------|---------|
| Page | Background Green | Green theme background |
| Section 2 | Side by Side | Sub-heading next to CTA Focus carousel |
| Section 4 | Hero with Card + Background Image | Hero section with card overlay on background |
| Section 5 | Background Image | CTA banner with background image |
| Carousel | CTA Focus | Emphasizes call-to-action buttons in slides |

---

### Advocacy Page

A page featuring hero sections with title and card combinations.

#### Page Settings
- Default page background (no special setting needed)

#### Page Structure

```
Page
├── Main
│   ├── Section 1: Title
│   │   └── Title
│   │
│   ├── Section 2: Hero with Title
│   │   │   Styles: "Background Image" + "Hero with Title and Card"
│   │   ├── Image (Desktop background)
│   │   ├── Image (Mobile background)
│   │   ├── Title
│   │   └── Fragment (Variant: "Sub Heading")
│   │
│   ├── Section 3: Spacer
│   │   └── Spacer
│   │
│   ├── Section 4: Hero Card
│   │   │   Styles: "Hero with Card" + "Background Image"
│   │   ├── Image (Desktop background)
│   │   ├── Image (Mobile background)
│   │   └── Fragment
│   │
│   └── Section 5: CTA Banner
│       │   Style: "Background Image"
│       ├── Image (Desktop background)
│       ├── Image (Mobile background)
│       └── Fragment (Variant: "CTA Banner")
```

#### Key Styles Used

| Section | Style | Purpose |
|---------|-------|---------|
| Section 2 | Background Image + Hero with Title and Card | Hero with both title and card overlay |
| Section 4 | Hero with Card + Background Image | Standard hero with card |
| Section 5 | Background Image | CTA section with background |

---

### Our Mission Our Movement Page

A content-focused page with video, columns, and CTA.

#### Page Settings
- Default page background

#### Page Structure

```
Page
├── Main
│   ├── Section 1: Intro
│   │   ├── Title
│   │   ├── Columns (Variant: "Two Column Text")
│   │   │   ├── Column 1: Title
│   │   │   └── Column 2: Text
│   │   └── Spacer
│   │
│   ├── Section 2: Video
│   │   ├── Video (Style: "Full Width")
│   │   └── Spacer
│   │
│   ├── Section 3: Links
│   │   ├── Columns (Variant: "Text with Link Icon")
│   │   └── Spacer
│   │
│   └── Section 4: CTA Banner
│       │   Style: "Background Image"
│       ├── Image (Desktop background)
│       ├── Image (Mobile background)
│       └── Fragment (Variant: "CTA Banner")
```

#### Key Styles Used

| Section | Style | Purpose |
|---------|-------|---------|
| Section 1 | Columns: Two Column Text | Title left, body text right |
| Section 2 | Video: Full Width | Large video player |
| Section 3 | Columns: Text with Link Icon | Links with icon styling |
| Section 4 | Background Image | CTA with background image |

---

### Collab Page

A collaborative content page with cyan background and multiple carousels.

#### Page Settings
- Set **Page Background Color** to "Background Cyan"

#### Page Structure

```
Page
├── Main
│   ├── Section 1: Title
│   │   ├── Spacer
│   │   └── Title
│   │
│   ├── Section 2: Sub Heading + Image Carousel
│   │   │   Style: "Side by Side"
│   │   ├── Fragment (Variant: "Sub Heading")
│   │   └── SOVM Carousel (Variant: "Image Only")
│   │
│   ├── Section 3: Two Column Content
│   │   ├── Spacer
│   │   ├── Columns (Variant: "Two Column Text")
│   │   │   ├── Column 1: Title
│   │   │   └── Column 2: Text
│   │   └── Spacer
│   │
│   ├── Section 4: Image Grid + Carousel
│   │   │   Style: "Side by Side"
│   │   ├── Columns (Variant: "Image Grid")
│   │   └── SOVM Carousel (Variant: "Alternate")
│   │
│   ├── Section 5: Spacer
│   │   └── Spacer
│   │
│   └── Section 6: CTA Banner
│       │   Style: "Background Image"
│       ├── Image (Desktop background)
│       ├── Image (Mobile background)
│       └── Fragment (Variant: "CTA Banner")
```

#### Key Styles Used

| Section | Style | Purpose |
|---------|-------|---------|
| Page | Background Cyan | Cyan/teal theme throughout |
| Section 2 | Side by Side | Sub-heading next to Image Only carousel |
| Section 3 | Columns: Two Column Text | Standard two-column text layout |
| Section 4 | Side by Side | Image grid paired with Alternate carousel |
| Section 4 | Columns: Image Grid | Grid layout for images |
| Carousel (Sec 2) | Image Only | Image-focused slides |
| Carousel (Sec 4) | Alternate | Cyan accent styling |

---

## Best Practices

### Section Organization
- Give each section a descriptive **Section Name** for easy identification in the Content Tree
- Use Spacer blocks for consistent vertical rhythm instead of relying on default margins
- Keep related content together in the same section

### Fragment Usage
- Create reusable fragments for content that appears on multiple pages
- Use the appropriate variant to ensure correct styling
- Fragment references should point to published content

### Responsive Design
- Always provide both desktop and mobile assets where applicable
- Test pages at multiple viewport sizes
- Use appropriate section layouts (Side by Side stacks on mobile)

### Background Images
- Always provide both desktop and mobile images for `bg-image` sections
- Optimize images for web (WebP format recommended)
- Ensure sufficient contrast between background and text

### Performance
- Use appropriate video formats and sizes
- Lazy-load content below the fold
- Minimize the number of fragments per page when possible

---

## Quick Reference Card

### Section Styles at a Glance

| Need | Use This Style |
|------|----------------|
| Two blocks side by side | `side-by-side` |
| Two blocks side by side (larger) | `side-by-side-large` |
| Three column layout | `grid-3` |
| Background image | `bg-image` (+ 2 Image blocks) |
| Hero with card overlay | `hero-card` |
| Hero with title and card | `hero-title-card` |

### Fragment Variants at a Glance

| Content Type | Use This Variant |
|--------------|------------------|
| Section intro text | Sub Heading |
| Animated content | Lottie Player |
| Mission info card | Mission Card |
| Mission carousel | Mission Carousel |
| Call-to-action buttons | CTA Banner |
| Newsletter signup | Stay In Know |

### Carousel Variants at a Glance

| Design Need | Use This Variant |
|-------------|------------------|
| Standard with teal | Default |
| CTA emphasis | CTA Focus |
| Image showcase | Image Only |
| Alternate with cyan | Alternate |
