import { z } from 'zod';

// Simplified Figma node shape retained ONLY for analyzer compatibility (no live API usage)
export const FigmaNodeSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  children: z.array(z.any()).optional(),
  absoluteBoundingBox: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
  }).optional(),
  backgroundColor: z.object({
    r: z.number(),
    g: z.number(),
    b: z.number(),
    a: z.number(),
  }).optional(),
  fills: z.array(z.any()).optional(),
  strokes: z.array(z.any()).optional(),
  strokeWeight: z.number().optional(),
  cornerRadius: z.number().optional(),
  characters: z.string().optional(),
  style: z.object({
    fontFamily: z.string().optional(),
    fontWeight: z.number().optional(),
    fontSize: z.number().optional(),
    lineHeightPx: z.number().optional(),
    textAlignHorizontal: z.string().optional(),
    textAlignVertical: z.string().optional(),
  }).optional(),
});

export type FigmaNode = z.infer<typeof FigmaNodeSchema>;

// Block Analysis Types
export const BlockAnalysisSchema = z.object({
  blockType: z.enum(['single', 'multi-item']),
  blockName: z.string(),
  contentStructure: z.object({
    containerFields: z.array(z.object({
      name: z.string(),
      label: z.string(),
      component: z.string(),
      valueType: z.string(),
      required: z.boolean().default(false),
      maxLength: z.number().optional(),
      description: z.string().optional(),
    })),
    itemFields: z.array(z.object({
      name: z.string(),
      label: z.string(),
      component: z.string(),
      valueType: z.string(),
      required: z.boolean().default(false),
      maxLength: z.number().optional(),
      description: z.string().optional(),
    })).optional(),
    configurationOptions: z.array(z.string()),
    jsPattern: z.enum(['cards', 'carousel', 'decorated']).default('cards').describe('JavaScript generation pattern: cards (ul/li, every row), carousel (ul/li with navigation), decorated (filter rows, decorateItem function)'),
  }),
  designTokens: z.object({
    colors: z.array(z.object({
      figmaToken: z.string(),
      cssVariable: z.string(),
      value: z.string(),
      context: z.enum(['text', 'background', 'border', 'button']),
    })),
    typography: z.array(z.object({
      figmaToken: z.string(),
      cssVariable: z.string(),
      fontSize: z.string(),
      lineHeight: z.string(),
      fontWeight: z.string(),
      fontFamily: z.string(),
    })),
    spacing: z.array(z.object({
      figmaToken: z.string(),
      cssVariable: z.string(),
      value: z.string(),
      usage: z.enum(['padding', 'margin', 'gap']),
    })),
    grid: z.object({
      columns: z.number(),
      gutter: z.string(),
      margin: z.string(),
      maxWidth: z.string(),
    }),
  }),
  interactions: z.object({
    ctaButtons: z.array(z.object({
      text: z.string(),
      type: z.enum(['primary', 'secondary', 'tertiary']),
      url: z.string().optional(),
    })),
    links: z.array(z.object({
      text: z.string(),
      url: z.string(),
      type: z.string().optional(),
    })),
    hovers: z.array(z.object({
      element: z.string(),
      state: z.string(),
    })),
  }),
  variants: z.array(z.object({
    name: z.string(),
    className: z.string(),
    properties: z.record(z.any()),
  })),
  accessibility: z.object({
    headingHierarchy: z.array(z.string()),
    altTextRequired: z.boolean(),
    colorContrast: z.object({
      valid: z.boolean(),
      ratio: z.number().optional(),
    }),
    keyboardNavigation: z.boolean(),
  }),
  debug: z.record(z.any()).optional(),
});

export type BlockAnalysis = z.infer<typeof BlockAnalysisSchema>;

