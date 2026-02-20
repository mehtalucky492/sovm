# Figma to EDS XWalk Block

This document describes how to convert a **Figma component** into a production-ready  
**Adobe Edge Delivery Services (EDS) XWalk block**.

---

## 🎯 Objective

- Take a Figma design/component and generate:
  - Semantic, author-friendly **HTML**
  - Scoped, responsive **CSS**
  - Lightweight, progressive **JavaScript**
  - An authoring **model** (`_<blockname>.json`) for Universal Editor
  - Look at /styles/styles.css and replace css with variables

---

## 📂 Output Structure

Each new block should follow this folder structure:

```
/blocks/[block-name]/[block-name].css
/blocks/[block-name]/[block-name].js
/blocks/[block-name]/_[block-name].json
```

---

## 🧱 Implementation Steps

### 1. HTML
- Use **semantic tags** (`section`, `h1–h6`, `p`, `picture`, `ul/ol`, `a`, `button`, etc.).
- Root element: `.block.[block-name]`.
- Variants: additional root classes (`.block.[block-name]--compact`).
- No inline styles.  

#### Universal Editor Block Structure
**IMPORTANT**: Universal Editor creates this nested DOM structure pattern for blocks:
```html
<div class="[block-name] block" data-block-name="[block-name]">
  <div><div><p>Content Element</p></div></div>         <!-- Text content -->
  <div><div><picture><img src="..." /></picture></div></div>  <!-- Images -->
  <div><div><p><a href="...">Link Text</a></p></div></div>    <!-- Links/Buttons -->
  <div><div><p>configuration-value</p></div></div>     <!-- Config values -->
  <!-- Number and type of rows varies by block -->
</div>
```

**Key Structure Patterns:**
- **Root Element**: `<div class="[block-name] block" data-block-name="[block-name]">`
- **Row Wrapper**: Each content element wrapped in `<div><div>...</div></div>`
- **Content Types**: Text in `<p>`, images in `<picture>` or `<img>`, links in `<p><a>`
- **Variable Structure**: Number, type, and order of content rows varies by block design

