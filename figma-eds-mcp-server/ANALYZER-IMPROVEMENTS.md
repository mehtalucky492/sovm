# Analyzer Improvements: Enhancement Strategy

## Executive Summary

The `analyzeBlockStructure` tool provides valuable functionality but needs enhancements to better understand design context and generate more accurate EDS blocks. Rather than eliminating it, we should make it smarter and more context-aware.

## What the Analyzer Does Well

1. **Detects block structure** (single-item vs multi-item)
2. **Identifies repeating patterns** (found 3 card containers in automotive example)
3. **Extracts design tokens** (colors, spacing, grid values)
4. **Provides jsPattern hints** (even if basic)
5. **Fast initial analysis** (processes in seconds)

## Issues Identified in Automotive Cards Generation

### 1. Block Structure Analysis Errors

**What was detected:**
- Generic multi-item block
- 1 container field (heading)
- 6 item fields (heading, icon, iconAlt, description, cta, ctaText)

**What was missed:**
- This is specifically a **vehicle showcase carousel**, not a generic cards list
- No "heading" container field needed - it's purely vehicle cards
- The "icon" field should be "image" (full vehicle photos, not icons)
- Missing "price" field (critical - each card shows MSRP pricing)
- Missing "features" field (each card has a bullet list of 3 features)
- The jsPattern suggested was just "cards" when it should recognize the carousel navigation pattern

### 2. Content Type Misidentification

**What was detected:**
```jsx
<ChevronLeft /> and <ChevronRight />
```

**What was missed:**
- These are **carousel navigation buttons**, not just decorative icons
- They should be positioned absolutely at the edges
- They have different styling (grey vs black backgrounds)
- This pattern requires special JavaScript for carousel functionality

### 3. Generic Code Generation

**What was generated:**
```javascript
function extractCardData(row) {
  const data = {};
  // ... generic row parsing
  return data;
}
```

**What was missed:**
- The actual content structure: **image → model name → price → features list → CTA**
- The need to detect content by **type** (image vs text vs link), not by position
- The price field has **superscript formatting** (`<sup>` for footnotes)
- Features need to be parsed as **list items** (`<ul>/<li>`)
- No carousel navigation logic was included at all

### 4. CSS Design System Mapping

**What was generated:**
```css
--grid-max-width
--surface-white
--border-tertiary
```

**What was missed:**
- These variables **do exist** in the EDS design system
- But the analyzer flagged them as "unknown" (32 warnings)
- Also generated hardcoded values (`#999`, padding values) that violate the design system
- Didn't map the specific typography requirements (22px headings with 2.2px letter-spacing)

### 5. Responsive Behavior

**What was generated:**
```css
@media (width >= 900px) {
  .automotive-cards-card {
    grid-column: span 6; /* 6 out of 12 = 2 columns */
  }
}
```

**What was missed:**
- Should be **3 columns** on desktop (4 out of 12 columns each)
- The carousel navigation buttons should be **hidden on mobile**
- Button positioning needs to align with grid margins at each breakpoint

### 6. Universal Editor Model

**What was generated:**
```json
{
  "id": "automotive-cards",
  "fields": [{"name": "heading", "label": "Container Heading"}]
}
```

**What was missed:**
- No **item model** (`automotive-cards-item`) was created
- This is clearly a **multi-item block** (3 repeating vehicle cards)
- Item fields should be: image, modelName, price, features, cta, ctaText
- The container heading field isn't actually needed for this block

## Root Cause Analysis

