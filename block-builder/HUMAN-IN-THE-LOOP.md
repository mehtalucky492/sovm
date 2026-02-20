# Human-in-the-Loop Workflow Pattern

## Overview

The Block Builder workflow supports human-in-the-loop interruption when automated tools fail and require user input to continue. This is particularly useful when the Figma screenshot tool fails but a screenshot would significantly improve block generation quality.

## How It Works

### 1. Automatic Detection

When the `get_screenshot` tool fails, the workflow automatically:
- Pauses execution
- Changes state to `AWAITING_USER_INPUT`
- Provides a clear prompt for what's needed
- Stores the workflow state for resumption

### 2. User Notification

```typescript
// Workflow output when screenshot fails:
{
  currentStep: 'awaiting_user_input',
  awaitingUserInput: {
    requestedAt: '2025-12-05T10:30:00.000Z',
    promptMessage: 'Screenshot capture failed: Tool disabled by user. Please provide a screenshot of the Figma design (node: 5229-8457) to improve block generation accuracy. You can skip this by typing "skip" or providing a screenshot URL/base64 data.',
    inputType: 'screenshot'
  },
  errors: [{
    step: 'getting_screenshot',
    message: 'Screenshot tool failed: Tool disabled',
    requiresUserInput: true,
    userPrompt: 'Please provide a screenshot to continue, or type "skip" to proceed without it.'
  }]
}
```

### 3. User Response Options

#### Option A: Provide Screenshot

```typescript
import { resumeWorkflow } from './block-builder';

// User provides base64 screenshot
const screenshot = {
  data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
  format: 'png'
};

const finalState = await resumeWorkflow(pausedState, screenshot, mcpClient);
```

#### Option B: Skip Screenshot

```typescript
// User decides to skip
const finalState = await resumeWorkflow(pausedState, 'skip', mcpClient);
```

## Usage Examples

### Example 1: CLI Usage

```typescript
#!/usr/bin/env node
import { runWorkflow, resumeWorkflow, WorkflowStep } from './block-builder';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function main() {
  const input = {
    blockName: 'automotive-cards',
    figmaUrl: 'https://figma.com/design/xxx?node-id=5229-8457',
    outputPath: './blocks'
  };

  // Start workflow
  let state = await runWorkflow(input, mcpClient);

  // Check if waiting for user input
  while (state.currentStep === WorkflowStep.AWAITING_USER_INPUT) {
    const { promptMessage, inputType } = state.awaitingUserInput;
    
    console.log('\n🔔 User input required:');
    console.log(promptMessage);
    
    if (inputType === 'screenshot') {
      const answer = await new Promise<string>((resolve) => {
        rl.question('\nProvide screenshot path, URL, or type "skip": ', resolve);
      });

      if (answer.toLowerCase() === 'skip') {
        state = await resumeWorkflow(state, 'skip', mcpClient);
      } else {
        // Load screenshot from path/URL
        const screenshotData = await loadScreenshot(answer);
        state = await resumeWorkflow(state, screenshotData, mcpClient);
      }
    }
  }

  console.log('\n✅ Workflow completed!');
  console.log(`Block generated: ${state.input.blockName}`);
  
  rl.close();
}

async function loadScreenshot(path: string): Promise<{ data: string; format: 'png' | 'jpg' }> {
  // Implementation: Load from file or URL and convert to base64
  // ...
}

main();
```

### Example 2: Chat Mode Integration

```typescript
// In chat-integration.ts
import { runWorkflow, resumeWorkflow, WorkflowStep } from './workflow.js';

export async function generateBlockFromFigma(
  input: WorkflowInput,
  onUserInputRequired?: (prompt: string) => Promise<string | object>
): Promise<string> {
  const mcpClient = createVSCodeMCPClient();
  let state = await runWorkflow(input, mcpClient);

  // Handle user input requests
  while (state.currentStep === WorkflowStep.AWAITING_USER_INPUT && onUserInputRequired) {
    const { promptMessage } = state.awaitingUserInput;
    
    // Ask user via chat
    const userResponse = await onUserInputRequired(promptMessage);
    
    // Resume with user's response
    state = await resumeWorkflow(state, userResponse, mcpClient);
  }

  return formatWorkflowResult(state);
}
```

### Example 3: VS Code Extension UI

