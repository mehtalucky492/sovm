# Block Implementation Validation

**Prerequisites**: Block must be completed with model validation passed (`block-model-validation.md` completed)

## Objective
Validate the complete block implementation for code quality, design system compliance, Universal Editor compatibility, and functional correctness.

## Validation Areas

### 1. **File Structure Validation**

**✅ Required Files Checklist:**
- [ ] `/blocks/<block-name>/<block-name>.js` - Main block logic
- [ ] `/blocks/<block-name>/<block-name>.css` - Block styling
- [ ] `/blocks/<block-name>/_<block-name>.json` - Universal Editor model
- [ ] `/blocks/<block-name>/README.md` - Documentation

**🚫 Common Missing Files:**
```bash
# Check for missing files
ls -la /blocks/<block-name>/
```

### 2. **JavaScript Implementation Validation**

#### A. **Universal Editor DOM Structure Handling**
```javascript
// ✅ CORRECT: Handles Universal Editor nested structure
export default async function decorate(block) {
  const rows = [...block.children];
  
  rows.forEach((row, index) => {
    const cells = [...row.children];
    if (!cells.length) return;
    
    const cell = cells[0];
    const textContent = cell.textContent.trim(); // ✅ Extracts from wrapper
    const img = cell.querySelector('img');       // ✅ Finds nested image
    const link = cell.querySelector('a');        // ✅ Finds nested link
  });
}

// ❌ WRONG: Assumes direct text content
export default async function decorate(block) {
  const content = block.textContent; // ❌ Won't work with UE structure
}
```

#### B. **Empty Universal Editor Items Support**
```javascript
// ✅ CORRECT: Always returns data object for empty items
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

// ✅ CORRECT: Preserves Universal Editor instrumentation
import { moveInstrumentation } from '../../scripts/scripts.js';

function createCardElement(cardData, index, originalRow = null) {
  const cardContainer = document.createElement('div');
  
  if (originalRow) {
    moveInstrumentation(originalRow, cardContainer); // ✅ ESSENTIAL
  }
  
  return cardContainer;
}

// ❌ WRONG: Returns null for empty content
function extractCardData(element, row) {
  if (!element.textContent.trim()) {
    return null; // ❌ Breaks Universal Editor workflow
  }
}
```

#### C. **Responsive Image Handling**
```javascript
// ✅ CORRECT: Uses createOptimizedPicture for responsive images
import { createOptimizedPicture } from '../../scripts/aem.js';

function createCardElement(cardData, index, originalRow = null) {
  const cardContainer = document.createElement('div');
  
  // Create optimized picture element for responsive images
  if (cardData.image) {
    const optimizedPic = createOptimizedPicture(
      cardData.image.src,
      cardData.imageAlt || cardData.heading || 'Card image',
      false, // eager loading for above-the-fold content
      [{ width: '600' }], // breakpoint configuration
    );
    cardContainer.appendChild(optimizedPic);
  }
  
  return cardContainer;
}

// ❌ WRONG: Direct img element without optimization
function createCardElement(cardData) {
  const img = document.createElement('img');
  img.src = cardData.image.src; // ❌ No responsive optimization
  img.alt = cardData.imageAlt;   // ❌ No fallback alt text
  return img;
}

// ❌ WRONG: Manual picture element creation
function createCardElement(cardData) {
  const picture = document.createElement('picture');
  const img = document.createElement('img');
  // ❌ Manual implementation instead of using AEM utility
}
```

#### D. **Configuration Value Processing**
```javascript
// ✅ CORRECT: Processes and removes configuration rows
const configValues = ['dark', 'light', 'compact', 'centered'];
rows.forEach(row => {
  const text = row.textContent.trim().toLowerCase();
  if (configValues.includes(text)) {
    block.classList.add(text);
    row.remove(); // ✅ Clean up after processing
  }
});

// ❌ WRONG: Doesn't handle configuration values
// Missing theme/variant support
```

### 3. **CSS Implementation Validation**

#### A. **Design System Variable Usage**
```css
/* ✅ CORRECT: Uses design system variables */
.block-name {
  max-width: var(--grid-max-width);
  margin: 0 auto;
  padding: var(--spacing-xl) var(--grid-margin);
  font-family: var(--body-font-family);
  color: var(--text-primary);
}

.block-name h2 {
  font-family: var(--heading-font-family);
  font-size: var(--font-size-heading-m);
  font-weight: var(--font-weight-headings);
  line-height: var(--line-height-headings-m);
}

/* ❌ WRONG: Hardcoded values */
.block-name {
  max-width: 1200px;           /* ❌ Should use var(--grid-max-width) */
  padding: 0 120px;            /* ❌ Should use var(--grid-margin) */
  font-family: 'Roboto';       /* ❌ Should use var(--body-font-family) */
  color: #131313;              /* ❌ Should use var(--text-primary) */
}
```

#### B. **Responsive Grid Implementation**
```css
/* ✅ CORRECT: Responsive grid using design system */
.block-name-content {
  display: grid;
  grid-template-columns: repeat(var(--grid-columns), 1fr);
  gap: var(--grid-gutter);
  width: 100%;
}

.block-name-item {
  grid-column: span var(--grid-columns); /* Mobile: full width */
}

@media (width >= 768px) {
  .block-name-item {
    grid-column: span calc(var(--grid-columns) / 2); /* Tablet: half width */
  }
}

@media (width >= 900px) {
  .block-name-content {
    grid-template-columns: repeat(var(--grid-columns-desktop), 1fr);
  }
  
  .block-name-item {
    grid-column: span 6; /* Desktop: half of 12 columns */
  }
}

/* ❌ WRONG: Fixed breakpoints and hardcoded columns */
.block-name-content {
  display: grid;
  grid-template-columns: repeat(2, 1fr); /* ❌ Fixed columns */
  gap: 24px;                             /* ❌ Should use var(--grid-gutter) */
}

@media (max-width: 768px) {              /* ❌ Should use min-width approach */
  .block-name-content {
    grid-template-columns: 1fr;
  }
}
```

