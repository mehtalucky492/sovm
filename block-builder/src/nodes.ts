/**
 * LangGraph workflow nodes for the Block Builder pipeline
 */

import { interrupt } from '@langchain/langgraph';
import { WorkflowState, WorkflowStep, WorkflowError } from './types.js';
import { FigmaMCPClient, EDSGeneratorMCPClient, parseFigmaUrl } from './mcp-client.js';

/**
 * Initialize the workflow state
 */
export async function initializeWorkflow(state: WorkflowState): Promise<Partial<WorkflowState>> {
  console.log('🚀 Initializing Block Builder workflow...');
  console.log(`   Block name: ${state.input.blockName}`);
  
  // Parse Figma URL if provided
  if (state.input.figmaUrl && !state.input.figmaNodeId) {
    const parsed = parseFigmaUrl(state.input.figmaUrl);
    if (parsed?.nodeId) {
      console.log(`   Parsed node ID from URL: ${parsed.nodeId}`);
      return {
        input: {
          ...state.input,
          figmaNodeId: parsed.nodeId,
          figmaFileKey: parsed.fileKey,
        },
        currentStep: WorkflowStep.EXTRACTING_DESIGN,
        startTime: new Date().toISOString(),
        errors: [],
      };
    }
  }

  return {
    currentStep: WorkflowStep.EXTRACTING_DESIGN,
    startTime: new Date().toISOString(),
    errors: [],
  };
}

/**
 * Extract design context from Figma
 */
export async function extractDesignContext(
  state: WorkflowState,
  figmaClient: FigmaMCPClient
): Promise<Partial<WorkflowState>> {
  console.log('\n📥 Step 1: Extracting design context from Figma...');
  
  const nodeId = state.input.figmaNodeId;
  if (!nodeId) {
    const error: WorkflowError = {
      step: WorkflowStep.EXTRACTING_DESIGN,
      message: 'No Figma node ID provided',
      timestamp: new Date().toISOString(),
      retryable: false,
    };
    return {
      currentStep: WorkflowStep.FAILED,
      errors: [...state.errors, error],
    };
  }

  const result = await figmaClient.getDesignContext(nodeId);
  
  if (!result.success || !result.data) {
    const error: WorkflowError = {
      step: WorkflowStep.EXTRACTING_DESIGN,
      message: result.error || 'Failed to extract design context',
      timestamp: new Date().toISOString(),
      retryable: true,
    };
    return {
      currentStep: WorkflowStep.FAILED,
      errors: [...state.errors, error],
    };
  }

  console.log(`✅ Design context extracted: ${result.data.generatedCode.length} characters`);
  
  return {
    designContext: result.data,
    currentStep: state.input.options?.skipScreenshot 
      ? WorkflowStep.ANALYZING 
      : WorkflowStep.GETTING_SCREENSHOT,
  };
}

/**
 * Get screenshot from Figma with LangGraph interrupt
 */
export async function getScreenshot(
  state: WorkflowState,
  figmaClient: FigmaMCPClient
): Promise<Partial<WorkflowState>> {
  console.log('\n📷 Step 2: Capturing screenshot from Figma...');
  
  const nodeId = state.input.figmaNodeId;
  if (!nodeId) {
    console.log('⚠️  No node ID, skipping screenshot');
    return { currentStep: WorkflowStep.ANALYZING };
  }

  const result = await figmaClient.getScreenshot(nodeId);
  
  if (!result.success || !result.data) {
    console.log(`⚠️  Screenshot failed: ${result.error}`);
    console.log('🔔 Requesting user to provide screenshot manually...');
    
    // Use LangGraph interrupt - execution pauses here
    const userInput = interrupt({
      message: `Screenshot capture failed: ${result.error}. Please provide a screenshot of the Figma design (node: ${nodeId}) to improve block generation accuracy.`,
      options: ['Provide screenshot URL/base64', 'Type "skip" to continue without it'],
    });

    // When resumed, userInput will contain the user's response
    if (typeof userInput === 'string' && userInput.toLowerCase() === 'skip') {
      console.log('⏭️  User chose to skip screenshot');
      return { currentStep: WorkflowStep.ANALYZING };
    }

    if (typeof userInput === 'object' && userInput.data) {
      console.log('✅ User provided screenshot');
      return {
        screenshot: {
          data: userInput.data,
          format: userInput.format || 'png',
          timestamp: new Date().toISOString(),
        },
        userProvidedScreenshot: true,
        currentStep: WorkflowStep.ANALYZING,
      };
    }

    // Fallback: continue without screenshot
    console.log('⏭️  Invalid input, continuing without screenshot');
    return { currentStep: WorkflowStep.ANALYZING };
  }

  console.log('✅ Screenshot captured');
  
  return {
    screenshot: result.data,
    currentStep: WorkflowStep.ANALYZING,
  };
}