// Generation Result Types
export const BlockGenerationResultSchema = z.object({
  files: z.object({
    css: z.string(),
    javascript: z.string(),
    model: z.string(),
  }),
  validation: z.object({
    linting: z.array(z.object({
      file: z.string(),
      line: z.number(),
      column: z.number(),
      message: z.string(),
      severity: z.enum(['error', 'warning', 'info']),
      rule: z.string(),
    })),
    accessibility: z.array(z.object({
      element: z.string(),
      issue: z.string(),
      severity: z.enum(['error', 'warning', 'info']),
      suggestion: z.string(),
    })),
    designSystem: z.array(z.object({
      line: z.number(),
      hardcodedValue: z.string(),
      suggestedVariable: z.string(),
      severity: z.enum(['error', 'warning']),
    })),
  }),
  integration: z.object({
    sectionModelUpdated: z.boolean(),
    componentsRegistered: z.array(z.string()),
  }),
});

export type BlockGenerationResult = z.infer<typeof BlockGenerationResultSchema>;

// MCP Function Parameters
export const AnalyzeBlockStructureParamsSchema = z.object({
  generatedCode: z.string().min(10, 'generatedCode (React + Tailwind snapshot) is required and must be >10 chars').describe('Pre-generated code snapshot (React + Tailwind) from get_design_context'),
  screenshot: z.string().optional().describe('Optional screenshot data (base64 or URL)'),
  metadata: z.string().optional().describe('Optional metadata JSON from design extraction'),
});

export type AnalyzeBlockStructureParams = z.infer<typeof AnalyzeBlockStructureParamsSchema>;

export const GenerateEdsBlockParamsSchema = z.object({
  blockName: z.string().regex(/^[a-z][a-z0-9-]*[a-z0-9]$/, 'Block name must be lowercase with hyphens'),
  outputPath: z.string(),
  generatedCode: z.string().min(10, 'generatedCode (React + Tailwind snapshot) is required and must be >10 chars').describe('Pre-generated code snapshot (React/Tailwind) from get_design_context'),
  screenshot: z.string().optional().describe('Optional screenshot data (base64 or URL)'),
  metadata: z.string().optional().describe('Optional metadata JSON'),
  persistContext: z.boolean().optional().describe('Persist provided artifacts to .tmp/figma-eds for provenance/regeneration'),
  options: z.object({
    updateSectionModel: z.boolean().default(true),
    validateOutput: z.boolean().default(true),
    customVariables: z.record(z.string()).optional(),
  }).optional(),
});

export type GenerateEdsBlockParams = z.infer<typeof GenerateEdsBlockParamsSchema>;

// Validation Types
export const ValidationResultSchema = z.object({
  valid: z.boolean(),
  errors: z.array(z.object({
    message: z.string(),
    location: z.string().optional(),
    severity: z.enum(['error', 'warning', 'info']),
  })),
  warnings: z.array(z.object({
    message: z.string(),
    location: z.string().optional(),
  })),
  score: z.number().min(0).max(100),
});

export type ValidationResult = z.infer<typeof ValidationResultSchema>;

// Field Naming Rules
export const FieldNamingRulesSchema = z.object({
  restrictedNames: z.array(z.string()).default(['title', 'name', 'date', 'link', 'text']),
  restrictedSuffixes: z.array(z.string()).default(['Title', 'Text', 'Alt', 'Type']),
  requireBaseField: z.array(z.string()).default(['Alt', 'Text', 'Type', 'Title']),
  maxLength: z.record(z.number()).default({}),
});

export type FieldNamingRules = z.infer<typeof FieldNamingRulesSchema>;

// Template Types
export interface TemplateContext {
  blockName: string;
  blockAnalysis: BlockAnalysis;
  designTokens: BlockAnalysis['designTokens'];
  timestamp: string;
  author: string;
}

// Visual Pattern Analysis Types
export interface VisualPatterns {
  isMultiItem: boolean;
  itemCount: number;
  confidence: 'high' | 'medium' | 'low';
  layoutType?: 'carousel' | 'card-grid' | 'list' | 'hero' | 'feature-section';
  hasContainerHeading: boolean;
  hasNavigationIndicators?: boolean; // Carousel dots, arrows, prev/next buttons
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

// Error Types
export class ValidationError extends Error {
  constructor(message: string, public validationErrors: ValidationResult['errors']) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class GenerationError extends Error {
  constructor(message: string, public stage: string) {
    super(message);
    this.name = 'GenerationError';
  }
}