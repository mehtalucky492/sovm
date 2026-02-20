/**
 * MCP Tool wrapper for Block Builder workflow
 * This allows the workflow to be called as an MCP tool from VS Code chat
 */

import * as vscode from 'vscode';
import { runWorkflow } from './workflow.js';
import { createVSCodeMCPClient } from './vscode-mcp-client.js';
import { WorkflowInput, WorkflowInputSchema, WorkflowState, WorkflowStep } from './types.js';

/**
 * Register the Block Builder workflow as an MCP tool
 * This allows chat modes and other extensions to invoke the workflow
 */
export function registerBlockBuilderTool(context: vscode.ExtensionContext): vscode.Disposable {
  return vscode.lm.registerTool('block-builder_generate', {
    async invoke(
      options: vscode.LanguageModelToolInvocationOptions<{
        blockName: string;
        figmaUrl?: string;
        figmaNodeId?: string;
        outputPath?: string;
        skipScreenshot?: boolean;
        updateSectionModel?: boolean;
        validateOutput?: boolean;
        strictValidation?: boolean;
        persistContext?: boolean;
      }>,
      token: vscode.CancellationToken
    ): Promise<vscode.LanguageModelToolResult> {
      try {
        const input = options.input;
        
        // Validate input using Zod schema
        const workflowInput: WorkflowInput = WorkflowInputSchema.parse({
          blockName: input.blockName,
          figmaUrl: input.figmaUrl,
          figmaNodeId: input.figmaNodeId,
          outputPath: input.outputPath || './blocks',
          options: {
            skipScreenshot: input.skipScreenshot ?? false,
            updateSectionModel: input.updateSectionModel ?? true,
            validateOutput: input.validateOutput ?? true,
            strictValidation: input.strictValidation ?? false,
            persistContext: input.persistContext ?? true,
          },
        });

        // Create VS Code MCP client with the tool invocation token
        const mcpClient = createVSCodeMCPClient(options.toolInvocationToken);

        // Run the workflow
        console.log(`🚀 Starting Block Builder workflow for: ${input.blockName}`);
        const result = await runWorkflow(workflowInput, mcpClient);

        // Format result for chat display
        const resultText = formatWorkflowResultForChat(result);

        return new vscode.LanguageModelToolResult([
          new vscode.LanguageModelTextPart(resultText)
        ]);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('❌ Block Builder workflow error:', errorMessage);
        
        return new vscode.LanguageModelToolResult([
          new vscode.LanguageModelTextPart(`Error: ${errorMessage}`)
        ]);
      }
    },
  });
}

/**
 * Format workflow result for chat display
 */
function formatWorkflowResultForChat(result: WorkflowState): string {
  const lines: string[] = [];
  
  lines.push(`# Block Builder Workflow Result\n`);
  lines.push(`**Block Name:** ${result.input.blockName}`);
  lines.push(`**Status:** ${result.currentStep}\n`);
  
  if (result.currentStep === WorkflowStep.COMPLETED) {
    lines.push(`✅ **Block generated successfully!**\n`);
    lines.push(`**Location:** \`${result.input.outputPath}/${result.input.blockName}\`\n`);
    
    if (result.generatedFiles) {
      lines.push(`**Generated Files:**`);
      lines.push(`- CSS: ${result.generatedFiles.css ? '✅' : '❌'}`);
      lines.push(`- JavaScript: ${result.generatedFiles.javascript ? '✅' : '❌'}`);
      lines.push(`- Model JSON: ${result.generatedFiles.model ? '✅' : '❌'}\n`);
    }
    
    if (result.validation) {
      lines.push(`**Validation Results:**`);
      lines.push(`- Status: ${result.validation.summary?.status || 'unknown'}`);
      lines.push(`- Errors: ${result.validation.summary?.totalErrors || 0}`);
      lines.push(`- Warnings: ${result.validation.summary?.totalWarnings || 0}\n`);
    }
  } else if (result.currentStep === WorkflowStep.FAILED) {
    lines.push(`❌ **Block generation failed**\n`);
    
    if (result.errors.length > 0) {
      lines.push(`**Errors:**`);
      result.errors.forEach(err => {
        lines.push(`- **${err.step}:** ${err.message}`);
      });
      lines.push('');
    }
  } else {
    lines.push(`⚠️ **Workflow incomplete** (stopped at ${result.currentStep})\n`);
  }
  
  if (result.duration) {
    lines.push(`**Duration:** ${(result.duration / 1000).toFixed(2)}s`);
  }
  
  return lines.join('\n');
}

/**
 * Activate the Block Builder MCP tool
 * Call this from your extension's activate() function
 */
export function activate(context: vscode.ExtensionContext): void {
  const disposable = registerBlockBuilderTool(context);
  context.subscriptions.push(disposable);
  
  console.log('✅ Block Builder workflow tool registered: block-builder_generate');
}