/**
 * Analyze block structure
 */
export async function analyzeBlockStructure(
  state: WorkflowState,
  edsClient: EDSGeneratorMCPClient
): Promise<Partial<WorkflowState>> {
  console.log('\n🔍 Step 3: Analyzing block structure for EDS compatibility...');
  
  if (!state.designContext?.generatedCode) {
    const error: WorkflowError = {
      step: WorkflowStep.ANALYZING,
      message: 'No design context available for analysis',
      timestamp: new Date().toISOString(),
      retryable: false,
    };
    return {
      currentStep: WorkflowStep.FAILED,
      errors: [...state.errors, error],
    };
  }

  const result = await edsClient.analyzeBlockStructure(
    state.designContext.generatedCode,
    state.screenshot?.data,
    state.metadata ? JSON.stringify(state.metadata) : undefined
  );
  
  if (!result.success || !result.data) {
    const error: WorkflowError = {
      step: WorkflowStep.ANALYZING,
      message: result.error || 'Block structure analysis failed',
      timestamp: new Date().toISOString(),
      retryable: true,
    };
    return {
      currentStep: WorkflowStep.FAILED,
      errors: [...state.errors, error],
    };
  }

  console.log('✅ Analysis complete:');
  console.log(`   - Block type: ${result.data.blockType}`);
  console.log(`   - Container fields: ${result.data.contentStructure.containerFields.length}`);
  console.log(`   - Item fields: ${result.data.contentStructure.itemFields?.length || 0}`);
  
  return {
    analysis: {
      ...result.data,
      blockName: state.input.blockName,
    },
    currentStep: WorkflowStep.GENERATING,
  };
}

/**
 * Generate EDS block files
 */
export async function generateEdsBlock(
  state: WorkflowState,
  edsClient: EDSGeneratorMCPClient
): Promise<Partial<WorkflowState>> {
  console.log('\n🏗️  Step 4: Generating EDS block files...');
  
  if (!state.designContext?.generatedCode) {
    const error: WorkflowError = {
      step: WorkflowStep.GENERATING,
      message: 'No design context available for generation',
      timestamp: new Date().toISOString(),
      retryable: false,
    };
    return {
      currentStep: WorkflowStep.FAILED,
      errors: [...state.errors, error],
    };
  }

  const result = await edsClient.generateEdsBlock(
    state.input.blockName,
    state.input.outputPath,
    state.designContext.generatedCode,
    {
      screenshot: state.screenshot?.data,
      metadata: state.metadata ? JSON.stringify(state.metadata) : undefined,
      persistContext: state.input.options?.persistContext,
      updateSectionModel: state.input.options?.updateSectionModel,
      validateOutput: false, // We'll validate separately for better control
    }
  );
  
  if (!result.success || !result.data) {
    const error: WorkflowError = {
      step: WorkflowStep.GENERATING,
      message: result.error || 'Block generation failed',
      timestamp: new Date().toISOString(),
      retryable: true,
    };
    return {
      currentStep: WorkflowStep.FAILED,
      errors: [...state.errors, error],
    };
  }

  console.log('✅ Block files generated:');
  console.log(`   - CSS: ${result.data.css.length} bytes`);
  console.log(`   - JavaScript: ${result.data.javascript.length} bytes`);
  console.log(`   - Model: ${result.data.model.length} bytes`);
  
  const nextStep = state.input.options?.validateOutput 
    ? WorkflowStep.VALIDATING 
    : (state.input.options?.updateSectionModel 
        ? WorkflowStep.UPDATING_SECTION_MODEL 
        : WorkflowStep.COMPLETED);
  
  return {
    generatedFiles: result.data,
    currentStep: nextStep,
  };
}

/**
 * Validate generated block
 */
