# Adobe EDS XWalk Code Kit - AI Agent Instructions

## Project Architecture

This is an **Adobe Edge Delivery Services (EDS) XWalk** project that transforms Figma designs into production-ready web components. The codebase bridges design systems with Universal Editor for content authoring.

### Core Structure
- `/blocks/[block-name]/` - Reusable UI components (CSS/JS + Universal Editor models only)
- `/styles/` - EY design system foundation with CSS custom properties from Figma tokens
- `/models/` - Universal Editor schema definitions that control authoring UI
- `/scripts/` - Core EDS framework and utility functions
- `/figma-eds-mcp-server/` - MCP server for automated Figma-to-block generation

## Block Development Rules

### Required File Structure
**Every block must have exactly 3 files:**
```
/blocks/[block-name]/
├── [block-name].css     # Scoped styles using CSS variables ONLY
├── [block-name].js      # Universal Editor compatible decoration
└── _[block-name].json   # Container model for authoring UI
```

### Universal Editor Architecture

**Critical**: The same block files (JS/CSS/JSON) serve BOTH authoring AND rendering:

#### In Universal Editor (Authoring UI)
Authors edit content through forms defined by model JSON:
- **Container model fields** = editable block-level content (main heading, intro text)
- **Item model fields** = editable repeating content (card heading, card text)
- Better UX than row-based editing for structured content

#### On Published Site (DOM Rendering)
JavaScript extracts content from rows that Universal Editor generates:
```html
<div class="block-name block">
  <div><div><p>Text content</p></div></div>
  <div><div><picture><img src="..."/></picture></div></div>
  <div><div><p><a href="...">Button</a></p></div></div>
  <div><div><p>configuration-value</p></div></div>
</div>
```

**Key Insight**: Content is authored via model fields but rendered via row extraction. Both use the same source content.

### JavaScript Pattern (Content-Type Detection)
**NEVER use position-based processing** (`if (index === 0)`). Always detect by content type:
```javascript
export default async function decorate(block) {
  const rows = [...block.children];
  
  rows.forEach((row) => {
    const cell = row.children[0];
    const img = cell.querySelector('img');
    const link = cell.querySelector('a');
    const textContent = cell.textContent.trim();
    
    if (img && img.src) {
      // Handle images
    } else if (link) {
      // Handle buttons/CTAs
    } else if (['dark', 'light', 'centered', 'compact'].includes(textContent.toLowerCase())) {
      // Handle configuration values
      block.classList.add(textContent.toLowerCase());
      row.remove();
    } else if (textContent) {
      // Handle text content
    }
  });
}
```

### Image Optimization with createOptimizedPicture
**Always use `createOptimizedPicture`** for images to ensure responsive, optimized delivery:
```javascript
import { createOptimizedPicture } from '../../scripts/aem.js';

// When processing an img element from Universal Editor content
const img = cell.querySelector('img');
if (img && img.src) {
  const optimizedPic = createOptimizedPicture(
    img.src,                                    // Source URL
    img.alt || 'Default alt text',             // Alt text (fallback if missing)
    false,                                      // Eager loading (true) or lazy (false)
    [{ width: '750' }]                         // Breakpoints array
  );
  container.appendChild(optimizedPic);
}
```

**Key parameters:**
- `src` - Image source URL from the original img element
- `alt` - Alt text from img.alt, with fallback to meaningful default
- `eager` - Set to `true` for above-the-fold images, `false` for lazy loading
- `breakpoints` - Array of width objects for responsive images (e.g., `[{ width: '48' }]` for icons, `[{ width: '750' }]` for content images)

### CSS Design System (EY Theme)
**Mandatory:** Use CSS variables exclusively from `/styles/root.css`:
```css
/* ✅ CORRECT - Use EY design tokens */
.hero h1 {
  color: var(--text-primary);
  font-size: var(--font-size-heading-xl);
  font-family: var(--heading-font-family); /* EY Interstate */
}

/* ❌ WRONG - Never hardcode */
.hero h1 {
  color: #fff;
  font-size: 32px;
  font-family: Arial;
}
```

### Universal Editor Integration
**Critical:** Use `moveInstrumentation()` to preserve authoring data attributes:
```javascript
import { moveInstrumentation } from '../../scripts/scripts.js';

// When creating new elements from Universal Editor rows
moveInstrumentation(sourceRow, newElement);
sourceRow.remove();
```

## Figma Integration Workflow

### Automated Block Generation
1. **MCP Server Setup**: Figma EDS MCP server provides automated generation
2. **Tools Available**:
   - `mcp_aem-eds-mcp_analyzeBlockStructure` - Analyze Figma design structure
   - `mcp_aem-eds-mcp_generateEdsBlock` - Generate complete EDS block
   - `mcp_aem-eds-mcp_validateBlockOutput` - Quality validation

### Universal Editor Model Patterns

**CRITICAL**: There should always be **only one JSON model file** per block (`_[block-name].json`), containing both container and item definitions if applicable.

