# Block Processing Logic Validation

**Prerequisites**: Block model validation completed (`block-model-validation.md` passed)

## Objective
Validate that the block's JavaScript processing logic correctly handles Universal Editor content structure, properly distinguishes between container and item content, and processes items in the correct order.

## Processing Logic Validation

### 1. **Container vs Child Item Detection**

#### A. **Multi-Item Block Processing Logic**
```javascript
// ✅ CORRECT: Proper container vs item detection
export default async function decorate(block) {
  const rows = [...block.children];
  const containerContent = [];
  const childItems = [];
  const configurationValues = [];
  
  rows.forEach((row, index) => {
    const cells = [...row.children];
    if (!cells.length) return;
    
    const cell = cells[0];
    const textContent = cell.textContent.trim();
    
    // Check for configuration values first
    if (isConfigurationValue(textContent)) {
      configurationValues.push({ value: textContent.toLowerCase(), row });
      return;
    }
    
    // Check for container-level content (main heading, description)
    if (isContainerContent(cell, index, rows)) {
      containerContent.push({ content: cell.innerHTML.trim(), row });
      return;
    }
    
    // Process ALL remaining non-configuration rows as child items
    // Don't be overly restrictive - if it's not config or container, it's likely an item
    childItems.push({ element: cell, row, index });
  });
  
  // Process container content first
  processContainerContent(containerContent, block);
  
  // Process child items in order
  processChildItems(childItems, block);
  
  // Apply configuration
  applyConfiguration(configurationValues, block);
}

// ❌ WRONG: Too restrictive child item detection
export default async function decorate(block) {
  const rows = [...block.children];
  
  rows.forEach((row, index) => {
    // ❌ Only processes rows with specific attributes - too restrictive
    if (row.querySelector('[data-aue-filter="card"]')) {
      processChildItem(row);
    }
    // ❌ Misses valid child items that don't have specific markers
  });
}
```

#### B. **Container Content Detection Logic**
```javascript
// ✅ CORRECT: Identifies container-level content
function isContainerContent(cell, currentIndex, allRows) {
  const textContent = cell.textContent.trim();
  
  // Empty cells are not container content
  if (!textContent) return false;
  
  // Configuration values are not container content
  if (isConfigurationValue(textContent)) return false;
  
  // First non-config row is likely container content (main heading)
  const isFirstContentRow = isFirstNonConfigRow(currentIndex, allRows);
  if (isFirstContentRow) return true;
  
  // Check for container-specific patterns
  const hasContainerAttributes = cell.querySelector('[data-aue-model]') 
    && !cell.querySelector('[data-aue-filter]');
  
  return hasContainerAttributes;
}

function isFirstNonConfigRow(currentIndex, allRows) {
  for (let i = 0; i < allRows.length; i++) {
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

// ❌ WRONG: Assumes first row is always container content
function isContainerContent(cell, currentIndex) {
  return currentIndex === 0; // ❌ Too simplistic - ignores actual content
}
```

### 2. **Child Item Processing Order**

#### A. **Preserve JSON Model Field Order**
```javascript
// ✅ CORRECT: Processes items in document order, preserves field sequence
function processChildItems(childItems, container) {
  const processedItems = [];
  
  // Process items in the order they appear in the DOM
  childItems.forEach((item, index) => {
    const itemData = extractItemData(item.element, item.row);
    const itemElement = createItemElement(itemData, index, item.row);
    processedItems.push(itemElement);
  });
  
  // Append items in order
  processedItems.forEach(item => container.appendChild(item));
}

function extractItemData(element, row) {
  const cells = [...row.children];
  const itemData = {};
  
  // Process cells in order to match JSON model field sequence
  cells.forEach((cell, cellIndex) => {
    const content = cell.innerHTML.trim();
    const textContent = cell.textContent.trim();
    const img = cell.querySelector('img');
    const link = cell.querySelector('a');
    
    // Map to model fields based on cell position and content type
    if (cellIndex === 0 && textContent && !img && !link) {
      itemData.heading = content; // First text cell = heading
    } else if (cellIndex === 1 && textContent && !img && !link) {
      itemData.body = content; // Second text cell = body
    } else if (img) {
      itemData.image = img.src;
      itemData.imageAlt = img.alt || '';
    } else if (link) {
      itemData.ctaUrl = link.href;
      itemData.ctaText = link.textContent.trim();
    }
  });
  
  return itemData;
}

// ❌ WRONG: Random processing order, doesn't preserve field sequence
function processChildItems(childItems, container) {
  // ❌ Processes items randomly or in reverse order
  childItems.reverse().forEach(item => {
    const itemElement = createItemElement(item);
    container.appendChild(itemElement);
  });
}
```