export async function validateBlock(
  state: WorkflowState,
  edsClient: EDSGeneratorMCPClient
): Promise<Partial<WorkflowState>> {
  console.log('\n✅ Step 5: Validating generated block...');
  
  const blockPath = `${state.input.outputPath}/${state.input.blockName}`;
  const result = await edsClient.validateBlockOutput(
    blockPath,
    state.input.blockName,
    state.input.options?.strictValidation || false
  );
  
  if (!result.success || !result.data) {
    console.log(`⚠️  Validation check failed: ${result.error}`);
    // Don't fail the workflow, just log and continue
    return {
      currentStep: state.input.options?.updateSectionModel 
        ? WorkflowStep.UPDATING_SECTION_MODEL 
        : WorkflowStep.COMPLETED,
    };
  }

  console.log(`✅ Validation ${result.data.validated ? 'PASSED' : 'FAILED'}:`);
  console.log(`   - Errors: ${result.data.errors.length}`);
  console.log(`   - Warnings: ${result.data.warnings.length}`);
  
  if (result.data.errors.length > 0) {
    console.log('\n   Errors:');
    result.data.errors.forEach(err => console.log(`     - ${err}`));
  }
  
  if (result.data.warnings.length > 0) {
    console.log('\n   Warnings:');
    result.data.warnings.forEach(warn => console.log(`     - ${warn}`));
  }
  
  return {
    validation: result.data,
    currentStep: state.input.options?.updateSectionModel 
      ? WorkflowStep.UPDATING_SECTION_MODEL 
      : WorkflowStep.COMPLETED,
  };
}

/**
 * Complete the workflow
 */
export async function completeWorkflow(state: WorkflowState): Promise<Partial<WorkflowState>> {
  console.log('\n🎉 Block Builder workflow completed successfully!');
  console.log(`   Block "${state.input.blockName}" is ready in ${state.input.outputPath}`);
  
  const endTime = new Date().toISOString();
  const duration = new Date(endTime).getTime() - new Date(state.startTime).getTime();
  
  console.log(`   Duration: ${(duration / 1000).toFixed(2)}s`);
  
  return {
    currentStep: WorkflowStep.COMPLETED,
    endTime,
    duration,
  };
}

/**
 * Resume workflow with user-provided input
 */
export async function resumeWithUserInput(
  state: WorkflowState,
  userInput: string | { data: string; format: 'png' | 'jpg' }
): Promise<Partial<WorkflowState>> {
  console.log('\n📥 Received user input, resuming workflow...');
  
  if (!state.awaitingUserInput) {
    console.log('⚠️  No pending user input request');
    return { currentStep: state.currentStep };
  }

  const { inputType } = state.awaitingUserInput;

  // Handle screenshot input
  if (inputType === 'screenshot') {
    if (typeof userInput === 'string' && userInput.toLowerCase() === 'skip') {
      console.log('⏭️  User chose to skip screenshot, continuing without it');
      return {
        awaitingUserInput: undefined,
        currentStep: WorkflowStep.ANALYZING,
      };
    }

    if (typeof userInput === 'object' && userInput.data) {
      console.log('✅ User provided screenshot');
      return {
        screenshot: {
          data: userInput.data,
          format: userInput.format,
          timestamp: new Date().toISOString(),
        },
        userProvidedScreenshot: true,
        awaitingUserInput: undefined,
        currentStep: WorkflowStep.ANALYZING,
      };
    }

    console.log('⚠️  Invalid screenshot format, skipping');
    return {
      awaitingUserInput: undefined,
      currentStep: WorkflowStep.ANALYZING,
    };
  }

  return { currentStep: state.currentStep };
}

/**
 * Handle workflow failure
 */
export async function handleFailure(state: WorkflowState): Promise<Partial<WorkflowState>> {
  console.log('\n❌ Block Builder workflow failed');
  console.log(`   Step: ${state.currentStep}`);
  console.log(`   Errors: ${state.errors.length}`);
  
  state.errors.forEach((err, i) => {
    console.log(`\n   Error ${i + 1}:`);
    console.log(`     Step: ${err.step}`);
    console.log(`     Message: ${err.message}`);
    console.log(`     Retryable: ${err.retryable}`);
  });
  
  const endTime = new Date().toISOString();
  const duration = new Date(endTime).getTime() - new Date(state.startTime).getTime();
  
  return {
    currentStep: WorkflowStep.FAILED,
    endTime,
    duration,
  };
}
