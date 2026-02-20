#!/usr/bin/env node

import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { FigmaNode } from './types.js';
import { AnalyzeBlockStructureArgs, ValidateBlockOutputArgs, ModelField } from './interfaces.js';
import { DesignAnalyzer } from './figma/analyzer.js';
import { ModelGenerator } from './generators/modelGenerator.js';
import { CSSGenerator } from './generators/cssGenerator.js';
import { JSGenerator } from './generators/jsGenerator.js';
import { FieldNamingValidator } from './validators/fieldNaming.js';
import { DesignSystemValidator } from './validators/designSystem.js';
import { FileManager } from './utils/fileSystem.js';
import {
  AnalyzeBlockStructureParamsSchema,
  GenerateEdsBlockParamsSchema,
  type BlockAnalysis,
  type BlockGenerationResult,
  type GenerateEdsBlockParams,
  ValidationError,
  GenerationError,
} from './types.js';

class FigmaEdsServer {
  private server: Server;
  // Removed figmaClient: analysis now operates only on provided generatedCode snapshot
  private designAnalyzer: DesignAnalyzer;
  private modelGenerator: ModelGenerator;
  private cssGenerator: CSSGenerator;
  private jsGenerator: JSGenerator;
  private fieldNamingValidator: FieldNamingValidator;
  private designSystemValidator: DesignSystemValidator;
  private fileManager: FileManager;

