# Analyzer Enhancements Documentation

## Overview

This document describes the improvements made to the Figma EDS MCP Server's analyzer to address issues with detecting UI components vs. content fields, improving semantic analysis, and providing better feedback through confidence scoring.

## Problem Statement

The original analyzer had difficulty with complex Figma designs (like the offer-carousel) because it:
1. **Confused UI components with content**: Navigation buttons, pagination indicators, and carousel controls were sometimes treated as content fields
2. **Lacked semantic understanding**: Couldn't reliably distinguish between headings, descriptions, and other text types
3. **No fallback patterns**: When uncertain, it would generate empty models rather than learning from existing blocks
4. **No transparency**: Users didn't know why certain fields were or weren't detected

## Solution: AnalyzerEnhancements Class

The new `analyzer-enhancements.ts` module provides four key capabilities:

### 1. UI vs Content Detection

**Method**: `classifyElement(elementName, elementCode, context)`

**Purpose**: Distinguish between UI components (navigation, indicators, controls) and actual user content

**Detection Patterns**:
- **Navigation**: Detects chevron, arrow, prev/next buttons → `isUIComponent: true`
- **Indicators**: Detects pagination dots, progress indicators → `isUIComponent: true`
- **Controls**: Detects toggles, dropdowns, close buttons → `isUIComponent: true`
- **Content**: Detects headings, descriptions inside cards/items → `isContentField: true`

**Example**:
```typescript
const classification = enhancements.classifyElement(
  'ChevronForward',
  '<button class="carousel-nav">›</button>',
  'carousel-wrapper'
);
// Result: { isUIComponent: true, elementType: 'navigation', confidence: 95 }
```

### 2. Semantic Content Analysis

**Method**: `analyzeTextContentSemantics(text, fontSize?, fontWeight?)`

**Purpose**: Intelligently determine if text is a heading, description, list, or CTA based on content and styling

**Detection Logic**:
- **Heading**: Short text (<100 chars) + large font (≥24px) OR bold OR capitalized
- **Description**: Medium length (50-500 chars) + multiple sentences
- **List**: Contains bullets (•, -, *) or numbered items
- **CTA**: Contains action keywords ("learn more", "get started", etc.) + short text

**Example**:
```typescript
const semantic = enhancements.analyzeTextContentSemantics(
  'Mover Offers',
  60, // fontSize
  600  // fontWeight
);
// Result: { type: 'heading', confidence: 85, suggestedFieldName: 'heading' }
```

### 3. Similar Block Pattern Fallback

**Method**: `findSimilarBlockPatterns(blockName, characteristics, blocksDir)`

**Purpose**: When confidence is low, search existing blocks for similar patterns and suggest field structures

**Similarity Calculation** (0-100%):
- **30 points**: Name similarity (Levenshtein distance)
- **70 points**: Characteristic matching:
  - Carousel patterns (carousel, slider keywords)
  - Card patterns (card, grid keywords)
  - Multi-item structure (has item models)

**Example**:
```typescript
const patterns = await enhancements.findSimilarBlockPatterns(
  'offer-carousel',
  ['carousel', 'multi-item', 'images', 'cta'],
  '/path/to/blocks'
);
// Result: [{ blockName: 'carousel', similarity: 85, suggestedFields: [...] }]
```

### 4. Confidence Scoring

**Method**: `calculateConfidenceScore(analysis)`

**Purpose**: Provide transparent feedback on analysis quality and suggestions for improvement

**Score Components**:
- **Overall**: (blockType + fieldExtraction) / 2
- **blockType**: Confidence in single vs multi-item determination (0-100)
- **fieldExtraction**: Confidence in extracted fields (0-100)

**Scoring Factors**:
- Multi-item indicators found: +30
- Repeated containers: +20
- Container fields extracted: +20
- Item fields extracted: +30
- CTAs detected: +10
- No code provided: -20
- Missing expected fields: -30 to -40

**Example Output**:
```json
{
  "overall": 75,
  "blockType": 80,
  "fieldExtraction": 70,
  "reasons": [
    "Multi-item indicators found in code structure",
    "Extracted 1 container fields",
    "Extracted 6 item fields"
  ],
  "suggestions": [
    "Provide generated code for better analysis"
  ]
}
```

## Integration with Existing Analyzer

The enhancements are designed to **extend** the existing `DesignAnalyzer`, not replace it:

```typescript
import { DesignAnalyzer } from './figma/analyzer.js';
import { AnalyzerEnhancements } from './figma/analyzer-enhancements.js';

// Run normal analysis
const analyzer = new DesignAnalyzer();
const analysis = await analyzer.analyze(node, rawCode);

// Enhance with new capabilities
const enhancements = new AnalyzerEnhancements();
const enhanced = await enhancements.enhanceAnalysis(
  analysis,
  rawCode,
  blocksDir
);

// Result includes:
// - enhanced.analysis (improved BlockAnalysis)
// - enhanced.confidence (ConfidenceScore)
// - enhanced.similarPatterns (SimilarBlockPattern[])
```