#### C. **Universal Editor Empty State Styling**
```css
/* ✅ CORRECT: Placeholder styling for empty items */
[data-placeholder]::before {
  content: attr(data-placeholder);
  color: #999;
  font-style: italic;
  opacity: 0.7;
}

.empty-cta[data-placeholder] {
  background-color: transparent;
  border: 2px dashed #ccc;
  color: #999;
}

.block-name [data-placeholder]:empty::before {
  content: attr(data-placeholder);
  display: inline-block;
  min-height: 1em;
  min-width: 100px;
}

/* ❌ WRONG: No empty state styling */
/* Missing placeholder support for Universal Editor */
```

### 4. **Test File Validation**

#### A. **Simple Test File Structure**
```html
<!-- ✅ CORRECT: /test/<block-name>.html -->
<div class="<block-name> block" data-block-name="<block-name>">
  <div>
    <div>
      <p>Test heading content</p>
    </div>
  </div>
  <div>
    <div>
      <picture>
        <img src="/test/assets/test-image.jpg" alt="Test image" />
      </picture>
    </div>
  </div>
  <div>
    <div>
      <p><a href="#">Test CTA</a></p>
    </div>
  </div>
</div>
```

### 5. **Code Quality Validation**

#### A. **Linting Compliance**
```bash
# ✅ Must pass without errors
npm run lint

# Common issues to check:
# - Trailing spaces
# - Unused imports
# - Function declaration order
# - ESLint rule violations
```

#### B. **Performance Considerations**
```javascript
// ✅ CORRECT: Efficient DOM operations
const fragment = document.createDocumentFragment();
items.forEach(item => {
  const element = createItemElement(item);
  fragment.appendChild(element);
});
container.appendChild(fragment);

// ❌ WRONG: Inefficient DOM operations
items.forEach(item => {
  const element = createItemElement(item);
  container.appendChild(element); // ❌ Multiple DOM writes
});
```

### 6. **Universal Editor Integration Validation**

#### A. **Model Integration Test**
- [ ] Block appears in Universal Editor component picker
- [ ] All model fields render correctly in editing interface
- [ ] Field values save and load properly
- [ ] Add/remove functionality works for multi-item blocks

#### B. **Instrumentation Preservation**
```javascript
// ✅ CORRECT: Preserves editing capabilities
import { moveInstrumentation } from '../../scripts/scripts.js';

rows.forEach((row, index) => {
  const newElement = processRow(row);
  moveInstrumentation(row, newElement); // ✅ ESSENTIAL
  container.appendChild(newElement);
  row.remove();
});

// ❌ WRONG: Loses editing capabilities
rows.forEach(row => {
  const newElement = processRow(row);
  container.appendChild(newElement);
  row.remove(); // ❌ Instrumentation lost
});
```

## Validation Checklist

### File Structure ✅
- [ ] All required files present and properly named
- [ ] Test files created for both simple and Universal Editor structures
- [ ] README.md contains proper documentation

### JavaScript Implementation ✅
- [ ] Handles Universal Editor nested DOM structure correctly
- [ ] Supports empty Universal Editor items with placeholders
- [ ] Preserves instrumentation using moveInstrumentation
- [ ] Uses createOptimizedPicture for responsive image handling
- [ ] Processes configuration values and applies theme classes
- [ ] Uses efficient DOM manipulation patterns

### CSS Implementation ✅
- [ ] Uses design system variables exclusively (no hardcoded values)
- [ ] Implements proper responsive grid system
- [ ] Includes empty state styling for Universal Editor
- [ ] Follows mobile-first responsive approach
- [ ] Proper CSS scoping with block class names

### Code Quality ✅
- [ ] Passes `npm run lint` without errors
- [ ] No console errors during block decoration
- [ ] Efficient performance (no unnecessary DOM operations)
- [ ] Proper error handling for edge cases

### Universal Editor Integration ✅
- [ ] Block appears in component picker
- [ ] All model fields work correctly
- [ ] Editing functionality preserved after decoration
- [ ] Add/remove works for multi-item blocks
- [ ] Field values persist correctly

### Testing ✅
- [ ] Both test files render identically after JavaScript processing
- [ ] Empty card support works correctly
- [ ] Theme/variant classes apply automatically
- [ ] Responsive behavior works across breakpoints

## Final Validation Commands

```bash
# 1. Lint check
npm run lint

# 2. Test the block locally
# Test block functionality in browser

# 3. Check console for errors
# Open browser dev tools and verify no JavaScript errors

# 4. Test responsive behavior
# Resize browser window and verify layout adapts correctly
```

## Success Criteria

After passing all validations:
- ✅ **Functional**: Block renders correctly and all features work
- ✅ **Compliant**: Follows design system and coding standards  
- ✅ **Accessible**: Proper semantic HTML and WCAG compliance
- ✅ **Editable**: Full Universal Editor integration and functionality
- ✅ **Responsive**: Works across all device sizes and breakpoints
- ✅ **Performant**: Efficient code with no unnecessary operations

## Next Steps
After validation passes, the block is ready for:
1. Integration testing in actual AEM environment
2. Content author training and documentation
3. Production deployment consideration
