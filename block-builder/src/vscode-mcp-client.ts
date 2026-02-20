/**
 * VS Code MCP client that integrates with VS Code's language model tools
 * This client can be used from within VS Code extensions or chat participants
 */

import * as vscode from 'vscode';
import type { MCPClient, MCPToolResult } from './mcp-client.js';

/**
 * VS Code MCP Client implementation
 * Uses vscode.lm.invokeTool to call MCP tools registered in VS Code
 */
export class VSCodeMCPClient implements MCPClient {
  constructor(private toolInvocationToken?: vscode.ChatParticipantToolToken) {}

  /**
   * Call an MCP tool using VS Code's language model tool API
   */
  async callTool<T>(toolName: string, args: Record<string, unknown>): Promise<MCPToolResult<T>> {
    try {
      // Find the tool in VS Code's registered tools
      const tool = vscode.lm.tools.find(t => t.name === toolName);
      
      if (!tool) {
        return {
          success: false,
          error: `Tool '${toolName}' not found in VS Code. Available tools: ${vscode.lm.tools.map(t => t.name).join(', ')}`,
        };
      }

      console.log(`🔧 Invoking VS Code MCP tool: ${toolName}`);
      
      // Invoke the tool through VS Code's API
      const result = await vscode.lm.invokeTool(
        toolName,
        {
          toolInvocationToken: this.toolInvocationToken,
          input: args,
        },
        new vscode.CancellationTokenSource().token
      );

      // Parse the result based on the content type
      let data: T;
      
      if (typeof result === 'string') {
        // Try to parse as JSON, fall back to string
        try {
          data = JSON.parse(result) as T;
        } catch {
          data = result as T;
        }
      } else if (result instanceof vscode.LanguageModelToolResult) {
        // Extract content from LanguageModelToolResult
        const content = result.content?.[0];
        if (content && typeof content === 'object' && 'text' in content) {
          try {
            data = JSON.parse((content as { text: string }).text) as T;
          } catch {
            data = (content as { text: string }).text as unknown as T;
          }
        } else {
          data = result as unknown as T;
        }
      } else {
        data = result as T;
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error(`❌ Error calling tool ${toolName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * List all available MCP tools in VS Code
   */
  static listAvailableTools(): string[] {
    return vscode.lm.tools.map(t => t.name);
  }

  /**
   * Check if specific MCP servers are available
   */
  static checkMCPServers(): { figma: boolean; edsGenerator: boolean; tools: string[] } {
    const tools = vscode.lm.tools.map(t => t.name);
    
    return {
      figma: tools.some(t => t.startsWith('mcp_figma-mcp_') || t.startsWith('figma-mcp/')),
      edsGenerator: tools.some(t => t.startsWith('mcp_aem-eds-mcp_') || t.startsWith('aem-eds-mcp/')),
      tools,
    };
  }
}

/**
 * Create a VS Code MCP client for use in the workflow
 * This is the main entry point for VS Code integration
 * 
 * @param toolInvocationToken Optional token from ChatRequest.toolInvocationToken for chat participant integration
 */
export function createVSCodeMCPClient(toolInvocationToken?: vscode.ChatParticipantToolToken): MCPClient {
  return new VSCodeMCPClient(toolInvocationToken);
}
