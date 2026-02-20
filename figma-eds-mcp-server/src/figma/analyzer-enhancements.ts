/**
 * Enhanced Analyzer Features
 * 
 * This module provides improvements to the base DesignAnalyzer:
 * 1. UI vs Content Detection - Distinguish navigation/controls from actual content
 * 2. Semantic Content Analysis - Better heading/description pattern recognition
 * 3. Similar Block Fallback - Learn from existing block patterns
 * 4. Confidence Scoring - Provide transparency on analysis quality
 */

import { BlockAnalysis } from '../types.js';
import { BlockField } from '../interfaces.js';
import * as fs from 'fs-extra';
import * as path from 'path';

/**
 * Confidence score for analysis decisions
 */
export interface ConfidenceScore {
  overall: number; // 0-100
  blockType: number; // Confidence in single vs multi-item determination
  fieldExtraction: number; // Confidence in field structure
  reasons: string[]; // Why this confidence level
  suggestions: string[]; // What could improve it
}

/**
 * UI Element Classification
 */
export interface UIElementClassification {
  isUIComponent: boolean; // true if navigation, indicator, or control
  isContentField: boolean; // true if actual user content
  elementType: 'navigation' | 'indicator' | 'control' | 'content' | 'unknown';
  confidence: number; // 0-100
  reasoning: string;
}

/**
 * Semantic Content Analysis Result
 */
export interface SemanticContent {
  type: 'heading' | 'description' | 'list' | 'cta' | 'unknown';
  confidence: number;
  suggestedFieldName: string;
  suggestedComponent: 'text' | 'richtext' | 'reference';
}

/**
 * Similar Block Pattern
 */
export interface SimilarBlockPattern {
  blockName: string;
  similarity: number; // 0-100
  sharedCharacteristics: string[];
  suggestedFields: BlockField[];
}

export class AnalyzerEnhancements {
  private existingBlocksCache: Map<string, any> = new Map();

  /**
   * Classify if an element is UI component or content
   */
  classifyElement(elementName: string, elementCode: string, context: string): UIElementClassification {
    const lowerName = elementName.toLowerCase();
    const lowerCode = elementCode.toLowerCase();
    
    // Navigation button patterns
    const navKeywords = [
      'chevron', 'arrow', 'prev', 'next', 'forward', 'back',
      'carousel-nav', 'slide-nav', 'button-nav'
    ];
    
    if (navKeywords.some(k => lowerName.includes(k) || lowerCode.includes(k))) {
      return {
        isUIComponent: true,
        isContentField: false,
        elementType: 'navigation',
        confidence: 95,
        reasoning: 'Detected navigation button pattern (chevron, arrow, prev/next)',
      };
    }

    // Indicator patterns (pagination dots, progress indicators)
    const indicatorKeywords = [
      'indicator', 'dot', 'pagination', 'progress', 'stepper',
      'carousel-indicator', 'slide-indicator'
    ];
    
    if (indicatorKeywords.some(k => lowerName.includes(k) || lowerCode.includes(k))) {
      return {
        isUIComponent: true,
        isContentField: false,
        elementType: 'indicator',
        confidence: 90,
        reasoning: 'Detected pagination/progress indicator pattern',
      };
    }

    // Generic control patterns
    const controlKeywords = [
      'control', 'toggle', 'switch', 'dropdown', 'menu',
      'close', 'dismiss', 'overlay'
    ];
    
    if (controlKeywords.some(k => lowerName.includes(k) || lowerCode.includes(k))) {
      return {
        isUIComponent: true,
        isContentField: false,
        elementType: 'control',
        confidence: 85,
        reasoning: 'Detected UI control pattern (toggle, close, menu)',
      };
    }

    // Content patterns (headings, descriptions, CTAs inside cards/items)
    const contentKeywords = [
      'heading', 'title', 'description', 'text', 'content',
      'card-', 'item-', 'offer-'
    ];
    
    // Check if it's inside a repeating content structure
    const isInRepeatingStructure = context.includes('card') || 
                                    context.includes('item') || 
                                    context.includes('slide');
    
    if (contentKeywords.some(k => lowerName.includes(k)) && isInRepeatingStructure) {
      return {
        isUIComponent: false,
        isContentField: true,
        elementType: 'content',
        confidence: 80,
        reasoning: 'Detected content field inside repeating structure',
      };
    }

    // Default to unknown with low confidence
    return {
      isUIComponent: false,
      isContentField: false,
      elementType: 'unknown',
      confidence: 30,
      reasoning: 'Could not determine element type with confidence',
    };
  }

