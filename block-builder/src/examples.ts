/**
 * Example: Using the Block Builder workflow programmatically
 */

import { runWorkflow, WorkflowInput, WorkflowStep } from './index.js';
import { StatePersistence, exportStateSummary } from './persistence.js';
import { retryWithBackoff, CircuitBreaker } from './retry.js';
import { createVSCodeMCPClient } from './vscode-mcp-client.js';

/**
 * Example 1: Basic workflow execution
 */
async function basicExample() {
  console.log('=== Basic Example ===\n');
  
  const input: WorkflowInput = {
    blockName: 'example-cards',
    figmaNodeId: '13157:13513',
    outputPath: './blocks',
  };

  const mcpClient = createVSCodeMCPClient();
  const result = await runWorkflow(input, mcpClient);

  if (result.currentStep === WorkflowStep.COMPLETED) {
    console.log('✅ Success!');
    console.log(`Duration: ${(result.duration! / 1000).toFixed(2)}s`);
  } else {
    console.log('❌ Failed');
    console.log('Errors:', result.errors);
  }
}

/**
 * Example 2: With state persistence
 */
async function persistenceExample() {
  console.log('\n=== Persistence Example ===\n');
  
  const persistence = new StatePersistence({
    stateDir: './.tmp/examples',
    autoSave: true,
    saveInterval: 2000,
  });

  const input: WorkflowInput = {
    blockName: 'hero-banner',
    figmaUrl: 'https://figma.com/design/ABC123/Hero?node-id=1-2',
    outputPath: './blocks',
  };

  const mcpClient = createVSCodeMCPClient();
  const result = await runWorkflow(input, mcpClient);

  // Save final state
  const statePath = await persistence.saveState(result);
  console.log(`State saved to: ${statePath}`);

  // Export summary
  const summary = exportStateSummary(result);
  console.log('\n' + summary);

  // List all saved states
  const states = await persistence.listStates();
  console.log(`\nTotal saved states: ${states.length}`);
}

/**
 * Example 3: With retry logic
 */
async function retryExample() {
  console.log('\n=== Retry Example ===\n');
  
  const input: WorkflowInput = {
    blockName: 'service-cards',
    figmaNodeId: '10438:8072',
    outputPath: './blocks',
  };

  const mcpClient = createVSCodeMCPClient();

  try {
    const result = await retryWithBackoff(
      async () => {
        const res = await runWorkflow(input, mcpClient);
        // Treat failures as retryable
        if (res.currentStep === WorkflowStep.FAILED) {
          throw new Error('Workflow failed');
        }
        return res;
      },
      {
        maxRetries: 3,
        initialDelay: 1000,
        maxDelay: 5000,
        backoffMultiplier: 2,
      },
      (attempt, error) => {
        console.log(`Retry attempt ${attempt}: ${error.message}`);
      }
    );

    console.log('✅ Workflow succeeded after retries');
    console.log(`Final step: ${result.currentStep}`);
  } catch (error) {
    console.log('❌ All retries exhausted');
    console.error(error);
  }
}

/**
 * Example 4: With circuit breaker
 */
async function circuitBreakerExample() {
  console.log('\n=== Circuit Breaker Example ===\n');
  
  const breaker = new CircuitBreaker(3, 30000); // Open after 3 failures, reset after 30s
  const mcpClient = createVSCodeMCPClient();

  // Simulate multiple workflow executions
  for (let i = 0; i < 5; i++) {
    try {
      console.log(`\nAttempt ${i + 1}:`);
      
      const result = await breaker.execute(async () => {
        return await runWorkflow({
          blockName: `test-block-${i}`,
          figmaNodeId: '123:456',
          outputPath: './blocks',
        }, mcpClient);
      });

      console.log(`✅ Success - State: ${breaker.getState()}`);
    } catch (error) {
      console.log(`❌ Failed - State: ${breaker.getState()}`);
      if (error instanceof Error && error.message.includes('Circuit breaker is open')) {
        console.log('Circuit breaker is open, waiting for reset...');
        break;
      }
    }
  }
}

/**
 * Example 5: Batch processing
 */
async function batchExample() {
  console.log('\n=== Batch Processing Example ===\n');
  
  const blocks = [
    { name: 'hero', nodeId: '1:2' },
    { name: 'cards', nodeId: '3:4' },
    { name: 'footer', nodeId: '5:6' },
  ];

  const mcpClient = createVSCodeMCPClient();
  const persistence = new StatePersistence();

  const results = await Promise.allSettled(
    blocks.map(async (block) => {
      console.log(`\nGenerating ${block.name}...`);
      
      const result = await runWorkflow({
        blockName: block.name,
        figmaNodeId: block.nodeId,
        outputPath: './blocks',
      }, mcpClient);

      // Save state for each block
      await persistence.saveState(result, `${block.name}-batch.json`);

      return result;
    })
  );

  // Summary
  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  console.log(`\n=== Batch Summary ===`);
  console.log(`Total: ${blocks.length}`);
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${failed}`);
}

/**
 * Example 6: Custom validation
 */
async function customValidationExample() {
  console.log('\n=== Custom Validation Example ===\n');
  
  const input: WorkflowInput = {
    blockName: 'validated-block',
    figmaNodeId: '789:101',
    outputPath: './blocks',
    options: {
      updateSectionModel: true,
      validateOutput: true,
      persistContext: true,
      skipScreenshot: false,
      strictValidation: true,
    },
  };

  const mcpClient = createVSCodeMCPClient();
  const result = await runWorkflow(input, mcpClient);

  if (result.validation) {
    console.log('Validation Results:');
    console.log(`- Status: ${result.validation.summary.status}`);
    console.log(`- Errors: ${result.validation.summary.totalErrors}`);
    console.log(`- Warnings: ${result.validation.summary.totalWarnings}`);

    if (result.validation.errors.length > 0) {
      console.log('\nErrors:');
      result.validation.errors.forEach(err => console.log(`  - ${err}`));
    }

    if (result.validation.warnings.length > 0) {
      console.log('\nWarnings:');
      result.validation.warnings.forEach(warn => console.log(`  - ${warn}`));
    }
  }
}

/**
 * Run all examples
 */
async function runExamples() {
  try {
    await basicExample();
    await persistenceExample();
    await retryExample();
    await circuitBreakerExample();
    await batchExample();
    await customValidationExample();
    
    console.log('\n=== All Examples Completed ===\n');
  } catch (error) {
    console.error('Example failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runExamples();
}

export {
  basicExample,
  persistenceExample,
  retryExample,
  circuitBreakerExample,
  batchExample,
  customValidationExample,
};
