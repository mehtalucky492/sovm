# Screenshot Analysis Enhancement for Model Generation

## Problem
The current pipeline generates minimal/empty model fields because it only analyzes the React+Tailwind code structure. Visual patterns visible in screenshots (card layouts, repeating elements, content hierarchy) aren't being utilized.

## Solution: Add Screenshot-Based Analysis

### 1. Modify `handleGenerateEdsBlock` in `src/index.ts`

**Current flow (line ~295):**
```typescript
async handleGenerateEdsBlock(params) {
  // Analyze structure from code only
  const analysis = await this.handleAnalyzeBlockStructure({
    generatedCode: params.generatedCode
  });
  
  // Generate files
  await this.generateAllFiles(analysis, params);
}
```

**Enhanced flow:**
```typescript
async handleGenerateEdsBlock(params) {
  // NEW: Pass screenshot to analysis
  const analysis = await this.handleAnalyzeBlockStructure({
    generatedCode: params.generatedCode,
    screenshot: params.screenshot  // Add this
  });
  
  // Generate files with enhanced analysis
  await this.generateAllFiles(analysis, params);
}
```

### 2. Update `handleAnalyzeBlockStructure` in `src/index.ts` (line ~260)

**Add screenshot parameter:**
```typescript
async handleAnalyzeBlockStructure(params: {
  generatedCode: string;
  screenshot?: string;  // NEW: base64 or URL
  metadata?: string;
}) {
  const stubNode = this.createStubFigmaNode();
  
  // NEW: Pass screenshot to analyzer
  const analysis = await this.designAnalyzer.analyze(
    stubNode,
    params.generatedCode,
    params.screenshot  // Add this
  );
  
  return JSON.stringify(analysis);
}
```

### 3. Enhance `DesignAnalyzer.analyze()` in `src/figma/analyzer.ts` (line ~25)

**Current signature:**
```typescript
async analyze(node: FigmaNode, rawCode?: string): Promise<BlockAnalysis>
```

**New signature:**
```typescript
async analyze(
  node: FigmaNode, 
  rawCode?: string,
  screenshot?: string  // NEW
): Promise<BlockAnalysis>
```

**Add visual analysis step:**
```typescript
async analyze(node, rawCode, screenshot) {
  // Existing code analysis
  const processedCode = this.htmlSimplifier.simplify(rawCode);
  const codeSignals = this.parseCodeSignals(processedCode);
  
  // NEW: Visual pattern analysis
  let visualPatterns = null;
  if (screenshot) {
    visualPatterns = await this.analyzeVisualPatterns(screenshot);
  }
  
  // Enhanced content analysis using both code and visual signals
  const content = await this.analyzeContent(
    processedCode, 
    codeSignals,
    visualPatterns  // NEW
  );
  
  return {
    blockType: this.determineBlockType(codeSignals, visualPatterns),
    containerFields: content.containerFields,
    itemFields: content.itemFields,
    // ... rest
  };
}
```

### 4. Create Visual Pattern Analyzer in `src/figma/analyzer.ts`

**Add new method:**
```typescript
/**
 * Analyzes screenshot to detect visual patterns
 * Uses AI vision capabilities to identify:
 * - Card grids and repeating elements
 * - Content hierarchy (headings, body, CTAs)
 * - Image vs logo usage
 * - Button types and actions
 */
private async analyzeVisualPatterns(screenshot: string): Promise<VisualPatterns> {
  // Use Claude's vision capability via prompt
  const prompt = `Analyze this UI screenshot and identify:

1. Layout pattern: Is this a grid of cards, list, hero section, etc?
2. Repeating elements: How many cards/items are visible?
3. Per-item content structure:
   - Does each item have an image or logo?
   - Heading text style (bold/large)?
   - Description text style?
   - Button/CTA presence and text?
4. Container-level content:
   - Section heading above cards?
   - Intro text before items?
5. Content types:
   - Are images decorative photos or brand logos?
   - Are CTAs "Download", "Visit", "Learn More", etc?