  /**
   * Analyze text content semantically to determine field type
   */
  analyzeTextContentSemantics(text: string, fontSize?: number, fontWeight?: number): SemanticContent {
    const textLength = text.length;
    const wordCount = text.split(/\s+/).length;
    
    // Heading detection
    const isShortText = textLength < 100 && wordCount < 15;
    const isLargeText = fontSize && fontSize >= 24;
    const isBold = fontWeight && fontWeight >= 600;
    const isCapitalized = text === text.toUpperCase() || /^[A-Z]/.test(text);
    
    if (isShortText && (isLargeText || isBold || isCapitalized)) {
      return {
        type: 'heading',
        confidence: 85,
        suggestedFieldName: 'heading',
        suggestedComponent: 'text',
      };
    }

    // Description detection
    const isMediumText = textLength >= 50 && textLength <= 500;
    const hasMultipleSentences = (text.match(/\./g) || []).length >= 2;
    
    if (isMediumText || hasMultipleSentences) {
      return {
        type: 'description',
        confidence: 75,
        suggestedFieldName: 'description',
        suggestedComponent: 'richtext',
      };
    }

    // List detection
    const hasBullets = /[•\-*]\s+|^\d+\.\s+/m.test(text);
    const hasMultipleLines = text.split('\n').filter(l => l.trim()).length > 2;
    
    if (hasBullets || hasMultipleLines) {
      return {
        type: 'list',
        confidence: 80,
        suggestedFieldName: 'richContent',
        suggestedComponent: 'richtext',
      };
    }

    // CTA detection
    const ctaKeywords = [
      'learn more', 'get started', 'sign up', 'subscribe', 'buy now',
      'add to cart', 'view details', 'explore', 'discover', 'shop now'
    ];
    
    const lowerText = text.toLowerCase();
    const isCTA = ctaKeywords.some(k => lowerText.includes(k));
    
    if (isCTA && isShortText) {
      return {
        type: 'cta',
        confidence: 90,
        suggestedFieldName: 'ctaText',
        suggestedComponent: 'text',
      };
    }

    // Unknown type with low confidence
    return {
      type: 'unknown',
      confidence: 40,
      suggestedFieldName: 'text',
      suggestedComponent: 'text',
    };
  }

