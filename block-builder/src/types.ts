/**
 * Type definitions for the Block Builder workflow state
 */

import { z } from 'zod';

/**
 * Input configuration for the workflow
 */
export const WorkflowInputSchema = z.object({
  blockName: z.string().describe('Name of the block to generate (lowercase-hyphenated)'),
  figmaUrl: z.string().optional().describe('Full Figma URL with node-id'),
  figmaNodeId: z.string().optional().describe('Figma node ID (e.g., "13157:13513")'),
  figmaFileKey: z.string().optional().describe('Figma file key'),
  outputPath: z.string().default('./blocks').describe('Output directory for generated block'),
  options: z.object({
    updateSectionModel: z.boolean().default(true),
    validateOutput: z.boolean().default(true),
    persistContext: z.boolean().default(true),
    skipScreenshot: z.boolean().default(false),
    strictValidation: z.boolean().default(false),
  }).optional(),
});

export type WorkflowInput = z.infer<typeof WorkflowInputSchema>;

/**
 * Design context from Figma MCP
 */
export interface DesignContext {
  generatedCode: string;
  nodeId: string;
  fileName?: string;
  timestamp: string;
}

/**
 * Screenshot data from Figma MCP
 */
export interface Screenshot {
  data: string; // base64 or URL
  format: 'png' | 'jpg';
  timestamp: string;
}

/**
 * Metadata from Figma MCP
 */
export interface FigmaMetadata {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  structure: Record<string, unknown>;
  timestamp: string;
}

/**
 * Block analysis result
 */
export interface BlockAnalysis {
  blockName: string;
  blockType: 'single' | 'multi-item';
  contentStructure: {
    containerFields: Array<{
      name: string;
      type: string;
      label: string;
      component: string;
    }>;
    itemFields?: Array<{
      name: string;
      type: string;
      label: string;
      component: string;
    }>;
  };
  designTokens: {
    colors: string[];
    typography: string[];
    spacing: string[];
  };
  interactiveElements: string[];
  timestamp: string;
}

/**
 * Generated block files
 */
export interface GeneratedFiles {
  css: string;
  javascript: string;
  model: string;
  readme?: string;
}

/**
 * Validation results
 */
export interface ValidationResult {
  validated: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    totalErrors: number;
    totalWarnings: number;
    status: 'PASSED' | 'FAILED';
  };
}

/**
 * Complete workflow state
 */
export interface WorkflowState {
  // Input
  input: WorkflowInput;
  
  // Figma extraction phase
  designContext?: DesignContext;
  screenshot?: Screenshot;
  userProvidedScreenshot?: boolean;
  metadata?: FigmaMetadata;
  
  // Analysis phase
  analysis?: BlockAnalysis;
  
  // Generation phase
  generatedFiles?: GeneratedFiles;
  
  // Validation phase
  validation?: ValidationResult;
  
  // Section model integration
  sectionModelUpdated?: boolean;
  
  // Workflow tracking
  currentStep: WorkflowStep;
  awaitingUserInput?: {
    requestedAt: string;
    promptMessage: string;
    inputType: 'screenshot' | 'confirmation' | 'text';
  };
  errors: WorkflowError[];
  startTime: string;
  endTime?: string;
  duration?: number;
}

/**
 * Workflow steps
 */
export enum WorkflowStep {
  INITIALIZED = 'initialized',
  EXTRACTING_DESIGN = 'extracting_design',
  GETTING_SCREENSHOT = 'getting_screenshot',
  AWAITING_USER_INPUT = 'awaiting_user_input',
  GETTING_METADATA = 'getting_metadata',
  ANALYZING = 'analyzing',
  GENERATING = 'generating',
  VALIDATING = 'validating',
  UPDATING_SECTION_MODEL = 'updating_section_model',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * Workflow error
 */
export interface WorkflowError {
  step: WorkflowStep;
  message: string;
  error?: Error;
  timestamp: string;
  retryable: boolean;
  requiresUserInput?: boolean;
  userPrompt?: string;
}

/**
 * MCP tool call result
 */
export interface MCPToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export type { MCPToolResult as MCPToolResultExport };

/**
 * Workflow configuration
 */
export interface WorkflowConfig {
  maxRetries: number;
  retryDelay: number;
  timeout: number;
  persistStatePath: string;
  mcpServers: {
    figma: string;
    edsGenerator: string;
  };
}