  constructor() {
    this.server = new Server(
      {
        name: 'figma-eds-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.designAnalyzer = new DesignAnalyzer();
    this.modelGenerator = new ModelGenerator();
    this.cssGenerator = new CSSGenerator();
    this.jsGenerator = new JSGenerator();
    this.fieldNamingValidator = new FieldNamingValidator();
    this.designSystemValidator = new DesignSystemValidator();
    this.fileManager = new FileManager(process.cwd());

    this.setupToolHandlers();
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'analyzeBlockStructure',
          description: 'Analyze a design_context code snapshot to determine block structure and content types (no live Figma calls).',
          inputSchema: {
            type: 'object',
            properties: {
              generatedCode: { type: 'string', description: 'Required React + Tailwind snapshot from get_design_context' },
              screenshot: { type: 'string', description: 'Optional screenshot data (base64 or URL)' },
              metadata: { type: 'string', description: 'Optional metadata JSON' },
            },
            required: ['generatedCode'],
          },
        },
        {
          name: 'generateEdsBlock',
          description: 'Generate a complete EDS block from a design_context code snapshot (no live Figma calls).',
          inputSchema: {
            type: 'object',
            properties: {
              blockName: { type: 'string', description: 'Block name (lowercase hyphenated)' },
              outputPath: { type: 'string', description: 'Directory to write block files' },
              generatedCode: { type: 'string', description: 'Required React + Tailwind snapshot' },
              screenshot: { type: 'string', description: 'Optional screenshot data (base64 or URL)' },
              metadata: { type: 'string', description: 'Optional metadata JSON' },
              persistContext: { type: 'boolean', description: 'Persist artifacts to .tmp/figma-eds' },
              options: {
                type: 'object',
                properties: {
                  updateSectionModel: { type: 'boolean', description: 'Update section model', default: true },
                  validateOutput: { type: 'boolean', description: 'Run validation', default: true },
                  customVariables: { type: 'object', description: 'Custom CSS variables' },
                },
              },
            },
            required: ['blockName', 'outputPath', 'generatedCode'],
          },
        },
        {
          name: 'validateBlockOutput',
          description: 'Validate generated block files for compliance and quality',
          inputSchema: {
            type: 'object',
            properties: {
              blockPath: {
                type: 'string',
                description: 'Path to the block directory',
              },
              blockName: {
                type: 'string',
                description: 'Name of the block to validate',
              },
              strictMode: {
                type: 'boolean',
                description: 'Enable strict validation mode',
                default: false,
              },
            },
            required: ['blockPath', 'blockName'],
          },
        },

      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const args = request.params.arguments || {};
        
        switch (request.params.name) {
          case 'analyzeBlockStructure':
            return await this.handleAnalyzeBlockStructure(args as unknown as AnalyzeBlockStructureArgs);

          case 'generateEdsBlock':
            return await this.handleGenerateEdsBlock(args);

          case 'validateBlockOutput':
            return await this.handleValidateBlockOutput(args as unknown as ValidateBlockOutputArgs);

          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }

        const message = error instanceof Error ? error.message : 'Unknown error occurred';
        throw new McpError(ErrorCode.InternalError, message);
      }
    });
  }

  private async handleAnalyzeBlockStructure(args: AnalyzeBlockStructureArgs) {
    const params = AnalyzeBlockStructureParamsSchema.parse(args);
    try {
      const rawCode = params.generatedCode;
      // Minimal synthetic root; analysis relies primarily on rawCode parsing heuristics
      const stubNode: FigmaNode = {
        id: 'design-context-root',
        name: 'Design Context Root',
        type: 'FRAME',
        children: [],
      } as FigmaNode;
  // FIX: pass rawCode (generatedCode snapshot) into analyzer so rawCode-driven
  // multi-item/container field extraction heuristics execute.
  // ENHANCEMENT: Also pass screenshot for visual pattern analysis
  const analysis = await this.designAnalyzer.analyze(stubNode, rawCode, params.screenshot);
      if (!(analysis as any).debug) (analysis as any).debug = {};
      (analysis as any).debug.rawCodePresent = !!rawCode;
      (analysis as any).debug.rawCodeLength = rawCode.length;
      (analysis as any).debug.provenance = { source: 'provided-generatedCode', figmaIdsRemoved: true };
      (analysis as any).debug.assets = {
        screenshotProvided: !!params.screenshot,
        metadataProvided: !!params.metadata,
      };
      return { content: [{ type: 'text', text: JSON.stringify(analysis, null, 2) }] };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Analysis failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async handleGenerateEdsBlock(args: unknown) {
    const params = GenerateEdsBlockParamsSchema.parse(args);
    try {
      console.log('[DEBUG] handleGenerateEdsBlock called for block:', params.blockName);
      
      const analysisResult = await this.handleAnalyzeBlockStructure({
        generatedCode: params.generatedCode,
        screenshot: params.screenshot,
        metadata: params.metadata,
      });
      const analysis: BlockAnalysis = JSON.parse(analysisResult.content[0].text);
      
      console.log('[DEBUG] Analysis completed - blockType:', analysis.blockType);
      console.log('[DEBUG] Analysis containerFields count:', analysis.contentStructure.containerFields.length);
      console.log('[DEBUG] Analysis itemFields count:', analysis.contentStructure.itemFields?.length || 0);
      console.log('[DEBUG] Analysis itemFields:', JSON.stringify(analysis.contentStructure.itemFields?.map(f => f.name) || [], null, 2));
      
      analysis.blockName = params.blockName;
      if (params.persistContext) {
        try {
          const fs = await import('fs/promises');
          const path = await import('path');
            const dir = path.join(process.cwd(), '.tmp', 'figma-eds');
            await fs.mkdir(dir, { recursive: true });
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            await fs.writeFile(path.join(dir, `${params.blockName}-${timestamp}.code.txt`), params.generatedCode, 'utf-8');
            if (params.metadata) await fs.writeFile(path.join(dir, `${params.blockName}-${timestamp}.metadata.json`), params.metadata, 'utf-8');
            if (params.screenshot) {
              const isBase64Png = params.screenshot.startsWith('data:image/png;base64,');
              const fileName = `${params.blockName}-${timestamp}.screenshot.${isBase64Png ? 'png.b64' : 'txt'}`;
              await fs.writeFile(path.join(dir, fileName), params.screenshot, 'utf-8');
            }
        } catch (e) {
          console.warn('[WARN] Failed persisting context artifacts:', e);
        }
      }
      const generationResult = await this.generateAllFiles(analysis, params);
      if (params.options?.validateOutput) {
        generationResult.validation = await this.validateGeneration(generationResult, params.outputPath);
      }
      if (params.options?.updateSectionModel) {
        await this.updateSectionModelFile(params.blockName, params.outputPath, analysis.blockType);
        generationResult.integration.sectionModelUpdated = true;
      }
      return { content: [{ type: 'text', text: JSON.stringify(generationResult, null, 2) }] };
    } catch (error) {
      if (error instanceof ValidationError) {
        throw new McpError(ErrorCode.InvalidRequest, `Validation failed: ${error.message}`);
      }
      if (error instanceof GenerationError) {
        throw new McpError(ErrorCode.InternalError, `Generation failed at ${error.stage}: ${error.message}`);
      }
      throw new McpError(ErrorCode.InternalError, `Block generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleValidateBlockOutput(args: ValidateBlockOutputArgs) {
    try {
      const errors: string[] = [];
      const warnings: string[] = [];

      // Validate block exists
      const blockExists = await this.fileManager.blockExists(args.blockName);
      if (!blockExists) {
        errors.push(`Block '${args.blockName}' does not exist at path: ${args.blockPath}`);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ 
                validated: false, 
                errors, 
                warnings,
                blockName: args.blockName,
                blockPath: args.blockPath
              }, null, 2),
            },
          ],
        };
      }

      // Validate required files exist
      const requiredFiles = [
        `${args.blockName}.css`,
        `${args.blockName}.js`,
        `_${args.blockName}.json`
      ];

      for (const file of requiredFiles) {
        const filePath = `${args.blockPath}/${file}`;
        try {
          await this.fileManager.validateProjectStructure(); // This will throw if files don't exist
        } catch {
          errors.push(`Missing required file: ${file}`);
        }
      }

      // Validate CSS file with design system
      try {
        const fs = await import('fs/promises');
        const path = await import('path');
        const cssPath = path.join(args.blockPath, `${args.blockName}.css`);
        const cssContent = await fs.readFile(cssPath, 'utf-8');
        
        const cssValidation = this.designSystemValidator.validateCSS(cssContent);
        warnings.push(...cssValidation.warnings);
        errors.push(...cssValidation.errors);
      } catch (error) {
        warnings.push(`CSS validation failed: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Validate JSON model file structure
      try {
        const fs = await import('fs/promises');
        const path = await import('path');
        const modelPath = path.join(args.blockPath, `_${args.blockName}.json`);
        const modelContent = await fs.readFile(modelPath, 'utf-8');
        const modelData = JSON.parse(modelContent);
        
        // Extract fields for field naming validation
        const fields = [];
        if (modelData.fields) {
          fields.push(...modelData.fields);
        }
        // Fields are in the models array, not definitions
        if (modelData.models) {
          modelData.models.forEach((model: ModelField) => {
            if (model.fields) fields.push(...model.fields);
          });
        }
        // Definitions don't contain fields - they contain metadata about the block types
        
        if (fields.length > 0) {
          const fieldValidation = this.fieldNamingValidator.validateFieldNames(fields);
          if (!fieldValidation.isValid) {
            errors.push(...fieldValidation.errors);
          }
        }
      } catch (error) {
        warnings.push(`Model validation failed: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Additional strict mode checks
      if (args.strictMode) {
        try {
          const cssVariables = await this.fileManager.getCSSVariables();
          if (cssVariables.length === 0) {
            warnings.push('No CSS variables found - ensure design system integration');
          }
        } catch (error) {
          warnings.push(`CSS variable check failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      const isValid = errors.length === 0;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ 
              validated: isValid, 
              errors, 
              warnings,
              blockName: args.blockName,
              blockPath: args.blockPath,
              strictMode: args.strictMode || false,
              summary: {
                totalErrors: errors.length,
                totalWarnings: warnings.length,
                status: isValid ? 'PASSED' : 'FAILED'
              }
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Validation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }



  private async generateAllFiles(
    analysis: BlockAnalysis, 
    params: GenerateEdsBlockParams
  ): Promise<BlockGenerationResult> {
    const result: BlockGenerationResult = {
      files: {
        css: '',
        javascript: '',
        model: '',
      },
      validation: {
        linting: [],
        accessibility: [],
        designSystem: [],
      },
      integration: {
        sectionModelUpdated: false,
        componentsRegistered: [],
      },
    };

    try {
      // Extract measurements for both CSS and JS
      const measurements = params.generatedCode 
        ? (await import('./utils/tailwindParser.js')).TailwindParser.extractContextualMeasurements(params.generatedCode)
        : undefined;
      
      // Generate CSS with Figma measurements
      result.files.css = await this.cssGenerator.generate(analysis, params.generatedCode);
      
      // Generate JavaScript with Figma measurements
      result.files.javascript = await this.jsGenerator.generate(analysis, measurements);
      
      // Generate Universal Editor model
      result.files.model = await this.modelGenerator.generate(analysis);

      // Write files to disk
      await this.fileManager.writeBlockFiles(params.blockName, {
        css: result.files.css,
        js: result.files.javascript,
        model: result.files.model,
      });

      return result;
    } catch (error) {
      throw new GenerationError(
        `File generation failed: ${error instanceof Error ? error.message : String(error)}`, 
        'file-generation'
      );
    }
  }

  private async validateGeneration(result: BlockGenerationResult, outputPath: string) {
    const validation = {
      linting: [] as Array<{
        file: string;
        line: number;
        column: number;
        message: string;
        severity: 'error' | 'warning' | 'info';
        rule: string;
      }>,
      accessibility: [] as Array<{
        element: string;
        issue: string;
        severity: 'error' | 'warning' | 'info';
        suggestion: string;
      }>,
      designSystem: [] as Array<{
        line: number;
        hardcodedValue: string;
        suggestedVariable: string;
        severity: 'error' | 'warning';
      }>,
    };

    try {
      // Validate CSS design system compliance
      const cssValidation = this.designSystemValidator.validateCSS(result.files.css);
      
      // Convert CSS validation errors to proper format
      cssValidation.errors.forEach((error, index) => {
        const hardcodedMatch = error.match(/Hardcoded value "([^"]+)"/);
        const replacementMatch = error.match(/Replace hardcoded "([^"]+)" with (.+)/);
        
        validation.designSystem.push({
          line: index + 1, // Approximate line number
          hardcodedValue: hardcodedMatch?.[1] || 'unknown',
          suggestedVariable: replacementMatch?.[2] || 'design system variable',
          severity: 'error'
        });
      });

      cssValidation.warnings.forEach((warning, index) => {
        validation.designSystem.push({
          line: index + 1,
          hardcodedValue: 'detected pattern',
          suggestedVariable: warning,
          severity: 'warning'
        });
      });

      // Validate generated model fields
      try {
        const modelData = JSON.parse(result.files.model);
        const fields = [];
        
        if (modelData.fields) {
          fields.push(...modelData.fields);
        }
        if (modelData.models) {
          modelData.models.forEach((model: ModelField) => {
            if (model.fields) fields.push(...model.fields);
          });
        }
        
        if (fields.length > 0) {
          const fieldValidation = this.fieldNamingValidator.validateFieldNames(fields);
          fieldValidation.errors.forEach(error => {
            validation.linting.push({
              file: 'model.json',
              line: 1,
              column: 1,
              message: error,
              severity: 'error',
              rule: 'field-naming'
            });
          });
        }
      } catch (error) {
        validation.linting.push({
          file: 'model.json',
          line: 1,
          column: 1,
          message: `Model JSON validation failed: ${error instanceof Error ? error.message : String(error)}`,
          severity: 'error',
          rule: 'json-syntax'
        });
      }

      // Basic accessibility checks
      if (result.files.css.includes('color:') && !result.files.css.includes(':focus')) {
        validation.accessibility.push({
          element: 'interactive elements',
          issue: 'Missing focus states for colored elements',
          severity: 'warning',
          suggestion: 'Add :focus pseudo-class styles for keyboard navigation'
        });
      }

      if (result.files.javascript.includes('click') && !result.files.javascript.includes('keydown')) {
        validation.accessibility.push({
          element: 'click handlers',
          issue: 'Click handlers should include keyboard support',
          severity: 'warning',
          suggestion: 'Add keydown event listeners for Enter and Space keys'
        });
      }

      // Basic linting checks
      if (result.files.css.includes('!important')) {
        validation.linting.push({
          file: 'styles.css',
          line: 1,
          column: 1,
          message: 'Avoid using !important in CSS',
          severity: 'warning',
          rule: 'no-important'
        });
      }

      if (result.files.javascript.includes('var ')) {
        validation.linting.push({
          file: 'script.js',
          line: 1,
          column: 1,
          message: 'Use const/let instead of var in JavaScript',
          severity: 'warning',
          rule: 'no-var'
        });
      }

      if (!result.files.javascript.includes('export default')) {
        validation.linting.push({
          file: 'script.js',
          line: 1,
          column: 1,
          message: 'JavaScript file should export a default function',
          severity: 'error',
          rule: 'export-default'
        });
      }

    } catch (error) {
      validation.linting.push({
        file: 'validation',
        line: 1,
        column: 1,
        message: `Validation error: ${error instanceof Error ? error.message : String(error)}`,
        severity: 'error',
        rule: 'validation-error'
      });
    }

    return validation;
  }

  private async updateSectionModelFile(blockName: string, outputPath: string, blockType: 'single' | 'multi-item') {
    try {
      await this.fileManager.updateSectionModel(blockName);
      /* eslint-disable-next-line no-console */
      console.log(`Successfully updated section model for ${blockName} (${blockType})`);
    } catch (error) {
      /* eslint-disable-next-line no-console */
      console.error(`Failed to update section model for ${blockName}:`, error);
      throw new GenerationError(
        `Section model update failed: ${error instanceof Error ? error.message : String(error)}`,
        'section-model-update'
      );
    }
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    /* eslint-disable-next-line no-console */
    console.error('Figma-EDS MCP Server running on stdio');
  }
}

const server = new FigmaEdsServer();
/* eslint-disable-next-line no-console */
server.run().catch(console.error);