  /**
   * Find similar block patterns from existing blocks
   */
  async findSimilarBlockPatterns(
    blockName: string, 
    characteristics: string[],
    blocksDir: string
  ): Promise<SimilarBlockPattern[]> {
    const patterns: SimilarBlockPattern[] = [];

    try {
      // Check if blocks directory exists
      if (!await fs.pathExists(blocksDir)) {
        return [];
      }

      // Read all block directories
      const blockDirs = await fs.readdir(blocksDir);
      
      for (const dir of blockDirs) {
        const blockPath = path.join(blocksDir, dir);
        const modelPath = path.join(blockPath, `_${dir}.json`);
        
        // Skip if model file doesn't exist
        if (!await fs.pathExists(modelPath)) {
          continue;
        }

        // Read and parse the model
        const modelContent = await fs.readJSON(modelPath);
        
        // Calculate similarity based on characteristics
        const similarity = this.calculateSimilarity(blockName, dir, characteristics, modelContent);
        
        if (similarity > 40) { // Only include if >40% similar
          const suggestedFields = this.extractFieldsFromModel(modelContent);
          
          patterns.push({
            blockName: dir,
            similarity,
            sharedCharacteristics: this.findSharedCharacteristics(characteristics, modelContent),
            suggestedFields,
          });
        }
      }
    } catch (error) {
      console.warn('Error finding similar block patterns:', error);
    }

    // Sort by similarity (highest first)
    return patterns.sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * Calculate similarity between two blocks
   */
  private calculateSimilarity(
    blockName: string,
    existingBlockName: string,
    characteristics: string[],
    existingModel: any
  ): number {
    let score = 0;
    let maxScore = 0;

    // Name similarity (30 points)
    maxScore += 30;
    const nameSimilarity = this.stringSimilarity(blockName, existingBlockName);
    score += nameSimilarity * 30;

    // Characteristic matching (70 points)
    maxScore += 70;
    
    // Check for carousel patterns
    const isCarousel = characteristics.some(c => c.includes('carousel') || c.includes('slider'));
    const hasCarouselInName = existingBlockName.includes('carousel') || existingBlockName.includes('slider');
    if (isCarousel && hasCarouselInName) {
      score += 35;
    }

    // Check for card patterns
    const isCards = characteristics.some(c => c.includes('card') || c.includes('grid'));
    const hasCardsInName = existingBlockName.includes('card');
    if (isCards && hasCardsInName) {
      score += 35;
    }

    // Check for multi-item structure
    const hasItems = existingModel.filters && existingModel.filters.length > 0;
    const needsItems = characteristics.some(c => c.includes('multi-item') || c.includes('repeating'));
    if (hasItems && needsItems) {
      score += 35;
    }

    return Math.round((score / maxScore) * 100);
  }

  /**
   * Calculate string similarity (Levenshtein distance)
   */
  private stringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Levenshtein distance algorithm
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Find shared characteristics between new and existing block
   */
  private findSharedCharacteristics(characteristics: string[], model: any): string[] {
    const shared: string[] = [];

    // Check for multi-item structure
    if (characteristics.some(c => c.includes('multi-item')) && 
        model.filters && model.filters.length > 0) {
      shared.push('Multi-item structure');
    }

    // Check for image fields
    const hasImages = model.models?.some((m: any) => 
      m.fields?.some((f: any) => f.component === 'reference')
    );
    if (characteristics.some(c => c.includes('image')) && hasImages) {
      shared.push('Image fields');
    }

    // Check for CTA fields
    const hasCTAs = model.models?.some((m: any) =>
      m.fields?.some((f: any) => f.name?.toLowerCase().includes('cta'))
    );
    if (characteristics.some(c => c.includes('cta') || c.includes('button')) && hasCTAs) {
      shared.push('CTA buttons');
    }

    return shared;
  }

  /**
   * Extract field definitions from existing model
   */
  private extractFieldsFromModel(model: any): BlockField[] {
    const fields: BlockField[] = [];

    if (!model.models) return fields;

    for (const modelDef of model.models) {
      if (!modelDef.fields) continue;

      for (const field of modelDef.fields) {
        fields.push({
          name: field.name,
          label: field.label || field.name,
          component: field.component || 'text',
          valueType: field.valueType || 'string',
          required: field.required || false,
          maxLength: field.maxLength,
          description: field.description,
        });
      }
    }

    return fields;
  }

  /**
   * Calculate overall confidence score for analysis
   */
  calculateConfidenceScore(analysis: BlockAnalysis): ConfidenceScore {
    const reasons: string[] = [];
    const suggestions: string[] = [];
    
    let blockTypeScore = 50;
    let fieldExtractionScore = 50;

    // Block type confidence
    const codeSignals = (analysis.debug as any)?.codeSignals;
    if (codeSignals) {
      if (codeSignals.multiItemLikely) {
        blockTypeScore += 30;
        reasons.push('Multi-item indicators found in code structure');
      }
      
      if (Object.keys(codeSignals.repeatedContainerNames || {}).length > 0) {
        blockTypeScore += 20;
        reasons.push('Repeated container patterns detected');
      }
    } else {
      blockTypeScore -= 20;
      suggestions.push('Provide generated code for better analysis');
    }

    // Field extraction confidence
    const hasContainerFields = analysis.contentStructure.containerFields.length > 0;
    const hasItemFields = analysis.contentStructure.itemFields && 
                          analysis.contentStructure.itemFields.length > 0;
    
    if (hasContainerFields) {
      fieldExtractionScore += 20;
      reasons.push(`Extracted ${analysis.contentStructure.containerFields.length} container fields`);
    } else if (analysis.blockType === 'multi-item') {
      fieldExtractionScore -= 30;
      suggestions.push('No container fields found - may need manual review');
    }

    if (hasItemFields) {
      fieldExtractionScore += 30;
      reasons.push(`Extracted ${analysis.contentStructure.itemFields?.length || 0} item fields`);
    } else if (analysis.blockType === 'multi-item') {
      fieldExtractionScore -= 40;
      suggestions.push('No item fields found - block may need manual field definition');
    }

    // Semantic CTA detection
    const hasCTAs = codeSignals?.semanticCtas && codeSignals.semanticCtas.length > 0;
    if (hasCTAs) {
      fieldExtractionScore += 10;
      reasons.push('Successfully detected CTA buttons from code');
    }

    // Normalize scores (0-100)
    blockTypeScore = Math.max(0, Math.min(100, blockTypeScore));
    fieldExtractionScore = Math.max(0, Math.min(100, fieldExtractionScore));
    
    const overall = Math.round((blockTypeScore + fieldExtractionScore) / 2);

    return {
      overall,
      blockType: blockTypeScore,
      fieldExtraction: fieldExtractionScore,
      reasons,
      suggestions,
    };
  }

  /**
   * Enhance block analysis with improved detection
   */
  async enhanceAnalysis(
    analysis: BlockAnalysis,
    rawCode: string,
    blocksDir?: string
  ): Promise<{
    analysis: BlockAnalysis;
    confidence: ConfidenceScore;
    similarPatterns: SimilarBlockPattern[];
  }> {
    // Calculate confidence score
    const confidence = this.calculateConfidenceScore(analysis);

    // Find similar block patterns if low confidence
    let similarPatterns: SimilarBlockPattern[] = [];
    if (confidence.overall < 70 && blocksDir) {
      const characteristics = this.extractCharacteristics(analysis, rawCode);
      similarPatterns = await this.findSimilarBlockPatterns(
        analysis.blockName,
        characteristics,
        blocksDir
      );
    }

    // If confidence is very low and we have similar patterns, suggest fields
    if (confidence.fieldExtraction < 50 && similarPatterns.length > 0) {
      const bestMatch = similarPatterns[0];
      
      // Suggest fields from best matching pattern
      if (analysis.blockType === 'multi-item' && !analysis.contentStructure.itemFields) {
        analysis.contentStructure.itemFields = bestMatch.suggestedFields.filter(f => 
          !f.name.includes('container') && !f.name.includes('heading') ||
          f.name.includes('item')
        );
      }
      
      confidence.suggestions.push(
        `Consider using field structure from similar block: ${bestMatch.blockName} (${bestMatch.similarity}% match)`
      );
    }

    return {
      analysis,
      confidence,
      similarPatterns,
    };
  }

  /**
   * Extract characteristics from analysis for pattern matching
   */
  private extractCharacteristics(analysis: BlockAnalysis, rawCode: string): string[] {
    const characteristics: string[] = [];

    // Block type
    characteristics.push(analysis.blockType);

    // Block name patterns
    if (analysis.blockName.includes('carousel')) {
      characteristics.push('carousel', 'slider', 'navigation');
    }
    if (analysis.blockName.includes('card')) {
      characteristics.push('cards', 'grid', 'multi-item');
    }
    if (analysis.blockName.includes('offer')) {
      characteristics.push('product', 'pricing', 'cta');
    }

    // Content patterns from code
    const lowerCode = rawCode.toLowerCase();
    if (lowerCode.includes('chevron') || lowerCode.includes('arrow')) {
      characteristics.push('navigation', 'carousel');
    }
    if (lowerCode.includes('indicator') || lowerCode.includes('dot')) {
      characteristics.push('pagination', 'carousel');
    }
    if (lowerCode.includes('button') || lowerCode.includes('cta')) {
      characteristics.push('cta', 'interactive');
    }
    if (lowerCode.includes('img') || lowerCode.includes('picture')) {
      characteristics.push('images', 'media');
    }

    return characteristics;
  }
}