#### B. **Field Order Validation Against Model**
```javascript
// ✅ CORRECT: Validates field order matches model definition
function validateFieldOrder(extractedData, modelFields) {
  const extractedFields = Object.keys(extractedData);
  const expectedFields = modelFields.map(field => field.name);
  
  // Log field order for debugging
  console.log('Extracted fields order:', extractedFields);
  console.log('Expected model order:', expectedFields);
  
  // Ensure all expected fields are present (even if empty)
  expectedFields.forEach(fieldName => {
    if (!(fieldName in extractedData)) {
      extractedData[fieldName] = ''; // Add missing fields as empty
    }
  });
  
  return extractedData;
}

// ❌ WRONG: No validation of field order
function extractItemData(element) {
  return {
    // ❌ Random field order, doesn't match model
    ctaText: '...',
    heading: '...',
    body: '...',
    image: '...'
  };
}
```

### 3. **Row Processing Validation Checks**

#### A. **Non-Restrictive Child Item Detection**
```javascript
// ✅ CORRECT: Processes ALL potential child items
function shouldProcessAsChildItem(cell, index, allRows) {
  const textContent = cell.textContent.trim();
  
  // Skip empty rows
  if (!textContent && !cell.querySelector('img') && !cell.querySelector('a')) {
    return false;
  }
  
  // Skip configuration values
  if (isConfigurationValue(textContent)) {
    return false;
  }
  
  // Skip container content (main heading)
  if (isContainerContent(cell, index, allRows)) {
    return false;
  }
  
  // Process EVERYTHING else as potential child items
  // Don't be restrictive - let the item processing handle edge cases
  return true;
}

// ❌ WRONG: Too restrictive - only processes rows with specific attributes
function shouldProcessAsChildItem(cell) {
  // ❌ Only processes rows with exact filter attributes
  return cell.querySelector('[data-aue-filter="specific-item"]');
  // This misses valid child items without exact markers
}
```

#### B. **Configuration Value Detection**
```javascript
// ✅ CORRECT: Properly identifies configuration values
function isConfigurationValue(text) {
  const configValues = [
    'dark', 'light', 'compact', 'centered', 'wide', 'narrow',
    'true', 'false', 'enabled', 'disabled',
    'left', 'right', 'top', 'bottom'
  ];
  
  return configValues.includes(text.toLowerCase());
}

// Helper to apply configuration
function applyConfiguration(configValues, block) {
  configValues.forEach(({ value, row }) => {
    block.classList.add(value);
    row.remove(); // Clean up after processing
  });
}

// ❌ WRONG: Doesn't identify configuration values
function isConfigurationValue(text) {
  return false; // ❌ All text treated as content
}
```

### 4. **Processing Logic Validation Checklist**

#### Multi-Item Block Processing ✅
- [ ] **Container detection**: Properly identifies main heading/container content
- [ ] **Child item detection**: Processes ALL non-configuration rows as potential items
- [ ] **Configuration handling**: Identifies and applies theme/variant values
- [ ] **Order preservation**: Maintains DOM order for child items
- [ ] **Field sequence**: Extracts fields in model definition order

#### Single Block Processing ✅  
- [ ] **Content extraction**: Properly extracts all content from Universal Editor structure
- [ ] **Field mapping**: Maps content to correct model fields
- [ ] **Configuration handling**: Applies theme/variant classes
- [ ] **Order preservation**: Maintains logical content order

#### Error Handling ✅
- [ ] **Empty content**: Handles rows with no content gracefully
- [ ] **Missing fields**: Provides default values for missing model fields
- [ ] **Invalid structure**: Gracefully handles unexpected DOM structure
- [ ] **Edge cases**: Processes unusual content patterns correctly