```typescript
// In mcp-tool.ts
export async function handleBlockGeneration(
  input: WorkflowInput,
  token: vscode.LanguageModelToolInvocationToken
): Promise<vscode.LanguageModelToolResult> {
  const mcpClient = createVSCodeMCPClient(token);
  let state = await runWorkflow(input, mcpClient);

  // Check for user input requirement
  if (state.currentStep === WorkflowStep.AWAITING_USER_INPUT) {
    const { promptMessage } = state.awaitingUserInput;
    
    // Show VS Code input box
    const userInput = await vscode.window.showInputBox({
      prompt: promptMessage,
      placeHolder: 'Provide screenshot URL or type "skip"',
      ignoreFocusOut: true
    });

    if (userInput) {
      state = await resumeWorkflow(state, userInput, mcpClient);
    } else {
      // User cancelled
      state = await resumeWorkflow(state, 'skip', mcpClient);
    }
  }

  return formatToolResult(state);
}
```

## State Persistence

For long-running workflows, persist state between sessions:

```typescript
import fs from 'fs/promises';

// Save paused state
if (state.currentStep === WorkflowStep.AWAITING_USER_INPUT) {
  await fs.writeFile(
    './workflow-state.json',
    JSON.stringify(state, null, 2)
  );
  console.log('Workflow paused. Resume later with saved state.');
}

// Resume from saved state
const savedState = JSON.parse(
  await fs.readFile('./workflow-state.json', 'utf-8')
);

const screenshot = await getScreenshotFromUser();
const finalState = await resumeWorkflow(savedState, screenshot, mcpClient);
```

## Benefits

### 1. Graceful Degradation
- Workflow doesn't fail completely when optional tools are unavailable
- User can decide whether to provide missing input or skip

### 2. Better User Experience
- Clear prompts explain what's needed and why
- Multiple options (provide input vs skip)
- Workflow can be paused and resumed

### 3. Improved Quality
- Screenshots significantly improve analyzer accuracy
- User can ensure critical visual context is captured
- Allows manual intervention for complex designs

### 4. Flexibility
- Works in CLI, chat, and extension environments
- Can be extended for other types of user input
- State can be persisted for async workflows

## Error Handling

The workflow tracks whether an error requires user input:

```typescript
interface WorkflowError {
  step: WorkflowStep;
  message: string;
  timestamp: string;
  retryable: boolean;
  requiresUserInput?: boolean;  // NEW: Indicates human intervention needed
  userPrompt?: string;          // NEW: Specific prompt for user
}
```

This allows sophisticated error recovery strategies:
- Automatic retry for transient errors
- User input request for missing data
- Clear failure for unrecoverable errors

## Future Extensions

This pattern can be extended to other scenarios:

1. **Confirmation Prompts**
   ```typescript
   awaitingUserInput: {
     inputType: 'confirmation',
     promptMessage: 'Block already exists. Overwrite? (yes/no)'
   }
   ```

2. **Design Decisions**
   ```typescript
   awaitingUserInput: {
     inputType: 'choice',
     promptMessage: 'Multiple layouts detected. Choose: (1) Grid, (2) Carousel, (3) List',
     options: ['grid', 'carousel', 'list']
   }
   ```

3. **Additional Context**
   ```typescript
   awaitingUserInput: {
     inputType: 'text',
     promptMessage: 'Provide block description for documentation:'
   }
   ```

## Testing

Test the human-in-the-loop pattern:

```typescript
describe('Human-in-the-Loop', () => {
  it('should pause workflow when screenshot fails', async () => {
    const state = await runWorkflow(input, mcpClient);
    expect(state.currentStep).toBe(WorkflowStep.AWAITING_USER_INPUT);
    expect(state.awaitingUserInput.inputType).toBe('screenshot');
  });

  it('should resume with user screenshot', async () => {
    const pausedState = { /* saved state */ };
    const screenshot = { data: 'base64...', format: 'png' };
    
    const state = await resumeWorkflow(pausedState, screenshot, mcpClient);
    expect(state.currentStep).toBe(WorkflowStep.COMPLETED);
    expect(state.userProvidedScreenshot).toBe(true);
  });

  it('should skip screenshot if user chooses', async () => {
    const pausedState = { /* saved state */ };
    const state = await resumeWorkflow(pausedState, 'skip', mcpClient);
    
    expect(state.currentStep).toBe(WorkflowStep.COMPLETED);
    expect(state.screenshot).toBeUndefined();
  });
});
```

## Summary

The human-in-the-loop pattern makes the Block Builder workflow more resilient and user-friendly by:
- ✅ Detecting when user input would be helpful
- ✅ Pausing execution with clear prompts
- ✅ Allowing users to provide missing data or skip
- ✅ Resuming workflow seamlessly after intervention
- ✅ Maintaining full workflow state for async operations

This ensures that tool failures don't block progress while still enabling users to improve generation quality when possible.