**Content Analysis Approach** (analyze each block's specific needs):
- **Inspect Content Types**: Look at your Figma design to determine what content elements are needed
- **Plan Row Usage**: Map each content element to a logical row position based on your specific block
- **Identify Configuration Rows**: Configuration values (theme, overlay, variants) are typically in final rows
- **Handle Optional Elements**: Not all blocks will have the same structure - build dynamic parsing logic
- **Content Detection**: Use element inspection to determine content type (text vs image vs button vs configuration)

### 2. CSS
- Mobile-first, responsive, accessible.
- **Use CSS variables from `/styles/root.css`** - NEVER hardcode values that exist as variables.
- **Required variables to use:**
  - **Typography**: `var(--heading-font-family)`, `var(--body-font-family)`, `var(--font-weight-headings)`, `var(--font-weight-regular)`, `var(--font-weight-button)`
  - **Font Sizes**: `var(--heading-font-size-xxl)`, `var(--body-font-size-m)`, `var(--font-size-button-m)`, etc.
  - **Colors**: `var(--text-primary)`, `var(--text-on-color)`, `var(--button-primary)`, `var(--button-secondary)`, `var(--surface-white)`, etc.
  - **Spacing**: `var(--spacing-xs)`, `var(--spacing-s)`, `var(--spacing-m)`, `var(--spacing-l)`, `var(--spacing-xl)`
  - **Layout**: `var(--max-width-content)`, `var(--breakpoint-desktop)`, `var(--grid-max-width)`, `var(--grid-margin)`, `var(--grid-gutter)`
  - **Line Heights**: `var(--line-height-default)`, `var(--line-height-compact)`, `var(--line-height-button-m)`
- Scope all styles: `.block.[block-name] …`
- Use **container queries** or media queries for breakpoints.
- Ensure WCAG 2.1 AA color contrast.

#### CSS Architecture Pattern:
```css
/* Container follows grid system */
.[block-name]-container .[block-name]-wrapper {
  max-width: var(--grid-max-width);
  margin: 0 auto;
  padding: 0 var(--grid-margin);
}

/* Main block uses flexbox for centering (if needed) */
.[block-name] {
  display: flex; /* or block, depending on layout needs */
  padding: var(--grid-margin);
  /* Use CSS custom properties */
}

/* Content container uses grid for precise layout */
.[block-name]-content {
  display: grid;
  grid-template-columns: repeat(var(--grid-columns), 1fr);
  gap: var(--grid-gutter);
  max-width: var(--grid-max-width);
}

/* Grid positioning for different screen sizes */
@media (width >= 900px) {
  .[block-name] .header-content {
    grid-column: span 8; /* Use grid system for content width */
  }
  
  .[block-name] .body-text {
    grid-column: span 6;
  }
}
```

#### Gradient Border Implementation:
For components with multi-color gradient borders:

```css
/* ✅ CORRECT: Container-padding approach for gradient borders */
.card-container {
  /* Apply gradient as background to container */
  background: linear-gradient(to bottom, #32FFFF, #B4FF00, #FFD500);
  padding: 4px; /* Creates the border width */
}

.card-content {
  /* Inner content with solid background */
  background: var(--surface-black);
  width: 100%;
  height: 100%;
}

/* ❌ AVOID: Complex pseudo-element approaches (z-index issues) */
/* ❌ AVOID: border-image (responsive/browser compatibility issues) */
```

**Gradient Direction Best Practices:**
- **`to bottom`**: Vertical gradients (most common for borders) 
- **Start with brand primary color** at the top
- **Test across breakpoints** to ensure consistent appearance

- **Example of correct variable usage:**
  ```css
  .my-block h1 {
    font-family: var(--heading-font-family);
    font-weight: var(--font-weight-headings);
    font-size: var(--heading-font-size-xxl);
    color: var(--text-primary);
  }
  ```

#### 🎨 Universal Editor Empty State Styling
**CRITICAL**: Add CSS to make empty Universal Editor items visible and clearly indicate they need content:

```css
/* Placeholder styling for empty cards in Universal Editor */
[data-placeholder]::before {
  content: attr(data-placeholder);
  color: #999;
  font-style: italic;
  opacity: 0.7;
}

/* Empty CTA button styling */
.empty-cta[data-placeholder] {
  background-color: transparent;
  border: 2px dashed #ccc;
  color: #999;
  cursor: default;
}

.empty-cta[data-placeholder]:hover {
  background-color: transparent;
  border-color: #999;
  color: #666;
}

/* Ensure empty containers remain visible */
.block [data-placeholder]:empty::before {
  content: attr(data-placeholder);
  display: inline-block;
  min-height: 1em;
  min-width: 100px;
}
```

### 3. Container Model Integration
- **Add your block to container models** like `_section.json` to make it available in the Universal Editor
- **Section Model Example** - Add your block to the allowed components:
  ```json
  {
    "id": "section",
    "fields": [
      {
        "component": "aem-content",
        "name": "content",
        "label": "Content",
        "constraints": {
          "allowedComponents": [
            "hero",
            "teaser-hero",
            "your-new-block",  
            "columns",
            "cards"
          ]
        }
      }
    ]
  }
  ```
- **Integration Steps**:
  1. **Identify container models**: Check `/models/_section.json`
  2. **Add to allowedComponents**: Include your block's ID in the `allowedComponents` array
- **Container types**: Sections, pages (but here we. are only using sections)
- **Authorization**: Only blocks listed in `allowedComponents` can be inserted by authors

### 4. JavaScript
- File: `block.js`
- Export a default async decorator:
  ```js
  export default async function decorate(block) { /* ... */ }
  ```
- Vanilla JS only, no frameworks.
- Progressive enhancement only (works without JS).

#### 🚨 Universal Editor DOM Structure Handling
- **CRITICAL**: Universal Editor outputs content wrapped in `<div>` and `<p>` tags, NOT plain text
- **Row Structure**: Each content element is in a separate table row: `<div><div><p>content</p></div></div>`
- **Content Parsing**: Always use `.innerHTML` or `.textContent` to extract content from wrapper elements
- **Button Handling**: Links may be wrapped in `<p><strong><a>` or `<p><em><a>` structures
- **Configuration Rows**: Theme/variant settings appear as text content in final rows (e.g., "dark", "light", "true", "false")

#### JavaScript Implementation Pattern:
```js
export default async function decorate(block) {
  const rows = [...block.children];
  const content = document.createElement('div');
  content.className = '[block-name]-content';
  
  const processedRows = [];
  const configurationValues = [];
  
  // Analyze content by type, not position
  rows.forEach((row, index) => {
    const cells = [...row.children];
    if (!cells.length) return;
    
    const cell = cells[0];
    const img = cell.querySelector('img');
    const link = cell.querySelector('a');
    const textContent = cell.textContent.trim();
    
    // Categorize content by what it contains
    if (img && img.src) {
      // Handle images (background, hero image, etc.)
      processedRows.push({ type: 'image', element: img, row });
    } else if (link) {
      // Handle buttons/CTAs
      processedRows.push({ type: 'button', element: link, row });
    } else if (isConfigurationValue(textContent)) {
      // Handle theme/variant configuration
      configurationValues.push({ value: textContent.toLowerCase(), row });
    } else if (textContent) {
      // Handle text content - determine semantic meaning based on your block's needs
      processedRows.push({ type: 'text', content: cell.innerHTML.trim(), row });
    }
  });
  
  // Process content based on your specific block's requirements
  processContentByType(processedRows, content);
  
  // Apply configuration values
  configurationValues.forEach(({ value, row }) => {
    if (['dark', 'light', 'compact', 'centered'].includes(value)) {
      block.classList.add(value);
    }
    row.remove();
  });
  
  block.appendChild(content);
}

// Helper function - customize based on your block's configuration fields
function isConfigurationValue(text) {
  const configValues = ['dark', 'light', 'compact', 'centered', 'true', 'false'];
  return configValues.includes(text.toLowerCase());
}

// Process content based on your specific block needs
function processContentByType(processedRows, content) {
  // Example: Find the first text element for headline, buttons for CTAs, etc.
  // Customize this logic for each block's specific requirements
  const textElements = processedRows.filter(item => item.type === 'text');
  const buttonElements = processedRows.filter(item => item.type === 'button');
  const imageElements = processedRows.filter(item => item.type === 'image');
  
  // Create semantic elements based on your block's design
  // This is where you implement your specific content structure
}
```

#### Content Extraction Best Practices:
- Use `cellContent.innerHTML.trim()` for rich content (with HTML tags)
- Use `cellContent.textContent.trim()` for plain text only
- Check for existing `<a>` tags: `cell.querySelector('a')`
- Handle wrapped buttons: extract text with `link.textContent.trim()`
- Filter out configuration values when processing content

#### 🚨 CRITICAL: Universal Editor Empty Item Handling
**ESSENTIAL**: Universal Editor creates empty items when authors add new components. These items start with NO content but must remain visible and editable. Your JavaScript MUST handle this scenario:

```js
import { moveInstrumentation } from '../../scripts/scripts.js';

// CRITICAL: Always return data object, even if empty
function extractCardData(element, row) {
  const cardData = {
    heading: '',
    body: '',
    cta: null,
    ctaText: '',
  };

  // ... your extraction logic ...

  // Always return cardData object, even if empty (for Universal Editor compatibility)
  // Empty cards are needed for newly added items that haven't been filled with content yet
  return cardData;
}

// CRITICAL: Handle empty items with placeholder content
function createCardElement(cardData, index, originalRow = null) {
  const cardContainer = document.createElement('div');
  cardContainer.className = `container-${index + 1}`;

  // ESSENTIAL: Move Universal Editor instrumentation to preserve editing capabilities
  if (originalRow) {
    moveInstrumentation(originalRow, cardContainer);
  }

  // Handle case where cardData might be null or empty
  const safeCardData = cardData || {
    heading: '',
    body: '',
    cta: null,
    ctaText: '',
  };

  // Create elements with placeholder content for empty items
  const headingElement = document.createElement('h3');
  if (safeCardData.heading) {
    headingElement.innerHTML = safeCardData.heading;
  } else {
    // Empty placeholder for Universal Editor - CRITICAL for newly added items
    headingElement.innerHTML = '';
    headingElement.setAttribute('data-placeholder', 'Add heading...');
  }

  const textElement = document.createElement('div');
  if (safeCardData.body) {
    textElement.innerHTML = safeCardData.body;
  } else {
    // Empty placeholder for Universal Editor - CRITICAL for newly added items
    textElement.innerHTML = '';
    textElement.setAttribute('data-placeholder', 'Add body text...');
  }

  // Always create CTA container, even if empty
  const buttonDiv = document.createElement('div');
  if (!safeCardData.cta && !safeCardData.ctaText) {
    // Create placeholder button for empty cards - CRITICAL for newly added items
    const placeholderButton = document.createElement('a');
    placeholderButton.className = 'button button-secondary empty-cta';
    placeholderButton.textContent = 'Add CTA';
    placeholderButton.href = '#';
    placeholderButton.setAttribute('data-placeholder', 'true');
    buttonDiv.appendChild(placeholderButton);
  }

  // ... rest of your element creation logic ...
  
  return cardContainer;
}
```

#### 🔧 Container vs Item Detection for XWalk Blocks
For multi-item blocks (cards, accordions, etc.), you need logic to distinguish between container content (main heading) and repeatable items:

```js
// Helper function to identify if this is the first content row (likely main heading)
function isFirstContentRow(currentIndex, allRows) {
  // Find the first row that has actual content (not config values)
  for (let i = 0; i < allRows.length; i += 1) {
    const row = allRows[i];
    const cells = [...row.children];
    if (cells.length > 0) {
      const cellText = cells[0].textContent.trim();
      if (cellText && !isConfigurationValue(cellText)) {
        return i === currentIndex; // This is the first content row
      }
    }
  }
  return false;
}

// Helper function to identify card item rows
function isCardItemRow(cell) {
  // Check for Universal Editor component markers that specifically indicate items
  if (cell.querySelector('[data-aue-filter="card-enhanced"]')
      || (cell.hasAttribute('data-aue-filter') && cell.getAttribute('data-aue-filter') === 'card-enhanced')) {
    return true;
  }

  // Check for generic component markers (but be more cautious)
  if (cell.querySelector('[data-aue-type="component"]')
      || cell.hasAttribute('data-aue-type')) {
    // Additional check: make sure it's not just a main heading with UE attrs
    const parent = cell.parentElement;
    const isInContainer = parent && parent.classList.contains('cards-enhanced');
    const hasMultipleSiblings = parent && parent.children.length > 2; // More than heading + item
    return isInContainer && hasMultipleSiblings;
  }

  // Card items might have multiple cells or specific structure
  const parent = cell.parentElement;
  const cellsInRow = parent ? parent.children.length : 1;

  // Card items typically have multiple fields (heading, body, CTA)
  return cellsInRow > 1
         || cell.querySelector('a') // Has CTA link
         || (cell.textContent.trim()
          && cell.previousElementSibling
          && cell.previousElementSibling.textContent.trim()); // Part of a multi-field item
}
```

### 5. Model (`_model.json`)
- Define fields for Universal Editor.
- **CRITICAL**: For blocks that contain multiple items (like cards, accordions, testimonials), you need TWO definitions. You may need ONE or TWO models depending on whether the container has fields. Regardless of whether 1 or 2 models are used, only ONE json file should be created.

#### Single Block Model Example (simple blocks):
```json
{
  "definitions": [
    {
      "title": "Hero",
      "id": "hero",
      "plugins": {
        "xwalk": {
          "page": {
            "resourceType": "core/franklin/components/block/v1/block",
            "template": {
              "name": "Hero",
              "model": "hero"
            }
          }
        }
      }
    }
  ],
  "models": [
    {
      "id": "hero",
      "fields": [
        { "component": "reference", "name": "image", "label": "Image" },
        { "component": "text", "name": "imageAlt", "label": "Alt" },
        { "component": "text", "name": "text", "label": "Text" }
      ]
    }
  ]
}
```

#### Multi-Item Block Model Example (container with NO fields):
```json
{
  "definitions": [
    {
      "title": "Cards",
      "id": "cards",
      "plugins": {
        "xwalk": {
          "page": {
            "resourceType": "core/franklin/components/block/v1/block",
            "template": {
              "name": "Cards",
              "filter": "cards"
            }
          }
        }
      }
    },
    {
      "title": "Card",
      "id": "card",
      "plugins": {
        "xwalk": {
          "page": {
            "resourceType": "core/franklin/components/block/v1/block/item",
            "template": {
              "name": "Card",
              "model": "card"
            }
          }
        }
      }
    }
  ],
  "models": [
    {
      "id": "card",
      "fields": [
        {
          "component": "reference",
          "name": "image",
          "label": "Image"
        },
        {
          "component": "richtext",
          "name": "text",
          "label": "Text"
        }
      ]
    }
  ],
  "filters": [
    {
      "id": "cards",
      "components": ["card"]
    }
  ]
}
```

#### Multi-Item Block Model Example (container WITH fields):
```json
{
  "definitions": [
    {
      "title": "Cards Enhanced",
      "id": "cards-enhanced",
      "plugins": {
        "xwalk": {
          "page": {
            "resourceType": "core/franklin/components/block/v1/block",
            "template": {
              "name": "Cards Enhanced",
              "filter": "cards-enhanced",
              "model": "cards-enhanced"
            }
          }
        }
      }
    },
    {
      "title": "Card Enhanced",
      "id": "card-enhanced",
      "plugins": {
        "xwalk": {
          "page": {
            "resourceType": "core/franklin/components/block/v1/block/item",
            "template": {
              "name": "Card Enhanced",
              "model": "card-enhanced"
            }
          }
        }
      }
    }
  ],
  "models": [
    {
      "id": "cards-enhanced",
      "fields": [
        {
          "component": "text",
          "valueType": "string",
          "name": "heading",
          "label": "Main Heading",
          "description": "Main heading displayed above the cards",
          "required": true
        }
      ]
    },
    {
      "id": "card-enhanced",
      "fields": [
        {
          "component": "text",
          "valueType": "string",
          "name": "cardHeading",
          "label": "Card Heading",
          "required": true
        },
        {
          "component": "richtext",
          "valueType": "string",
          "name": "cardBody",
          "label": "Card Body Text",
          "required": true
        },
        {
          "component": "text",
          "valueType": "string",
          "name": "cardCta",
          "label": "Card CTA URL",
          "required": false
        },
        {
          "component": "text",
          "valueType": "string",
          "name": "cardCtaText",
          "label": "Card CTA Button Text",
          "required": false
        }
      ]
    }
  ],
  "filters": [
    {
      "id": "cards-enhanced",
      "components": [
        "card-enhanced"
      ]
    }
  ]
}
```

#### Key Multi-Item Model Patterns:
- **One json file per block**: regardless of block type, a block should never have more than 1 json model file.
- **Container Definition**: `resourceType: "core/franklin/components/block/v1/block"` - always includes `filter` property
- **Item Definition**: `resourceType: "core/franklin/components/block/v1/block/item"` - always includes `model` property
- **Container Model**: Only needed if container has fields (main heading, configuration, etc.) - include `model` property in template
- **Item Model**: Always needed for repeatable items - contains fields for individual items
- **Filter Configuration**: Links container to allowed item components - enables add/remove functionality in Universal Editor

#### When to Use Each Pattern:
- **Single Block Model**: Static blocks with fixed content (hero, banner, single testimonial)
- **Multi-Item Block (no container fields)**: Pure lists without parent fields/headings (basic cards, image gallery)
- **Multi-Item Block (with container fields)**: Lists with parent fields/headings or configuration (cards with titles, themed sections)

- Fields map 1:1 to DOM elements.

#### 📝 Field Naming Conventions
**CRITICAL**: Follow these naming rules to ensure proper Universal Editor functionality:

**🚫 COMPLETELY RESTRICTED Field Names - NEVER use these as field names:**
- **`title`** - Completely forbidden (use `heading`, `cardHeading`, etc. instead)
- **`link`** - Reserved for system use  
- **`text`** - Reserved for system use (except as suffix with base field)
- **`name`** - Reserved for system use
- **`date`** - Reserved for system use

**🚨 COMMON VIOLATIONS ENCOUNTERED:**
- **`cardTitle`** - ❌ FORBIDDEN (title is completely restricted)
- **`heroTitle`** - ❌ FORBIDDEN (title is completely restricted)  
- **`mainTitle`** - ❌ FORBIDDEN (title is completely restricted)
- **✅ CORRECT ALTERNATIVES**: `cardHeading`, `heroHeading`, `mainHeading`

**🚫 RESTRICTED Suffixes - Can ONLY be used with corresponding base fields:**
- **`Title`** - Only for link title attributes (requires base field)
- **`Text`** - Only for link display text (requires base field) 
- **`Alt`** - Only for image alt text (requires corresponding image field)
- **`Type`** - Only for link styling options (requires base field)

**Image Alt Text Fields:**
- **Rule**: Alt fields can only exist if there's a corresponding image field with the same prefix
- **✅ CORRECT Examples**:
  ```json
  { "component": "reference", "name": "icon", "label": "Icon" },
  { "component": "text", "name": "iconAlt", "label": "Icon Alt Text" }
  
  { "component": "reference", "name": "heroImage", "label": "Hero Image" },
  { "component": "text", "name": "heroImageAlt", "label": "Hero Image Alt Text" }
  ```
- **❌ INCORRECT**: Having `iconAlt` without a corresponding `icon` field

**Link-Related Fields:**
- **Rule**: Link suffix fields (`Text`, `Title`, `Type`) can only exist if there's a base link field with the same prefix
- **✅ CORRECT Examples**:
  ```json
  { "component": "text", "name": "aboutUs", "label": "About Us URL" },
  { "component": "text", "name": "aboutUsText", "label": "About Us Link Text" },
  { "component": "text", "name": "aboutUsTitle", "label": "About Us Link Title" },
  { "component": "select", "name": "aboutUsType", "label": "About Us Link Type" }
  
  { "component": "text", "name": "cta", "label": "CTA URL" },
  { "component": "text", "name": "ctaText", "label": "CTA Button Text" }
  ```
- **❌ INCORRECT**: Having `aboutUsText` or `ctaTitle` without corresponding `aboutUs` or `cta` base fields

**Safe Field Naming Patterns:**
- **✅ Use these for standalone fields**: `heading`, `subheading`, `body`, `content`, `description`, `name`
- **✅ Prefixed standalone fields**: `cardHeading`, `cardBody`, `cardContent`, `heroHeading` 
- **❌ AVOID these patterns**: `cardTitle` (title is restricted), `heroText`/`imageAlt`/`linkType` (suffixes without base fields)

**Naming Pattern Rules:**
- **Base field**: `fieldName` (stores the URL for link or image reference)
- **Alt text**: `fieldNameAlt` (for image alt text only)
- **Link text**: `fieldNameText` (display text for links)
- **Link title**: `fieldNameTitle` (title attribute for links)
- **Link type**: `fieldNameType` (select field with options for primary and secondary)

**Field Relationship Validation:**
- Universal Editor validates these relationships at runtime
- Missing base fields will cause authoring and/or linting errors
- Always create the base field before adding suffix fields

#### ⚠️ IMPORTANT: Component Models Registration
- **NEVER directly edit `component-models.json`** - this file is automatically managed
- **Auto-update process**: When you commit changes to individual block `_[block-name].json` model files to GitHub, a script automatically updates `component-models.json` to include all referenced models
- **Workflow**: 
  1. Create/edit your block's `_[block-name].json` file
  2. Commit your changes to GitHub
  3. The registration script automatically updates `component-models.json`
- **Manual edits to `component-models.json` will be overwritten** by the automated process
- Only edit individual block model files (`_[block-name].json`) - never the central registry

### 6. Universal Editor Instrumentation
- Add annotations for editable text, images, alt text.
- Ensure fields are **clearly labeled** and **intuitive** for authors.

**Content Planning Steps:**
1. **Analyze your Figma design** - What content elements does it contain?
2. **Map content to rows** - Create a content plan specific to your block
3. **Identify configuration needs** - What variants or settings does your block support?
4. **Create appropriate test structure** - Match your specific content requirements
5. **Build parsing logic** - Write JavaScript that handles your specific content types

**Testing Checklist:**
- [ ] Content maps correctly to semantic HTML elements
- [ ] Buttons extract properly from wrapper elements
- [ ] Theme/variant classes apply automatically
- [ ] Configuration rows are cleaned up after processing
- [ ] No console errors during decoration

---

## ✅ Acceptance Criteria

- Looks visually within ~2% of the Figma design.
- Keyboard navigation and screen readers fully supported.
- Lighthouse:
  - Performance ≥ 90
  - Accessibility = 100
  - Best Practices ≥ 90
  - SEO ≥ 90
- Variants toggle via root classes.
- Authoring model matches DOM structure.
- JS bundle ≤ 3KB (min+gz).

### 🧪 Universal Editor Compatibility Checklist
- [ ] **DOM Structure**: JavaScript handles Universal Editor's nested `<div><div><p>` structure
- [ ] **Content Extraction**: All content properly extracted from wrapper elements  
- [ ] **Button Parsing**: Links wrapped in formatting elements (`<strong>`, `<em>`) work correctly
- [ ] **Configuration**: Theme and variant settings from text content are applied
- [ ] **Cleanup**: Original DOM elements removed after processing
- [ ] **Grid Integration**: Uses Figma grid variables (`--grid-columns`, `--grid-gutter`, `--grid-margin`)
- [ ] **Responsive**: Content spans correct grid columns at different breakpoints
- [ ] **No Hardcoded Values**: All typography, colors, and spacing use CSS custom properties
- [ ] **🚨 CRITICAL: Empty Item Support**: Newly added Universal Editor items are visible with placeholders
- [ ] **🚨 CRITICAL: moveInstrumentation**: Universal Editor attributes preserved during DOM restructuring
- [ ] **🚨 CRITICAL: Placeholder Styling**: Empty elements have visible placeholder content and appropriate styling

---

## � Common Issues & Troubleshooting

### JavaScript Decoration Problems

**❌ Content not appearing correctly:**
- Check if you're using `.innerHTML` vs `.textContent` appropriately
- Verify row indexing accounts for removed background image row
- Ensure you're handling `<p>` wrapped content from Universal Editor

**🚨 CRITICAL: Empty Universal Editor Items Not Visible:**
```js
// WRONG - Returns null for empty content, making new UE items invisible
function extractCardData(element, row) {
  if (!element.textContent.trim()) {
    return null; // ❌ This breaks Universal Editor workflow
  }
  return cardData;
}

// CORRECT - Always returns data object with placeholders for empty content
function extractCardData(element, row) {
  const cardData = {
    heading: '',
    body: '',
    cta: null,
    ctaText: '',
  };
  // ... extraction logic ...
  return cardData; // ✅ Always returns object, even if empty
}

// WRONG - Doesn't preserve Universal Editor attributes
function createCardElement(cardData, index) {
  const cardContainer = document.createElement('div');
  // ❌ Universal Editor instrumentation lost
  return cardContainer;
}

// CORRECT - Preserves Universal Editor instrumentation
function createCardElement(cardData, index, originalRow = null) {
  const cardContainer = document.createElement('div');
  
  // ✅ ESSENTIAL: Move Universal Editor instrumentation
  if (originalRow) {
    moveInstrumentation(originalRow, cardContainer);
  }
  
  return cardContainer;
}
```

**❌ Buttons not working:**
```js
// WRONG - doesn't handle wrapped links
const buttonText = cell.textContent;

// CORRECT - extracts from existing link or creates new one  
const existingLink = cell.querySelector('a');
if (existingLink) {
  existingLink.className = `button ${buttonClass}`;
  const cleanText = existingLink.textContent.trim();
  existingLink.textContent = cleanText;
}
```

**❌ Theme/variants not applying:**
```js
// WRONG - only checks CSS classes
if (block.classList.contains('dark')) { ... }

// CORRECT - reads from content and applies
const remainingRows = [...block.querySelectorAll('div > div')];
remainingRows.forEach(row => {
  const text = row.textContent.trim().toLowerCase();
  if (['dark', 'light'].includes(text)) {
    block.classList.add(text);
    row.remove();
  }
});
```

### CSS Layout Problems

**❌ Not using grid system:**
```css
/* WRONG - hardcoded values */
.hero-content {
  max-width: 1200px;
  padding: 0 120px;
}

/* CORRECT - uses Figma variables */  
.hero-content {
  max-width: var(--grid-max-width);
  padding: 0 var(--grid-margin);
}
```

### Model Definition Problems

**❌ Wrong model structure for multi-item blocks:**
```json
// WRONG - Single definition for blocks that need repeatable items
{
  "definitions": [
    {
      "title": "Cards",
      "id": "cards",
      "resourceType": "core/franklin/components/block/v1/block"
    }
  ],
  "models": [
    {
      "id": "cards",
      "fields": [
        { "name": "card1Title", "label": "Card 1 Title" },
        { "name": "card2Title", "label": "Card 2 Title" }
      ]
    }
  ]
}
```

**✅ Correct - Two definitions for container + repeatable items:**
```json
// CORRECT - Container + item definitions for dynamic blocks
{
  "definitions": [
    {
      "title": "Cards",
      "id": "cards",
      "resourceType": "core/franklin/components/block/v1/block",
      "template": { "filter": "cards", "model": "cards" }
    },
    {
      "title": "Card", 
      "id": "card",
      "resourceType": "core/franklin/components/block/v1/block/item",
      "template": { "model": "card" }
    }
  ],
  "models": [
    {
      "id": "cards",
      "fields": [
        { "name": "heading", "label": "Main Heading" }
      ]
    },
    {
      "id": "card", 
      "fields": [
        { "name": "cardHeading", "label": "Card Heading" },
        { "name": "cardBody", "label": "Card Body" }
      ]
    }
  ],
  "filters": [
    {
      "id": "cards",
      "components": ["card"]
    }
  ]
}
```

**❌ Incorrect field naming:**
```json
// WRONG - Using restricted suffixes without base fields
{
  "fields": [
    { "name": "cardTitle", "label": "Card Title" },    // ❌ "title" is completely restricted field name
    { "name": "heroText", "label": "Hero Text" },      // ❌ "Text" suffix without base field  
    { "name": "imageAlt", "label": "Image Alt" }        // ❌ "Alt" suffix without base field
  ]
}
```

**🚨 ACTUAL VIOLATIONS FROM REAL PROJECT:**
```json
// These specific field names caused linting failures:
{ "name": "title", "label": "Main Title" },           // ❌ FORBIDDEN - caused build failure
{ "name": "cardTitle", "label": "Card Title" },       // ❌ FORBIDDEN - caused build failure  
{ "name": "heroTitle", "label": "Hero Title" }        // ❌ FORBIDDEN - caused build failure
```

**✅ Correct field naming:**
```json
// CORRECT - Using safe field names or proper suffix patterns
{
  "fields": [
    { "name": "cardHeading", "label": "Card Heading" }, // ✅ Safe standalone field
    { "name": "heroContent", "label": "Hero Content" }, // ✅ Safe standalone field
    { "name": "image", "label": "Hero Image" },         // ✅ Base field for image
    { "name": "imageAlt", "label": "Hero Image Alt" },  // ✅ Valid suffix (has base)
    { "name": "cta", "label": "CTA URL" },              // ✅ Base field for link
    { "name": "ctaText", "label": "CTA Button Text" }   // ✅ Valid suffix (has base)
  ]
}
```

**❌ Missing required properties:**
```json
// WRONG - Missing valueType, descriptions, and validation
{
  "component": "text",
  "name": "heading",
  "label": "Heading"
}
```

**✅ Complete field definitions:**
```json
// CORRECT - Complete field with all recommended properties
{
  "component": "text",
  "valueType": "string",
  "name": "heading",
  "label": "Heading",
  "description": "Main heading displayed above content",
  "required": true,
  "maxLength": 100
}
```

---

## �🔗 References

- [EDS XWalk Boilerplate](https://github.com/adobe-rnd/aem-boilerplate-xwalk)
- [Universal Editor Developer Tutorial](https://www.aem.live/developer/ue-tutorial)
- [Content Modeling Guide](https://www.aem.live/developer/component-model-definitions)
- [Markup, Sections, Blocks](https://www.aem.live/developer/markup-sections-blocks)
