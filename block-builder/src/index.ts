/**
 * Main entry point for the Block Builder workflow
 */

export { 
  runWorkflow, 
  resumeWorkflow, 
  createWorkflow, 
  getWorkflowState, 
  listWorkflowThreads 
} from './workflow.js';
export { WorkflowInput, WorkflowState, WorkflowStep } from './types.js';
export { FigmaMCPClient, EDSGeneratorMCPClient, MCPClient } from './mcp-client.js';
export { VSCodeMCPClient, createVSCodeMCPClient } from './vscode-mcp-client.js';
export { generateBlockFromFigma, analyzeFigmaDesign, validateBlock, formatWorkflowResult } from './chat-integration.js';
export { registerBlockBuilderTool, activate } from './mcp-tool.js';
export * from './nodes.js';