## Validation Process

### Step 1: Analyze Current Processing Logic
1. Open `/blocks/<block-name>/<block-name>.js`
2. Locate the main `decorate` function
3. Review row processing logic
4. Check container vs item detection

### Step 2: Check Row Processing Pattern
```javascript
// Look for this pattern in your block:
export default async function decorate(block) {
  const rows = [...block.children];
  
  // ✅ Should categorize rows properly:
  rows.forEach((row, index) => {
    const cell = row.children[0];
    
    if (isConfigurationValue(cell.textContent.trim())) {
      // Handle configuration
    } else if (isContainerContent(cell, index, rows)) {
      // Handle container content
    } else {
      // Process as child item - should be inclusive, not restrictive
    }
  });
}
```

### Step 3: Verify Field Order Mapping
1. Compare JavaScript field extraction order with model JSON
2. Ensure fields are processed in model definition sequence
3. Check that display order matches authoring order

### Step 4: Test Processing Logic
```html
<!-- Test with this structure in your test file -->
<div class="block-name block">
  <div><div><p>Main Heading</p></div></div>        <!-- Container content -->
  <div><div><p>Item 1 Heading</p></div></div>     <!-- Child item 1 -->
  <div><div><p>Item 1 Body</p></div></div>        <!-- Child item 1 -->
  <div><div><p>Item 2 Heading</p></div></div>     <!-- Child item 2 -->
  <div><div><p>Item 2 Body</p></div></div>        <!-- Child item 2 -->
  <div><div><p>dark</p></div></div>               <!-- Configuration -->
</div>
```

### Step 5: Validation Commands
```bash
# Test the block processing
# 1. Start local server
# aem up

# 2. Test processing logic
# Test block processing logic in browser
# Open browser dev tools
# Verify:
# - Container content processed separately from items
# - All non-config rows processed as child items
# - Items appear in correct order
# - Configuration values applied as CSS classes

# 3. Check console for processing logs
# console.log('Container content:', containerContent);
# console.log('Child items processed:', childItems.length);
# console.log('Configuration applied:', configValues);
```

## Success Criteria

### Processing Logic Validation ✅
- **Container Separation**: Container content (headings) processed separately from child items
- **Inclusive Item Detection**: ALL non-configuration rows processed as potential child items
- **Order Preservation**: Child items maintain DOM order and field sequence
- **Configuration Handling**: Theme/variant values properly identified and applied
- **Error Resilience**: Gracefully handles edge cases and missing content

### Expected Behavior ✅
- Main container heading appears once at the top
- Child items (cards, etc.) appear in authored order
- Configuration values applied as CSS classes
- No valid content rows skipped or ignored
- Field order matches model definition sequence

## Common Issues and Fixes

### Issue: Items Not Processing
```javascript
// ❌ PROBLEM: Too restrictive detection
if (row.querySelector('[data-specific-attribute]')) {
  processItem(row);
}

// ✅ SOLUTION: Process all non-config, non-container rows
if (!isConfigurationValue(text) && !isContainerContent(cell, index, rows)) {
  processItem(row); // Process everything else as items
}
```

### Issue: Wrong Item Order
```javascript
// ❌ PROBLEM: Processing in reverse or random order
items.reverse().forEach(processItem);

// ✅ SOLUTION: Maintain DOM order
items.forEach((item, index) => processItem(item, index));
```

### Issue: Container Content Mixed with Items
```javascript
// ❌ PROBLEM: All rows treated as items
rows.forEach(row => processAsItem(row));

// ✅ SOLUTION: Separate container and items
rows.forEach((row, index) => {
  if (isContainerContent(cell, index, rows)) {
    processContainerContent(row);
  } else if (!isConfigurationValue(text)) {
    processAsItem(row);
  }
});
```

After passing this validation, your block's processing logic will correctly handle Universal Editor content structure and maintain proper content organization and order.

## Next Step
After completion, run: `prompts/validation/block-implementation-validation.md` to validate and fix Universal Editor integration issues.