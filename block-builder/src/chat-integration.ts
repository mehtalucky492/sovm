/**
 * Block Builder Chat Mode Integration
 * This module provides helper functions for integrating the Block Builder workflow
 * into the Block Builder chat mode.
 */

import * as vscode from 'vscode';
import { runWorkflow } from './workflow.js';
import { createVSCodeMCPClient, VSCodeMCPClient } from './vscode-mcp-client.js';
import { FigmaMCPClient, EDSGeneratorMCPClient } from './mcp-client.js';
import type { WorkflowInput, WorkflowState } from './types.js';

/**
 * Generate a block from Figma using the Block Builder workflow
 * This is the main entry point for chat mode integration
 */
export async function generateBlockFromFigma(input: {
  blockName: string;
  figmaUrl?: string;
  figmaNodeId?: string;
  outputPath?: string;
  options?: {
    skipScreenshot?: boolean;
    updateSectionModel?: boolean;
    validateOutput?: boolean;
    strictValidation?: boolean;
    persistContext?: boolean;
  };
}): Promise<WorkflowState> {
  // Create VS Code MCP client
  const mcpClient = createVSCodeMCPClient();
  
  // Check that required MCP servers are available
  const serverCheck = VSCodeMCPClient.checkMCPServers();
  if (!serverCheck.figma) {
    throw new Error(
      `Figma MCP server not available. Please ensure figma-mcp is configured in .vscode/mcp.json. Available tools: ${serverCheck.tools.join(', ')}`
    );
  }
  if (!serverCheck.edsGenerator) {
    throw new Error(
      `AEM-EDS MCP server not available. Please ensure aem-eds-mcp is configured in .vscode/mcp.json. Available tools: ${serverCheck.tools.join(', ')}`
    );
  }

  // Prepare workflow input
  const workflowInput: WorkflowInput = {
    blockName: input.blockName,
    figmaUrl: input.figmaUrl,
    figmaNodeId: input.figmaNodeId,
    outputPath: input.outputPath || './blocks',
    options: {
      skipScreenshot: input.options?.skipScreenshot ?? false,
      updateSectionModel: input.options?.updateSectionModel ?? true,
      validateOutput: input.options?.validateOutput ?? true,
      strictValidation: input.options?.strictValidation ?? false,
      persistContext: input.options?.persistContext ?? true,
    },
  };

  // Run the workflow
  console.log('🚀 Starting Block Builder workflow...');
  const result = await runWorkflow(workflowInput, mcpClient);
  
  return result;
}

/**
 * Analyze a Figma design to understand its structure
 * Useful for preview before generation
 */
export async function analyzeFigmaDesign(input: {
  figmaUrl?: string;
  figmaNodeId?: string;
}): Promise<{
  success: boolean;
  designContext?: string;
  screenshot?: string;
  analysis?: Record<string, unknown>;
  error?: string;
}> {
  try {
    const mcpClient = createVSCodeMCPClient();
    const figmaClient = new FigmaMCPClient(mcpClient);
    const edsClient = new EDSGeneratorMCPClient(mcpClient);

    // Extract node ID from URL if provided
    let nodeId = input.figmaNodeId;
    if (input.figmaUrl && !nodeId) {
      const { parseFigmaUrl } = await import('./mcp-client.js');
      const parsed = parseFigmaUrl(input.figmaUrl);
      nodeId = parsed?.nodeId;
    }

    if (!nodeId) {
      return {
        success: false,
        error: 'No Figma node ID provided or could not parse from URL',
      };
    }

    // Get design context
    const designResult = await figmaClient.getDesignContext(nodeId);
    if (!designResult.success) {
      return {
        success: false,
        error: `Failed to get design context: ${designResult.error}`,
      };
    }

    // Get screenshot
    const screenshotResult = await figmaClient.getScreenshot(nodeId);
    
    // Analyze structure
    const analysisResult = await edsClient.analyzeBlockStructure(
      designResult.data!.generatedCode,
      screenshotResult.success ? screenshotResult.data?.data : undefined
    );

    return {
      success: true,
      designContext: designResult.data!.generatedCode,
      screenshot: screenshotResult.success ? screenshotResult.data?.data : undefined,
      analysis: analysisResult.success ? (analysisResult.data as unknown as Record<string, unknown>) : undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Validate an existing block
 */
export async function validateBlock(input: {
  blockName: string;
  blockPath: string;
  strictMode?: boolean;
}): Promise<{
  success: boolean;
  validation?: Record<string, unknown>;
  error?: string;
}> {
  try {
    const mcpClient = createVSCodeMCPClient();
    const edsClient = new EDSGeneratorMCPClient(mcpClient);

    const result = await edsClient.validateBlockOutput(
      input.blockPath,
      input.blockName,
      input.strictMode ?? false
    );

    if (!result.success) {
      return {
        success: false,
        error: result.error,
      };
    }

    return {
      success: true,
      validation: result.data as unknown as Record<string, unknown>,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Format workflow result for chat display
 */
export function formatWorkflowResult(result: WorkflowState): string {
  const lines: string[] = [];
  
  lines.push(`# Block Builder Workflow Result\n`);
  lines.push(`**Block Name:** ${result.input.blockName}`);
  lines.push(`**Status:** ${result.currentStep}`);
  
  if (result.duration) {
    lines.push(`**Duration:** ${(result.duration / 1000).toFixed(2)}s`);
  }
  
  if (result.errors.length > 0) {
    lines.push(`\n## Errors`);
    result.errors.forEach(err => {
      lines.push(`- **${err.step}:** ${err.message}`);
    });
  }
  
  if (result.generatedFiles) {
    lines.push(`\n## Generated Files`);
    lines.push(`- CSS: ${result.generatedFiles.css ? '✅' : '❌'}`);
    lines.push(`- JavaScript: ${result.generatedFiles.javascript ? '✅' : '❌'}`);
    lines.push(`- Model JSON: ${result.generatedFiles.model ? '✅' : '❌'}`);
  }
  
  if (result.validation) {
    lines.push(`\n## Validation`);
    lines.push(`- **Status:** ${result.validation.summary?.status || 'unknown'}`);
    lines.push(`- **Errors:** ${result.validation.summary?.totalErrors || 0}`);
    lines.push(`- **Warnings:** ${result.validation.summary?.totalWarnings || 0}`);
  }
  
  return lines.join('\n');
}