#### Single-Item Block Model
For blocks with no repeating child items:
```json
{
  "definitions": [
    {
      "title": "Block Name",
      "id": "block-name",
      "plugins": {
        "xwalk": {
          "page": {
            "resourceType": "core/franklin/components/block/v1/block",
            "template": {
              "name": "Block Name",
              "model": "block-name"
            }
          }
        }
      }
    }
  ],
  "models": [
    {
      "id": "block-name",
      "fields": [
        {"name": "heading", "component": "text", "label": "Main Heading"},
        {"name": "introText", "component": "richtext", "label": "Introduction"}
      ]
    }
  ],
  "filters": []
}
```

#### Multi-Item Block Model (Container + Item)
For blocks with parent-child relationships, include both container and item models in the **same file**:
```json
{
  "definitions": [
    {
      "title": "Block Name",
      "id": "block-name",
      "plugins": {
        "xwalk": {
          "page": {
            "resourceType": "core/franklin/components/block/v1/block",
            "template": {
              "name": "Block Name",
              "model": "block-name"
            }
          }
        }
      }
    },
    {
      "title": "Block Name Item",
      "id": "block-name-item",
      "plugins": {
        "xwalk": {
          "page": {
            "resourceType": "core/franklin/components/block/v1/block",
            "template": {
              "name": "Block Name Item",
              "model": "block-name-item"
            }
          }
        }
      }
    }
  ],
  "models": [
    {
      "id": "block-name",
      "fields": [
        {"name": "heading", "component": "text", "label": "Container Heading"}
      ]
    },
    {
      "id": "block-name-item",
      "fields": [
        {"name": "icon", "component": "reference"},
        {"name": "itemHeading", "component": "text"},
        {"name": "description", "component": "richtext"}
      ]
    }
  ],
  "filters": []
}
```

**Both models work together**: Container fields edited once, item fields edited per-item.

#### Field Naming Rules

**✅ CORRECT - Safe field names:**
```json
{
  "fields": [
    { "name": "heading", "label": "Main Heading" },
    { "name": "cardHeading", "label": "Card Heading" },
    { "name": "cta", "label": "CTA URL" },
    { "name": "ctaText", "label": "CTA Button Text" }
  ]
}
```

**❌ FORBIDDEN - Restricted field names:**
```json
{
  "fields": [
    { "name": "title", "label": "Title" },        // Completely forbidden - use "heading" instead
    { "name": "cardTitle", "label": "Card Title" }, // Completely forbidden - use "cardHeading" instead
    { "name": "imageAlt", "label": "Alt Text" }   // Missing base 'image' field - must have 'image' field first
  ]
}
```

**Key Rules:**
- Never use `title` or any variant with `Title` suffix - use `heading` instead
- If using compound names like `imageAlt`, ensure the base field (`image`) exists
- Use descriptive prefixes for item-level fields to avoid conflicts

### Block Registration
After creating a block, add it to `/models/_section.json`:
```json
{
  "definitions": [
    {
      "title": "Section",
      "id": "section",
      "plugins": {
        "xwalk": {
          "page": {
            "resourceType": "core/franklin/components/section/v1/section",
            "template": {
              "model": "section"
            }
          }
        }
      }
    }
  ],
  "models": [
    {
      "id": "section",
      "fields": [
        {
          "component": "text",
          "name": "name",
          "label": "Section Name"
        }
      ]
    }
  ],
  "filters": [
    {
      "id": "section",
      "components": [
        "accordion",
        "cards",
        "hero",
        "new-block-name"    // ← Add your new block here
      ]
    }
  ]
}
```
Then run: `npm run build:json`

## Development Workflow

### Essential Commands
```bash
# Code Quality (run before commits)
npm run lint              # ESLint + Stylelint validation
npm run lint:fix          # Auto-fix linting issues

# Model Updates (after editing /models/)
npm run build:json        # Rebuild Universal Editor models

# Local Development
aem up                    # Start EDS proxy at localhost:3000
```

### EY Design Patterns

#### Gradient Borders (Brand Pattern)
Use container-padding approach for multi-color gradients:
```css
.card-container {
  background: linear-gradient(to bottom, #32FFFF, #B4FF00, #FFD500);
  padding: 4px; /* Border width */
}
.card-content {
  background: var(--surface-black);
  width: 100%;
  height: 100%;
}
```

#### Typography (EY Interstate)
All typography automatically uses EY Interstate via CSS variables:
```css
/* Headings automatically use --heading-font-family: 'EY Interstate' */
/* Body text automatically uses --body-font-family: 'EY Interstate' */
```

## Quality Standards

### Code Requirements
- **Linting**: Zero ESLint/Stylelint errors
- **Design System**: CSS variables only, no hardcoded values
- **Performance**: CSS ≤5KB, JS ≤3KB (minified+gzipped)
- **Accessibility**: WCAG 2.1 AA compliance

### Critical Anti-Patterns
- Position-based content processing (`if (index === 0)`)
- Hardcoded colors, fonts, or spacing values
- Missing `moveInstrumentation()` calls
- Creating README.md or icon.svg files in blocks
- Complex z-index solutions (use container-padding pattern)

## Architecture Philosophy

This codebase prioritizes:
1. **Design System Consistency** - Brand compliance via CSS variables
2. **Universal Editor Compatibility** - Content authoring workflow support
3. **Automated Figma Integration** - MCP-powered design-to-code pipeline
4. **Minimal File Structure** - 3 files per block maximum

Focus on content-type detection, design token usage, and Universal Editor compatibility over traditional web development patterns.