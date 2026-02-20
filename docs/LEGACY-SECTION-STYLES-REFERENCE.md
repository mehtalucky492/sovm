# Legacy Section Styles Reference

> **Note:** These styles were removed from `site.css` and `_section.json` during the refactoring effort. This document serves as a reference for the original implementations in case they need to be restored or adapted.

## Table of Contents

1. [Card Layouts](#card-layouts)
2. [Page Layouts](#page-layouts)
3. [Video/Carousel Layouts](#videocarousel-layouts)
4. [Lottie Split Layouts](#lottie-split-layouts)
5. [CTA Links Banner](#cta-links-banner)

---

## Card Layouts

### `col-card-image`
**Purpose:** Card with background image overlay

```css
/* CSS For Card */
main .section.col-card-image.fragment-container {
    position: relative;
    overflow: hidden;
}

main .section.col-card-image.fragment-container img {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    width: 100%;
    height: 100%;
    object-fit: cover;
    max-width: 1920px;
    object-position: right;
}

main .section.col-card-image.fragment-container a {
    width: auto;
}

main .section.col-card-image .fragment-wrapper {
    min-height: 640px;
    padding-top: 2.25rem;
    padding-bottom: 3.75rem;
    text-align: left;
    position: relative;
}

@media (width >= 62em) {
    main .section.col-card-image .fragment-wrapper {
        padding-top: 7.5rem;
        padding-bottom: 12.5rem;
    }
}

.col-card-image > div p {
    margin: 0;
}
```

### `express-card`
**Purpose:** Variant of col-card-image with taller minimum height

```css
main .section.express-card .fragment-wrapper {
    min-height: 690px;
}
```

### `advocacy-card`
**Purpose:** Card with inverted text color

```css
.section.advocacy-card {
    color: rgb(var(--bg-card-color));
}

main .section.advocacy-card .fragment-wrapper {
    padding-top: 0.5rem;
}

@media (width >= 62em) {
    main .section.advocacy-card .fragment-wrapper {
        padding-top: 6.625rem;
        padding-bottom: 12.5rem;
    }
}
```

### `stay-in-know`
**Purpose:** Card with border and semi-transparent background

```css
main .section.col-card-image.fragment-container.stay-in-know a {
    width: 100%;
}

main .section.col-card-image.stay-in-know .fragment {
    border: 1px solid rgb(var(--bg-card-color));
    background: rgb(var(--bg-card-color), var(--bg-opacity-secondary));
    border-radius: 14px;
    padding: 1.5rem;
    max-width: 475px;
}

@media (width >= 48em) {
    main .section.col-card-image.stay-in-know .fragment {
        padding: 3rem;
        box-sizing: border-box;
    }
}
```

---

## Page Layouts

### `home-two-col-title-text`
**Purpose:** Two-column layout with title and text for home page intro sections

```css
.section.home-two-col-title-text {
    background-color: var(--bg-primary);
    padding-top: 6.375rem;
    padding-bottom: 0;
}

.section.home-two-col-title-text h2 {
    font-family: "Vulf Sans", sans-serif;
    font-weight: 700;
    font-style: normal;
    font-size: 32px;
    line-height: 40px;
    color: var(--light-color);
    margin: 0;
    max-width: 520px;
    box-sizing: border-box;
    padding-bottom: 1.5625rem;
    padding-right: 16px;
    padding-left: 16px;
}

.section.home-two-col-title-text p {
    font-family: "Vulf Sans", sans-serif;
    font-weight: 400;
    font-style: normal;
    font-size: 18px;
    line-height: 25.2px;
    color: var(--light-color);
    margin: 0;
    max-width: 600px;
    padding-left: 16px;
    padding-right: 16px;
}

.section.home-two-col-title-text .columns-wrapper {
    max-width: 1216px;
    margin: 0 auto;
    padding-left: 16px;
    padding-right: 16px;
}

.section.home-two-col-title-text .columns > div {
    display: grid;
    grid-template-columns: 0.5fr 0.5fr;
    gap: 0;
    align-items: center;
}

@media (width < 768px) {
    .section.home-two-col-title-text {
        padding: 56px 0;
        padding-top: 3.75rem;
        padding-bottom: 0.625rem;
    }

    .section.home-two-col-title-text .columns.block > div {
        grid-template-columns: 1fr;
        gap: 24px;
    }

    .section.home-two-col-title-text h2 {
        font-size: 20px;
        line-height: 26px;
    }

    .section.home-two-col-title-text p {
        font-size: 16px;
        line-height: 24px;
    }
}
```

### `mission-two-col-title-text`
**Purpose:** Two-column layout for mission page with title, text, and lists

```css
.section.mission-two-col-title-text h1 {
    color: rgb(var(--bg-primary-rgb));
    font-size: 2.25rem;
    line-height: 2.5rem;
    max-width: 285px;
    margin-bottom: 3.75rem;
    margin-top: 0;
}

.section.mission-two-col-title-text h2 {
    font-size: 1.25rem;
    line-height: 1.625rem;
    color: rgb(var(--bg-primary-rgb));
    margin-bottom: 1.5625rem;
    margin-top: 0;
}

.section.mission-two-col-title-text p {
    margin-bottom: 0.75rem;
    margin-top: 0;
}

.section.mission-two-col-title-text p:last-of-type {
    margin-bottom: 0;
    margin-top: 0;
}

.section.mission-two-col-title-text ul {
    list-style: none;
    padding: 0;
    margin-bottom: 1.625rem;
}

.section.mission-two-col-title-text li {
    position: relative;
    padding-left: 1.125rem;
    margin-bottom: 0.875rem;
}

.section.mission-two-col-title-text li::before {
    content: "";
    position: absolute;
    left: 0;
    top: 8px;
    width: 6px;
    height: 6px;
    border-radius: 60%;
    border: 1.34px solid rgb(var(--bg-primary-rgb), 1);
    background: var(--teal-color);
}

@media (width >= 48em) {
    .section.mission-two-col-title-text .columns > div > div {
        align-self: flex-start;
    }

    .section.mission-two-col-title-text h1 {
        font-size: 3.75rem;
        line-height: 4.25rem;
        max-width: 480px;
        margin-bottom: 5.9375rem;
    }

    .section.mission-two-col-title-text h2 {
        font-size: 2rem;
        line-height: 2.5rem;
        margin-top: 0;
    }

    .section.mission-two-col-title-text p {
        font-size: 1.125rem;
        line-height: 1.4;
        margin-top: 0;
    }

    .section.mission-two-col-title-text li {
        font-size: 1.125rem;
        line-height: 1.4;
    }
}
```

### `text-with-link`
**Purpose:** Text with link icon styling

```css
.text-with-link .columns > div {
    align-items: baseline;
}

.text-with-link p {
    margin-top: 0;
    font-size: 1.25rem;
    line-height: 2rem;
    font-weight: 700;
    margin-bottom: 2.25rem;
    color: var(--bg-primary);
}

.text-with-link p a {
    color: inherit;
    text-decoration: underline;
    text-underline-offset: 7px;
    text-decoration-thickness: 1px;
    margin-right: 11px;
}

.text-with-link p .icon {
    display: inline-block;
    width: 32px;
    height: 32px;
    position: relative;
    top: 7px;
}

.text-with-link p u {
    text-decoration-thickness: 1px;
    text-underline-offset: 7px;
}

@media (width >= 48em) {
    .text-with-link p {
        font-size: 2rem;
        line-height: 3.125rem;
        margin-bottom: 3.75rem;
    }

    .text-with-link .columns > div > div {
        width: 50%;
    }
}
```

### `image-grid`
**Purpose:** Grid layout for images with carousel support

```css
.image-grid-color {
    background: rgba(var(--bg-image-grid), var(--bg-opacity-primary));
}

.image-grid .columns > div > div {
    --bs-gutter-x: 16px;
    --bs-gutter-y: 12px;
    margin-bottom: 4.375rem;
    display: flex;
    flex-wrap: wrap;
    margin-top: calc(-1 * var(--bs-gutter-y));
    margin-right: calc(-0.5 * var(--bs-gutter-x));
    margin-left: calc(-0.5 * var(--bs-gutter-x));
    box-sizing: border-box;
}

main .image-grid .columns > div > div p {
    flex: 0 0 auto;
    width: 50%;
    max-width: 100%;
    padding-right: calc(var(--bs-gutter-x) * 0.5);
    padding-left: calc(var(--bs-gutter-x) * 0.5);
    margin-top: var(--bs-gutter-y);
    box-sizing: border-box;
}

main .image-grid {
    display: flex;
    flex-wrap: wrap;
    padding-right: calc(var(--bs-gutter-x) * 0.5);
    padding-left: calc(var(--bs-gutter-x) * 0.5);
}

main .image-grid > div {
    padding: 0;
    width: 100%;
    box-sizing: border-box;
    margin-top: 0;
}

.image-grid .sovm-carousel .slick-track {
    align-items: unset;
}

.section.image-grid .sovm-carousel {
    margin: 0;
}

.section.image-grid .sovm-carousel.var-alternate .sovm-carousel-slide {
    width: 100%;
    margin-left: 0;
    margin-right: 1px;
}

main .image-grid > div:first-child h2 {
    font-weight: 700;
    font-style: normal;
    font-size: 1.25rem;
    line-height: 1.299;
    letter-spacing: 0;
    margin: 0 0 0.5em;
    width: auto;
    margin-bottom: 2.3125rem;
    font-family: "Vulf Sans", sans-serif;
    color: var(--bs-body-color);
}

@media (width >= 48em) {
    main .image-grid .columns > div > div p {
        --bs-gutter-x: 31px;
        --bs-gutter-y: 36px;
        padding-right: calc(var(--bs-gutter-x) * 0.5);
        padding-left: calc(var(--bs-gutter-x) * 0.5);
    }

    .section.image-grid .sovm-carousel.var-alternate .sovm-carousel-slide {
        width: auto;
        margin-left: 5px;
        margin-right: 5px;
    }

    main .image-grid .columns > div > div {
        --bs-gutter-x: 31px;
        --bs-gutter-y: 36px;
    }

    main .image-grid > div:first-child h2 {
        font-size: 2rem;
        line-height: 2.5rem;
        max-width: 400px;
        margin-bottom: 2.875rem;
    }

    .image-grid .sovm-carousel-wrapper {
        flex: 0 0 auto;
        width: 50%;
        padding-left: calc(var(--bs-gutter-x) * 0.5);
    }

    .image-grid .columns-wrapper {
        flex: 0 0 auto;
        width: 50%;
        padding-right: calc(var(--bs-gutter-x) * 0.5);
    }

    main .image-grid .columns > div > div p {
        flex: 0 0 auto;
        width: 33.3333%;
    }
}

/* Responsive max-widths for image-grid */
@media (width >= 36em) {
    main > .image-grid {
        max-width: 30.25rem;
        padding-left: calc((100% - 30.25rem) / 2);
        padding-right: calc((100% - 30.25rem) / 2);
    }
}

@media (width >= 48em) {
    main > .image-grid {
        --bs-gutter-x: 32px;
        max-width: 43rem;
        padding-left: calc((100% - 43rem) / 2);
        padding-right: calc((100% - 43rem) / 2);
    }
}

@media (width >= 62em) {
    main > .image-grid {
        max-width: 58rem;
        padding-left: calc((100% - 58rem) / 2);
        padding-right: calc((100% - 58rem) / 2);
    }
}

@media (width >= 75em) {
    main > .image-grid {
        max-width: 69.25rem;
        padding-left: calc((100% - 69.25rem) / 2);
        padding-right: calc((100% - 69.25rem) / 2);
    }
}

@media (width >= 87.5em) {
    main > .image-grid {
        max-width: 74rem;
        padding-left: calc((100% - 74rem) / 2);
        padding-right: calc((100% - 74rem) / 2);
    }
}

@media (width >= 64em) {
    .image-grid .sovm-carousel-wrapper {
        /* Additional desktop styles */
    }
}
```

---

## Video/Carousel Layouts

### `video-carousel-left`
**Purpose:** Left side of two-column video carousel layout with title + CTA

```css
.section.video-carousel-left {
    width: 100%;
    min-height: 763px;
    background: var(--teal-color);
    border: 10px solid var(--bg-secondary);
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 53px 18px;
}

@media (width < 48em) {
    .section.video-carousel-left {
        /* Mobile overrides */
    }
}

.section.video-carousel-left > div {
    margin: 0;
    padding: 0;
    max-width: none;
}

.section.video-carousel-left .default-content-wrapper {
    text-align: center;
}

.section.video-carousel-left h3 {
    font-family: "Vulf Sans", sans-serif;
    font-weight: 700;
    font-style: normal;
    font-size: 20px;
    line-height: 25px;
    color: var(--bg-primary);
    margin: 0;
    padding: 0 10px;
    max-width: 464px;
    box-sizing: border-box;
}

.section.video-carousel-left .icon-button-wrapper {
    width: 100%;
    max-width: 373px;
    margin: 0 auto;
}

@media (width >= 48em) {
    .section.video-carousel-left {
        width: 50%;
        float: left;
    }

    .section.video-carousel-left h3 {
        font-size: 32px;
        line-height: 40px;
    }
}

@media (width >= 62em) {
    .section.video-carousel-left {
        min-height: 900px;
    }
}
```

### `video-carousel-right`
**Purpose:** Right side with background image + carousel

```css
.section.video-carousel-right {
    position: relative;
    width: 100%;
    box-sizing: border-box;
}

.section.video-carousel-right .default-content-wrapper {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 0;
    overflow: hidden;
    margin: 0;
    padding: 0;
}

.section.video-carousel-right .default-content-wrapper p {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
}

.section.video-carousel-right .default-content-wrapper img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
}

.section.video-carousel-right .sovm-carousel-wrapper {
    padding-top: 58px;
    padding-bottom: 58px;
}

@media (width >= 48em) {
    .section.video-carousel-right {
        width: 50%;
        float: left;
    }

    .section.video-carousel-right .sovm-carousel-wrapper {
        position: relative;
        z-index: 1;
    }
}

@media (width >= 62em) {
    .section.video-carousel-right {
        min-height: 900px;
    }
}
```

### `text-carousel`
**Purpose:** Two-column layout with text on left and carousel on right

```css
.section.text-carousel {
    background: rgb(var(--bg-secondary-rgb), var(--bg-opacity-secondary));
    padding: 4.0625rem 0 3.125rem;
    color: var(--bg-primary);
}

.section.text-carousel .default-content-wrapper h1 {
    margin-top: 0;
    margin-bottom: 3.5625rem;
}

.section.text-carousel .default-content-wrapper h3 {
    font-size: 1.25rem;
    line-height: 1.25;
    margin-top: 0;
    margin-bottom: 1.6875rem;
}

.section.text-carousel .default-content-wrapper p:not(:last-of-type) {
    margin-bottom: 1.5625rem;
}

.section.text-carousel .default-content-wrapper p:last-of-type {
    margin: 0;
}

.section.text-carousel .icon-button-wrapper {
    margin-top: 1.9375rem;
}

.section.text-carousel .sovm-carousel-wrapper {
    margin-top: 2.375rem;
}

.section.text-carousel .sovm-carousel.var-cta .sovm-carousel-slide {
    width: 100%;
    margin-left: 0;
    margin-right: 1px;
}

.section.text-carousel .sovm-carousel.var-cta.block {
    padding-bottom: 15px;
}

@media (width >= 48em) {
    .section.text-carousel {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 2rem;
    }

    .section.text-carousel .default-content-wrapper h1 {
        font-size: 3.75rem;
        line-height: 4.25rem;
    }

    .section.text-carousel .default-content-wrapper h3 {
        font-size: 2rem;
        line-height: 2.5rem;
    }
}

@media (width >= 62em) {
    .section.text-carousel {
        padding: 7.5rem 0;
    }

    .section.text-carousel .sovm-carousel.var-cta .sovm-carousel-slide {
        width: auto;
    }
}
```

### `text-carousel-collab`
**Purpose:** Variation of text-carousel with cyan background

```css
.section.text-carousel.text-carousel-collab {
    background-color: rgb(var(--bg-image-grid), var(--bg-opacity-primary));
    padding-bottom: 8.75rem;
}

.section.text-carousel.text-carousel-collab .sovm-carousel.block {
    max-width: 482px;
}

.section.text-carousel.text-carousel-collab
    .sovm-carousel.var-image
    .sovm-carousel-slide
    img {
    border-radius: 14px;
    border: 1px solid var(--bg-primary);
}

.section.text-carousel.text-carousel-collab
    .sovm-carousel.var-image
    .slick-dots
    li.slick-active
    button {
    background: var(--sovm-carousel-accent-cyan);
}
```

---

## Lottie Split Layouts

### `two-col-title-button-text-lottie-left-section` & `two-col-title-button-text-lottie-right-section`
**Purpose:** Two-column split layout with lottie animation

```css
/* Typography */
.two-col-title-button-text-lottie-left-section h3 {
    font-family: "Vulf Sans", sans-serif;
    font-weight: 700;
    font-size: 2rem;
    line-height: 1.5;
    margin: 0;
    color: var(--color-text-inverse);
}

.two-col-title-button-text-lottie-right-section .default-content-wrapper > p {
    font-family: "Vulf Sans", sans-serif;
    font-size: 1.125rem;
    font-weight: 400;
    line-height: 1.5rem;
    text-align: start;
    color: var(--color-text-inverse);
}

/* Mobile (< 48em) */
@media (width < 48em) {
    .two-col-title-button-text-lottie-left-section,
    .two-col-title-button-text-lottie-right-section {
        width: 100%;
        padding: 1rem;
    }
}

/* Tablet / Desktop (>= 48em) */
@media (width >= 48em) {
    .two-col-title-button-text-lottie-left-section,
    .two-col-title-button-text-lottie-right-section {
        width: 50%;
        float: left;
    }

    .two-col-title-button-text-lottie-left-section {
        padding-right: 2rem;
    }

    .two-col-title-button-text-lottie-right-section {
        padding-left: 2rem;
    }
}

/* Clear floats */
.footer-wrapper {
    clear: both;
}
```

### Variation styles (`-variation` suffix)
**Purpose:** Alternative styling for lottie split sections with different typography

```css
.two-col-title-button-text-lottie-left-section #resources {
    font-family: "Vulf Sans", sans-serif;
    font-size: 3.75rem;
    font-style: normal;
    font-weight: 700;
    letter-spacing: normal;
    line-height: 4.2488rem;
    text-align: start;
}

.two-col-title-button-text-lottie-left-section #call-or-text-988 {
    font-family: "Vulf Sans", sans-serif;
    font-size: 2rem;
    font-style: normal;
    font-weight: 700;
    letter-spacing: normal;
    line-height: 1.5625rem;
    text-align: start;
}

.two-col-title-button-text-lottie-left-section-variation
    .default-content-wrapper
    #call-or-text-988
    a[href="tel:988"] {
    color: inherit;
    text-decoration: underline;
}

.two-col-title-button-text-lottie-left-section-variation
    .default-content-wrapper
    #call-or-text-988
    a[href="tel:988"]:hover {
    text-decoration: none;
}
```

---

## CTA Links Banner

### `join-cta-links`
**Purpose:** Full-width CTA links banner with background image

```css
.section.join-cta-links {
    position: relative;
    width: 100vw;
    left: 50%;
    margin-left: -50vw;
    box-sizing: border-box;
    overflow: hidden;
    min-height: 338px;
}

.section.join-cta-links h2 {
    font-weight: 700;
    font-size: 1.125rem;
    line-height: 1.625rem;
}

.section.join-cta-links p {
    font-weight: 400;
    font-size: 1rem;
    line-height: 1.5rem;
    color: var(--bg-primary);
    margin: 0;
}

.section.join-cta-links .default-content-wrapper {
    padding: 0;
}

.section.join-cta-links .default-content-wrapper:not(:last-of-type),
.section.join-cta-links .icon-button-wrapper {
    position: relative;
    z-index: 2;
}

.section.join-cta-links .default-content-wrapper:last-of-type {
    position: absolute;
    inset: 0;
    z-index: 1;
    width: 100%;
    max-width: none;
    margin: 0;
}

.section.join-cta-links .default-content-wrapper:last-of-type p {
    position: absolute;
    inset: 0;
    margin: 0;
    pointer-events: none;
}

.section.join-cta-links picture,
.section.join-cta-links img {
    width: 100%;
    height: 100%;
}

.section.join-cta-links img {
    object-fit: cover;
}

@media (width >= 992px) {
    .section.join-cta-links {
        min-height: 500px;
    }

    .section.join-cta-links h2 {
        font-size: 1.5rem;
        line-height: 2rem;
    }

    .section.join-cta-links p {
        font-size: 1.125rem;
        line-height: 1.75rem;
    }
}
```

---

## CSS Variables Used

These legacy styles relied on the following CSS custom properties (still available in `:root`):

```css
:root {
    --bg-primary: #282b3a;
    --bg-primary-rgb: 40, 43, 58;
    --bg-secondary: #50ffc5;
    --bg-secondary-rgb: 80, 255, 197;
    --bg-opacity-primary: 1;
    --bg-opacity-secondary: 0.5;
    --teal-color: #a7ffe2;
    --bg-image-grid: 207, 248, 253;
    --bg-card-color: 255, 255, 255;
    --bg-card-opacity-secondary: 0.25;
    --color-text-inverse: #fff;
    --bs-body-color: #282b3a;
    --bs-gutter-x: 56px;
}
```

---

## Migration Notes

When migrating pages that used these legacy section styles:

1. **Card layouts** → Use `bg-image` section style + fragment block with appropriate variant
2. **Two-column layouts** → Use `columns` block with `var-two-col-text` variant
3. **Carousel layouts** → Use `sovm-carousel` block with appropriate variant
4. **Lottie layouts** → Use `lottie-player` block + `columns` block combination
5. **CTA banners** → Use `fragment` block with `var-cta-banner` variant

---

*Last updated: February 10, 2026*