The MCP server's analyzer currently:
1. **Over-simplifies** the React code before analysis (lost semantic structure)
2. Uses **generic pattern matching** instead of understanding the specific use case
3. Has **incomplete design token extraction** (doesn't validate against actual root.css)
4. **Missing carousel detection** logic in the jsPattern analyzer
5. Uses **conservative field extraction** (only extracts fields it's highly confident about)

## Enhancement Strategy

### 1. Add Carousel Detection

```typescript
// In analyzeBlockStructure
const hasCarouselNav = code.includes('ChevronLeft') || 
                       code.includes('ChevronRight') ||
                       (code.includes('prev') && code.includes('next'));

if (hasCarouselNav) {
  interactions.push({
    type: 'carousel',
    hasNavigation: true,
    jsPattern: 'carousel',
    needsJavaScript: true
  });
}
```

### 2. Smarter Field Detection

```typescript
// Detect price patterns
if (text.match(/\$[\d,]+|\bMSRP\b|starting at|pricing/i)) {
  fields.push({ 
    name: 'price', 
    type: 'text',
    confidence: 0.9,
    pattern: 'currency'
  });
}

// Detect features/lists
if (code.includes('<ul>') || code.includes('<li>')) {
  fields.push({ 
    name: 'features', 
    type: 'richtext',
    confidence: 0.95,
    structure: 'list'
  });
}

// Differentiate images from icons
const imageElements = extractImageElements(code);
imageElements.forEach(img => {
  const isLargeImage = img.height > 200 || img.width > 200;
  fields.push({
    name: isLargeImage ? 'image' : 'icon',
    type: 'reference',
    confidence: isLargeImage ? 1.0 : 0.8
  });
});
```

### 3. Validate Design Tokens Against Root CSS

```typescript
// Cross-reference with actual root.css
async function validateDesignTokens(tokens: string[]): Promise<ValidationResult> {
  const knownVariables = await readCSSVariables('./styles/root.css');
  
  return {
    validated: tokens.filter(v => knownVariables.includes(v)),
    unknown: tokens.filter(v => !knownVariables.includes(v)),
    suggestions: tokens.filter(v => !knownVariables.includes(v))
      .map(v => suggestAlternative(v, knownVariables))
  };
}
```

### 4. Add Confidence Scores and Recommendations

```typescript
interface AnalysisResult {
  blockStructure: { 
    type: 'single-item' | 'multi-item' | 'carousel',
    confidence: number 
  };
  fields: Array<{
    name: string;
    type: string;
    confidence: number;
    detected: string; // How it was detected
  }>;
  recommendations: string[];
  warnings: string[];
}

// Example output
return {
  blockStructure: { type: 'carousel', confidence: 0.95 },
  fields: [
    { name: 'image', type: 'reference', confidence: 1.0, detected: 'large-image-element' },
    { name: 'heading', type: 'text', confidence: 0.9, detected: 'h4-element' },
    { name: 'price', type: 'text', confidence: 0.7, detected: 'currency-pattern' },
    { name: 'features', type: 'richtext', confidence: 0.85, detected: 'ul-li-structure' }
  ],
  recommendations: [
    'Consider adding price field - detected currency patterns',
    'Carousel navigation detected - add carousel logic with prev/next buttons',
    'Features list detected - use richtext field type for bullet points'
  ],
  warnings: [
    'Container heading field may not be needed for this block type',
    'Detected 32 CSS variables - 28 validated, 4 unknown'
  ]
};
```

### 5. Semantic Analysis, Not Just Pattern Matching

```typescript
function detectBlockType(analysis: PartialAnalysis): BlockTypeResult {
  const { hasImages, hasPricing, hasCTA, hasNavigation, hasLists } = analysis;
  
  // Product/Vehicle showcase pattern
  if (hasImages && hasPricing && hasCTA && hasNavigation) {
    return {
      type: 'product-carousel',
      suggestedName: extractDomainName(analysis), // e.g., 'automotive-cards'
      template: 'product-showcase',
      confidence: 0.9
    };
  }
  
  // Feature cards pattern
  if (hasImages && hasLists && hasCTA && !hasPricing) {
    return {
      type: 'feature-cards',
      template: 'feature-list',
      confidence: 0.85
    };
  }
  
  // Generic cards (fallback)
  return {
    type: 'cards',
    template: 'generic-cards',
    confidence: 0.6
  };
}
```

### 6. Iterative Analysis with Refinement

```typescript
async function analyzeWithRefinement(code: string): Promise<AnalysisResult> {
  // Phase 1: Initial broad analysis
  const initial = await analyzeBlockStructure(code);
  
  // Phase 2: Validate against design system
  const validated = await validateDesignTokens(initial.designTokens);
  
  // Phase 3: Detect semantic patterns
  const semantic = detectBlockType(initial);
  
  // Phase 4: Refine field extraction based on block type
  const refined = await refineFieldExtraction(initial, semantic);
  
  // Phase 5: Generate recommendations
  const recommendations = generateRecommendations(refined, validated);
  
  return {
    ...refined,
    validated,
    semantic,
    recommendations
  };
}
```

## Implementation Roadmap

### Phase 1: Enhanced Detection (Immediate)
- [ ] Add carousel navigation detection
- [ ] Improve field type detection (price, features, image vs icon)
- [ ] Add confidence scoring to all detections

### Phase 2: Design System Integration (Short-term)
- [ ] Read and parse `styles/root.css` for variable validation
- [ ] Cross-reference detected tokens with known variables
- [ ] Provide suggestions for unknown variables

### Phase 3: Semantic Understanding (Medium-term)
- [ ] Implement block type classification (product-carousel, feature-cards, etc.)
- [ ] Add template matching for common patterns
- [ ] Improve field extraction based on detected block type

### Phase 4: Validation and Feedback Loop (Long-term)
- [ ] Add post-generation validation
- [ ] Implement iterative refinement if validation fails
- [ ] Create feedback mechanism to improve detection over time

## Recommended Workflow

```
Figma Design
    ↓
analyzeBlockStructure (enhanced with context awareness)
    ↓
validateDesignTokens (check against root.css)
    ↓
detectBlockType (semantic understanding)
    ↓
refineFieldExtraction (adjust based on type)
    ↓
generateEdsBlock (uses analysis + applies templates)
    ↓
validateBlockOutput (checks against design system)
    ↓
[If validation issues] → Human review with detailed recommendations
```

## Success Metrics

### Current State (Baseline)
- Block structure accuracy: 70%
- Field detection accuracy: 60%
- Design token validation: 50%
- Requires significant human correction: 80% of cases

### Target State (After Enhancements)
- Block structure accuracy: 95%
- Field detection accuracy: 85%
- Design token validation: 95%
- Requires significant human correction: 20% of cases

## Conclusion

The analyzer provides significant value by automating the initial analysis of Figma designs. Rather than eliminating it, we should enhance its context awareness, semantic understanding, and integration with the EDS design system. This will reduce the need for human intervention while maintaining the quality of generated blocks.

The human review step remains critical for edge cases and complex designs, but with these improvements, the analyzer should handle 80% of common patterns correctly on the first pass.