## Usage in MCP Server

To integrate these enhancements into the MCP server's `analyzeBlockStructure` tool:

1. **Import the module**:
```typescript
import { AnalyzerEnhancements } from './figma/analyzer-enhancements.js';
```

2. **Enhance analysis**:
```typescript
const enhancements = new AnalyzerEnhancements();
const result = await enhancements.enhanceAnalysis(
  analysis,
  args.generatedCode,
  path.join(__dirname, '../../blocks') // Path to blocks directory
);
```

3. **Return enhanced results**:
```typescript
return {
  ...result.analysis,
  confidence: result.confidence,
  similarPatterns: result.similarPatterns,
};
```

## Benefits

### For the Offer Carousel Case

The enhancements would have:

1. **Detected UI components**: `ChevronForward`, `ChevronBack`, `IndicatorCountAem` would be classified as UI (navigation/indicators), not content fields

2. **Extracted content fields**: 
   - Container heading: "Mover Offers" (detected as heading, not CTA)
   - Item fields: icon, offerHeading, description, ctaText, cta

3. **Provided confidence**: 
   - Overall: ~75% (good but not perfect)
   - Suggestions: "Consider similar block: carousel (85% match)"

4. **Fallback pattern**: If field extraction failed, would suggest using carousel block's field structure

### General Improvements

- **Accuracy**: Fewer false positives (UI components as content)
- **Completeness**: Better field extraction through semantic analysis
- **Resilience**: Fallback patterns when uncertain
- **Transparency**: Users understand why decisions were made
- **Learning**: System improves by studying existing blocks

## Future Enhancements

Potential improvements to consider:

1. **Machine Learning**: Train a model on existing blocks for better similarity detection
2. **User Feedback Loop**: Allow users to correct analysis and learn from corrections
3. **Pattern Library**: Build a database of common UI patterns to ignore
4. **Cross-block Consistency**: Ensure similar blocks use consistent field names
5. **Interactive Mode**: Ask user for clarification when confidence is low

## Testing

To test the enhancements:

```bash
cd figma-eds-mcp-server
npm run build
npm test
```

To validate on the offer-carousel case:

```typescript
const result = await enhanceAnalysis(offerCarouselAnalysis, figmaCode, blocksDir);
console.log('Confidence:', result.confidence);
console.log('Similar patterns:', result.similarPatterns);
```

Expected result:
- Confidence: 70-80%
- Similar patterns: carousel (85%), card (60%)
- Correct field extraction: heading, icon, offerHeading, description, ctaText, cta

## API Reference

### AnalyzerEnhancements

#### Methods

##### `classifyElement(elementName, elementCode, context): UIElementClassification`
Classify if an element is UI component or content field.

##### `analyzeTextContentSemantics(text, fontSize?, fontWeight?): SemanticContent`
Analyze text content to determine field type (heading, description, list, CTA).

##### `findSimilarBlockPatterns(blockName, characteristics, blocksDir): Promise<SimilarBlockPattern[]>`
Find similar block patterns from existing blocks directory.

##### `calculateConfidenceScore(analysis): ConfidenceScore`
Calculate overall confidence score for analysis.

##### `enhanceAnalysis(analysis, rawCode, blocksDir?): Promise<EnhancedAnalysis>`
Main method to enhance block analysis with all improvements.

### Type Definitions

```typescript
interface UIElementClassification {
  isUIComponent: boolean;
  isContentField: boolean;
  elementType: 'navigation' | 'indicator' | 'control' | 'content' | 'unknown';
  confidence: number; // 0-100
  reasoning: string;
}

interface SemanticContent {
  type: 'heading' | 'description' | 'list' | 'cta' | 'unknown';
  confidence: number; // 0-100
  suggestedFieldName: string;
  suggestedComponent: 'text' | 'richtext' | 'reference';
}

interface SimilarBlockPattern {
  blockName: string;
  similarity: number; // 0-100
  sharedCharacteristics: string[];
  suggestedFields: BlockField[];
}

interface ConfidenceScore {
  overall: number; // 0-100
  blockType: number; // 0-100
  fieldExtraction: number; // 0-100
  reasons: string[];
  suggestions: string[];
}
```

## Conclusion

The analyzer enhancements address the root causes of why the MCP server generated empty models for the offer-carousel block. By distinguishing UI components from content, using semantic analysis, providing fallback patterns, and calculating confidence scores, the system is now more accurate, resilient, and transparent.
