/**
 * LangGraph workflow for Block Builder
 * Real LangGraph.js implementation with state management, interrupts, and checkpointing
 */

import { StateGraph, Annotation, interrupt } from '@langchain/langgraph';
import { MemorySaver } from '@langchain/langgraph';
import { WorkflowState, WorkflowStep, WorkflowInput } from './types.js';
import { FigmaMCPClient, EDSGeneratorMCPClient, MCPClient } from './mcp-client.js';
import {
  initializeWorkflow,
  extractDesignContext,
  getScreenshot,
  analyzeBlockStructure,
  generateEdsBlock,
  validateBlock,
  completeWorkflow,
  handleFailure,
} from './nodes.js';

/**
 * LangGraph State Annotation
 * Defines the schema for workflow state with reducers
 */
const WorkflowStateAnnotation = Annotation.Root({
  input: Annotation<WorkflowInput>,
  designContext: Annotation<WorkflowState['designContext']>,
  screenshot: Annotation<WorkflowState['screenshot']>,
  userProvidedScreenshot: Annotation<boolean>,
  metadata: Annotation<WorkflowState['metadata']>,
  analysis: Annotation<WorkflowState['analysis']>,
  generatedFiles: Annotation<WorkflowState['generatedFiles']>,
  validation: Annotation<WorkflowState['validation']>,
  sectionModelUpdated: Annotation<boolean>,
  currentStep: Annotation<WorkflowStep>,
  awaitingUserInput: Annotation<WorkflowState['awaitingUserInput']>,
  errors: Annotation<WorkflowState['errors']>({
    reducer: (existing, update) => [...(existing || []), ...(update || [])],
    default: () => [],
  }),
  startTime: Annotation<string>,
  endTime: Annotation<string>,
  duration: Annotation<number>,
});

/**
 * Node names for the workflow
 */
type NodeName = 
  | 'initialize'
  | 'extract_design'
  | 'get_screenshot'
  | 'analyze'
  | 'generate'
  | 'validate'
  | 'complete'
  | 'fail';

/**
 * Create LangGraph workflow with proper state management
 */
function createLangGraphWorkflow(mcpClient: MCPClient) {
  const figmaClient = new FigmaMCPClient(mcpClient);
  const edsClient = new EDSGeneratorMCPClient(mcpClient);

  const workflow = new StateGraph(WorkflowStateAnnotation);
  
  // Helper to add edges with proper typing
  const addEdge = (from: NodeName | '__start__', to: NodeName | '__end__') => {
    workflow.addEdge(from as any, to as any);
  };
  
  const addConditionalEdges = (
    from: NodeName,
    router: (state: WorkflowState) => NodeName | '__end__'
  ) => {
    workflow.addConditionalEdges(from as any, (state) => router(state) as any);
  };

  // Add workflow nodes  
  workflow.addNode('initialize', async (state) => await initializeWorkflow(state));
  workflow.addNode('extract_design', async (state) => await extractDesignContext(state, figmaClient));
  workflow.addNode('get_screenshot', async (state) => await getScreenshot(state, figmaClient));
  workflow.addNode('analyze', async (state) => await analyzeBlockStructure(state, edsClient));
  workflow.addNode('generate', async (state) => await generateEdsBlock(state, edsClient));
  workflow.addNode('validate', async (state) => await validateBlock(state, edsClient));
  workflow.addNode('complete', async (state) => await completeWorkflow(state));
  workflow.addNode('fail', async (state) => await handleFailure(state));

  // Define workflow edges with conditional routing using helpers
  addEdge('__start__', 'initialize');
  addEdge('initialize', 'extract_design');
  
  addConditionalEdges('extract_design', (state) => {
    if (state.currentStep === WorkflowStep.FAILED) return 'fail';
    return 'get_screenshot';
  });

  addConditionalEdges('get_screenshot', (state) => {
    if (state.currentStep === WorkflowStep.FAILED) return 'fail';
    if (state.currentStep === WorkflowStep.AWAITING_USER_INPUT) return '__end__';
    return 'analyze';
  });

  addConditionalEdges('analyze', (state) => {
    if (state.currentStep === WorkflowStep.FAILED) return 'fail';
    return 'generate';
  });

  addConditionalEdges('generate', (state) => {
    if (state.currentStep === WorkflowStep.FAILED) return 'fail';
    return 'validate';
  });

  addConditionalEdges('validate', (state) => {
    if (state.currentStep === WorkflowStep.FAILED) return 'fail';
    return 'complete';
  });

  addEdge('complete', '__end__');
  addEdge('fail', '__end__');

  return workflow;
}

/**
 * Create and compile the Block Builder workflow with checkpointing
 */
export function createWorkflow(mcpClient: MCPClient, checkpointer?: MemorySaver) {
  const workflow = createLangGraphWorkflow(mcpClient);
  const saver = checkpointer || new MemorySaver();
  
  return workflow.compile({ checkpointer: saver });
}

/**
 * Run the Block Builder workflow with LangGraph
 */
export async function runWorkflow(
  input: WorkflowInput,
  mcpClient: MCPClient,
  threadId: string = 'default'
): Promise<WorkflowState> {
  const graph = createWorkflow(mcpClient);
  
  const initialState: Partial<WorkflowState> = {
    input,
    currentStep: WorkflowStep.INITIALIZED,
    errors: [],
    startTime: new Date().toISOString(),
  };

  const config = { 
    configurable: { thread_id: threadId },
    recursionLimit: 50,
  };

  const result = await graph.invoke(initialState, config);
  return result as WorkflowState;
}

/**
 * Resume a workflow with user-provided input using LangGraph checkpointing
 */
export async function resumeWorkflow(
  userInput: string | { data: string; format: 'png' | 'jpg' },
  mcpClient: MCPClient,
  threadId: string = 'default'
): Promise<WorkflowState> {
  const graph = createWorkflow(mcpClient);
  
  const config = { 
    configurable: { thread_id: threadId },
    recursionLimit: 50,
  };

  // Get current state from checkpoint
  const checkpoint = await graph.getState(config);
  
  if (!checkpoint || checkpoint.values.currentStep !== WorkflowStep.AWAITING_USER_INPUT) {
    console.warn('⚠️  No workflow awaiting user input for this thread');
    return checkpoint?.values as WorkflowState;
  }

  // Process user input
  const { resumeWithUserInput } = await import('./nodes.js');
  const updates = await resumeWithUserInput(checkpoint.values as WorkflowState, userInput);

  // Resume workflow with updated state
  const result = await graph.invoke(updates, config);
  return result as WorkflowState;
}

/**
 * Get the current state of a workflow
 */
export async function getWorkflowState(
  mcpClient: MCPClient,
  threadId: string = 'default'
): Promise<WorkflowState | null> {
  const graph = createWorkflow(mcpClient);
  const config = { configurable: { thread_id: threadId } };
  
  const checkpoint = await graph.getState(config);
  return checkpoint?.values as WorkflowState || null;
}

/**
 * List all workflow threads
 */
export async function listWorkflowThreads(
  mcpClient: MCPClient
): Promise<string[]> {
  // Note: MemorySaver doesn't expose list() by default
  // For production, use a persistent checkpointer with list capability
  console.warn('Thread listing not available with MemorySaver');
  return [];
}
