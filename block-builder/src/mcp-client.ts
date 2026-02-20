/**
 * MCP client for calling Figma and EDS generation tools
 */

import type { MCPToolResult, DesignContext, Screenshot, FigmaMetadata, BlockAnalysis, GeneratedFiles, ValidationResult } from './types.js';

export type { MCPToolResult };

/**
 * Abstract MCP client interface
 */
export interface MCPClient {
  callTool<T>(toolName: string, args: Record<string, unknown>): Promise<MCPToolResult<T>>;
}

/**
 * Figma MCP client
 */
export class FigmaMCPClient {
  constructor(private client: MCPClient) {}

  async getDesignContext(nodeId: string): Promise<MCPToolResult<DesignContext>> {
    console.log(`📥 Calling mcp_figma-mcp_get_design_context for node: ${nodeId}`);
    
    try {
      const result = await this.client.callTool<string>('mcp_figma-mcp_get_design_context', {
        nodeId,
        clientFrameworks: 'react',
        clientLanguages: 'typescript,css',
        forceCode: true,
        includeImagesOfNodes: true,
      });

      if (!result.success || !result.data) {
        return { success: false, error: result.error || 'No design context returned' };
      }

      return {
        success: true,
        data: {
          generatedCode: result.data,
          nodeId,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async getScreenshot(nodeId: string): Promise<MCPToolResult<Screenshot>> {
    console.log(`📷 Calling mcp_figma-mcp_get_screenshot for node: ${nodeId}`);
    
    try {
      const result = await this.client.callTool<string>('mcp_figma-mcp_get_screenshot', {
        nodeId,
      });

      if (!result.success || !result.data) {
        return { success: false, error: result.error || 'No screenshot returned' };
      }

      return {
        success: true,
        data: {
          data: result.data,
          format: 'png',
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async getMetadata(nodeId: string): Promise<MCPToolResult<FigmaMetadata>> {
    console.log(`📊 Calling mcp_figma-mcp_get_metadata for node: ${nodeId}`);
    
    try {
      const result = await this.client.callTool<Record<string, unknown>>('mcp_figma-mcp_get_metadata', {
        nodeId,
      });

      if (!result.success || !result.data) {
        return { success: false, error: result.error || 'No metadata returned' };
      }

      return {
        success: true,
        data: {
          nodeId,
          nodeName: String(result.data.name || 'Unknown'),
          nodeType: String(result.data.type || 'Unknown'),
          structure: result.data,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

/**
 * EDS Generator MCP client
 */
export class EDSGeneratorMCPClient {
  constructor(private client: MCPClient) {}

  async analyzeBlockStructure(
    generatedCode: string,
    screenshot?: string,
    metadata?: string
  ): Promise<MCPToolResult<BlockAnalysis>> {
    console.log(`🔍 Calling mcp_aem-eds-mcp_analyzeBlockStructure`);
    
    try {
      const result = await this.client.callTool<string>('mcp_aem-eds-mcp_analyzeBlockStructure', {
        generatedCode,
        screenshot,
        metadata,
      });

      if (!result.success || !result.data) {
        return { success: false, error: result.error || 'Analysis failed' };
      }

      // Parse the JSON response
      const analysis = typeof result.data === 'string' 
        ? JSON.parse(result.data) 
        : result.data;

      return {
        success: true,
        data: {
          ...analysis,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async generateEdsBlock(
    blockName: string,
    outputPath: string,
    generatedCode: string,
    options?: {
      screenshot?: string;
      metadata?: string;
      persistContext?: boolean;
      updateSectionModel?: boolean;
      validateOutput?: boolean;
    }
  ): Promise<MCPToolResult<GeneratedFiles>> {
    console.log(`🏗️  Calling mcp_aem-eds-mcp_generateEdsBlock for block: ${blockName}`);
    
    try {
      const result = await this.client.callTool<string>('mcp_aem-eds-mcp_generateEdsBlock', {
        blockName,
        outputPath,
        generatedCode,
        screenshot: options?.screenshot,
        metadata: options?.metadata,
        persistContext: options?.persistContext ?? true,
        options: {
          updateSectionModel: options?.updateSectionModel ?? true,
          validateOutput: options?.validateOutput ?? true,
        },
      });

      if (!result.success || !result.data) {
        return { success: false, error: result.error || 'Generation failed' };
      }

      // Parse the JSON response
      const generationResult = typeof result.data === 'string' 
        ? JSON.parse(result.data) 
        : result.data;

      return {
        success: true,
        data: {
          css: generationResult.files?.css || '',
          javascript: generationResult.files?.javascript || '',
          model: generationResult.files?.model || '',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async validateBlockOutput(
    blockPath: string,
    blockName: string,
    strictMode = false
  ): Promise<MCPToolResult<ValidationResult>> {
    console.log(`✅ Calling mcp_aem-eds-mcp_validateBlockOutput for block: ${blockName}`);
    
    try {
      const result = await this.client.callTool<string>('mcp_aem-eds-mcp_validateBlockOutput', {
        blockPath,
        blockName,
        strictMode,
      });

      if (!result.success || !result.data) {
        return { success: false, error: result.error || 'Validation failed' };
      }

      // Parse the JSON response
      const validation = typeof result.data === 'string' 
        ? JSON.parse(result.data) 
        : result.data;

      return {
        success: true,
        data: validation,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

/**
 * Utility function to parse Figma URLs
 */
export function parseFigmaUrl(url: string): { fileKey?: string; nodeId?: string } | null {
  // https://www.figma.com/design/<fileKey>/<fileName>?node-id=<nodeId>
  // https://figma.com/file/<fileKey>/<fileName>?node-id=<nodeId>
  
  const patterns = [
    /figma\.com\/design\/([^/]+)\/[^?]*\?node-id=([^&]+)/,
    /figma\.com\/file\/([^/]+)\/[^?]*\?node-id=([^&]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return {
        fileKey: match[1],
        nodeId: match[2].replace(/-/g, ':'), // Convert "13157-13513" to "13157:13513"
      };
    }
  }

  return null;
}