Return JSON with structure:
{
  "layoutType": "card-grid" | "list" | "hero",
  "itemCount": number,
  "hasContainerHeading": boolean,
  "itemStructure": {
    "hasImage": boolean,
    "imageType": "photo" | "logo" | "icon",
    "hasHeading": boolean,
    "hasDescription": boolean,
    "hasCta": boolean,
    "ctaType": "download" | "link" | "button"
  }
}`;

  // Call vision model (implementation depends on your setup)
  const visionAnalysis = await this.analyzeWithVision(screenshot, prompt);
  
  return {
    isMultiItem: visionAnalysis.itemCount > 1,
    itemCount: visionAnalysis.itemCount,
    hasContainerHeading: visionAnalysis.hasContainerHeading,
    itemStructure: visionAnalysis.itemStructure,
    suggestedFields: this.inferFieldsFromVisual(visionAnalysis)
  };
}

/**
 * Infers appropriate model fields from visual patterns
 */
private inferFieldsFromVisual(visual: any): FieldSuggestion[] {
  const fields: FieldSuggestion[] = [];
  
  if (visual.itemStructure.hasImage) {
    fields.push({
      name: 'image',
      component: 'reference',
      label: visual.itemStructure.imageType === 'logo' 
        ? 'Organization Logo' 
        : 'Card Image',
      confidence: 'high'
    });
  }
  
  if (visual.itemStructure.hasHeading) {
    fields.push({
      name: 'cardHeading',
      component: 'text',
      label: 'Card Heading',
      confidence: 'high'
    });
  }
  
  if (visual.itemStructure.hasDescription) {
    fields.push({
      name: 'cardDescription',
      component: 'richtext',
      label: 'Card Description',
      confidence: 'high'
    });
  }
  
  if (visual.itemStructure.hasCta) {
    fields.push(
      {
        name: 'cta',
        component: 'text',
        label: 'Button URL',
        confidence: 'high'
      },
      {
        name: 'ctaText',
        component: 'text',
        label: visual.itemStructure.ctaType === 'download'
          ? 'Download Button Text'
          : 'Button Text',
        confidence: 'high'
      }
    );
  }
  
  return fields;
}
```

### 5. Update `analyzeContent()` to merge visual and code signals

**In `src/figma/analyzer.ts` (line ~170):**
```typescript
private async analyzeContent(
  code: string,
  codeSignals: CodeSignals,
  visualPatterns?: VisualPatterns
): Promise<ContentStructure> {
  
  // Existing code-based analysis
  let containerFields = this.analyzeContainerFields(code);
  let itemFields = this.analyzeItemStructure(code);
  
  // NEW: Enhance with visual analysis
  if (visualPatterns?.suggestedFields) {
    // Merge visual field suggestions with code-detected fields
    itemFields = this.mergeFieldSuggestions(
      itemFields,
      visualPatterns.suggestedFields
    );
    
    // Override blockType if visual analysis is confident
    if (visualPatterns.isMultiItem && visualPatterns.itemCount >= 2) {
      this.blockType = 'multi-item';
    }
  }
  
  // If code analysis found no fields but visual analysis did
  if (itemFields.length === 0 && visualPatterns?.suggestedFields) {
    itemFields = visualPatterns.suggestedFields.map(s => ({
      name: s.name,
      type: s.component,
      label: s.label,
      required: false
    }));
  }
  
  return { containerFields, itemFields };
}

/**
 * Merges visual field suggestions with code-detected fields
 * Visual suggestions fill gaps where code analysis missed content
 */
private mergeFieldSuggestions(
  codeFields: BlockField[],
  visualSuggestions: FieldSuggestion[]
): BlockField[] {
  const merged = [...codeFields];
  
  for (const suggestion of visualSuggestions) {
    // Only add if not already detected by code
    const exists = merged.some(f => 
      f.name === suggestion.name || 
      f.label.toLowerCase().includes(suggestion.label.toLowerCase())
    );
    
    if (!exists && suggestion.confidence === 'high') {
      merged.push({
        name: suggestion.name,
        type: suggestion.component,
        label: suggestion.label,
        required: false,
        source: 'visual-analysis'
      });
    }
  }
  
  return merged;
}
```

### 6. Type Definitions

**Add to `src/types/index.ts`:**
```typescript
export interface VisualPatterns {
  isMultiItem: boolean;
  itemCount: number;
  hasContainerHeading: boolean;
  itemStructure: {
    hasImage: boolean;
    imageType: 'photo' | 'logo' | 'icon';
    hasHeading: boolean;
    hasDescription: boolean;
    hasCta: boolean;
    ctaType: 'download' | 'link' | 'button';
  };
  suggestedFields: FieldSuggestion[];
}

export interface FieldSuggestion {
  name: string;
  component: 'text' | 'richtext' | 'reference';
  label: string;
  confidence: 'high' | 'medium' | 'low';
}
```

## Benefits

1. **Fixes empty model problem**: Visual analysis detects content structure even when code parsing misses it
2. **Better field names**: CTA labels based on actual button text ("Download PDF" vs "Visit website")
3. **Accurate multi-item detection**: Counts visible cards instead of guessing from code
4. **Semantic understanding**: Distinguishes logos from photos, downloads from links

## Implementation Priority

1. ✅ Add screenshot parameter to pipeline (quick)
2. ✅ Create `analyzeVisualPatterns()` method (medium)
3. ✅ Implement field merging logic (medium)
4. ⚠️ Set up vision model integration (depends on your AI setup)

## Usage Example

```typescript
// In your prompt or code:
const result = await mcp_aem-eds-mcp_generateEdsBlock({
  blockName: 'info-cards',
  outputPath: './blocks/info-cards',
  generatedCode: reactTailwindCode,
  screenshot: screenshotBase64,  // NEW: Include this
  persistContext: true
});
```

The screenshot analysis will detect the card grid, identify 8 cards with logos/images, recognize the "Download PDF" and "Visit website" CTAs, and generate a complete model with appropriate fields instead of an empty one.
