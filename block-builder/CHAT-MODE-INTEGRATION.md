# Block Builder Workflow - Chat Mode Integration Guide

## Overview

The Block Builder workflow is now integrated with the Block Builder chat mode, providing automated orchestration for Figma-to-EDS block generation with error handling, retry logic, and state management.

## Architecture

```
Block Builder Chat Mode
         ↓
chat-integration.ts (Helper Functions)
         ↓
workflow.ts (Orchestrator)
         ↓
vscode-mcp-client.ts (VS Code MCP Integration)
         ↓
MCP Tools (figma-mcp, aem-eds-mcp)
```

## Usage from Chat Mode

### 1. Generate a Block from Figma (Recommended)

The primary way to generate blocks is using the `generateBlockFromFigma` function:

```typescript
import { generateBlockFromFigma, formatWorkflowResult } from '../block-builder/dist/chat-integration.js';

const result = await generateBlockFromFigma({
  blockName: 'feature-cards',
  figmaUrl: 'https://figma.com/design/abc123/MyFile?node-id=13157-13513',
  // OR use: figmaNodeId: '13157:13513',
  outputPath: './blocks',
  options: {
    skipScreenshot: false,      // Capture visual reference
    updateSectionModel: true,   // Add to section model
    validateOutput: true,       // Run validation
    strictValidation: false,    // Strict mode off
    persistContext: true,       // Save intermediate files
  }
});

// Display formatted result
console.log(formatWorkflowResult(result));

// Check result
if (result.currentStep === 'COMPLETED') {
  console.log('✅ Block generated successfully!');
  console.log(`Location: ${result.input.outputPath}/${result.input.blockName}`);
} else {
  console.error('❌ Block generation failed');
  result.errors.forEach(err => console.error(`- ${err.step}: ${err.message}`));
}
```

### 2. Analyze Figma Design (Preview Before Generation)

Use `analyzeFigmaDesign` to preview structure before generating:

```typescript
import { analyzeFigmaDesign } from '../block-builder/dist/chat-integration.js';

const analysis = await analyzeFigmaDesign({
  figmaUrl: 'https://figma.com/design/abc123/MyFile?node-id=13157-13513',
  // OR use: figmaNodeId: '13157:13513'
});

if (analysis.success) {
  console.log('Design Context:', analysis.designContext);
  console.log('Analysis:', analysis.analysis);
  
  // Show structure to user
  const blockType = analysis.analysis?.blockType;
  const containerFields = analysis.analysis?.containerFields?.length || 0;
  const itemFields = analysis.analysis?.itemFields?.length || 0;
  
  console.log(`Block Type: ${blockType}`);
  console.log(`Container Fields: ${containerFields}`);
  console.log(`Item Fields: ${itemFields}`);
} else {
  console.error('Analysis failed:', analysis.error);
}
```

### 3. Validate an Existing Block

Use `validateBlock` to check an existing block:

```typescript
import { validateBlock } from '../block-builder/dist/chat-integration.js';

const validation = await validateBlock({
  blockName: 'hero',
  blockPath: './blocks/hero',
  strictMode: false,
});

if (validation.success) {
  const summary = validation.validation?.summary;
  console.log(`Validation Status: ${summary?.status}`);
  console.log(`Errors: ${summary?.totalErrors}`);
  console.log(`Warnings: ${summary?.totalWarnings}`);
} else {
  console.error('Validation failed:', validation.error);
}
```

## How It Works

### The Workflow Orchestrator

The workflow automatically handles all 6 steps:

1. **Initialize**: Parse Figma URL to extract node ID
2. **Extract Design**: Call `mcp_figma-mcp_get_design_context` for React+Tailwind code
3. **Capture Screenshot**: Call `mcp_figma-mcp_get_screenshot` for visual reference
4. **Analyze Structure**: Call `mcp_aem-eds-mcp_analyzeBlockStructure` to determine block type
5. **Generate Files**: Call `mcp_aem-eds-mcp_generateEdsBlock` to create CSS/JS/JSON
6. **Validate Output**: Call `mcp_aem-eds-mcp_validateBlockOutput` to check quality

### VS Code MCP Integration

The workflow uses `VSCodeMCPClient` to call MCP tools through VS Code's `lm.invokeTool` API:

```typescript
// The client automatically:
// 1. Finds registered MCP tools (figma-mcp/*, aem-eds-mcp/*)
// 2. Invokes them with proper parameters
// 3. Handles errors and retries
// 4. Returns typed results
```

### Error Handling

Built-in error handling includes:
- **Retry Logic**: Exponential backoff for transient failures
- **Circuit Breaker**: Prevents cascading failures
- **State Persistence**: Resume from checkpoint if workflow fails
- **Detailed Error Messages**: Step-by-step error tracking

## Configuration

### Required MCP Servers

The workflow requires two MCP servers configured in `.vscode/mcp.json`:

```json
{
  "servers": {
    "figma-mcp": {
      "url": "http://127.0.0.1:3845/mcp",
      "type": "http"
    },
    "aem-eds-mcp": {
      "command": "/Users/seanohern/.nvm/versions/node/v20.5.0/bin/node",
      "args": ["/Users/seanohern/adobe-code-kit/adobe-code-kit/figma-eds-mcp-server/dist/server.js"]
    }
  }
}
```

### Chat Mode Tools

The Block Builder chat mode includes access to MCP tools:

```yaml
tools: ['figma-mcp/*', 'aem-eds-mcp/*', ...]
```

## Workflow State

### WorkflowState Interface

```typescript
interface WorkflowState {
  input: WorkflowInput;              // Original request
  currentStep: WorkflowStep;         // Current step enum
  designContext?: DesignContext;     // Figma design code
  screenshot?: Screenshot;           // Visual reference
  metadata?: FigmaMetadata;          // Node structure
  analysis?: BlockAnalysis;          // EDS compatibility
  generatedFiles?: GeneratedFiles;   // CSS/JS/JSON
  validation?: ValidationResult;     // Quality checks
  errors: WorkflowError[];           // Error stack
  startTime: string;                 // ISO timestamp
  endTime?: string;                  // ISO timestamp
  duration?: number;                 // Milliseconds
}
```

### WorkflowStep Enum

```typescript
enum WorkflowStep {
  INITIALIZED = 'INITIALIZED',
  EXTRACTING_DESIGN = 'EXTRACTING_DESIGN',
  CAPTURING_SCREENSHOT = 'CAPTURING_SCREENSHOT',
  ANALYZING_STRUCTURE = 'ANALYZING_STRUCTURE',
  GENERATING_BLOCK = 'GENERATING_BLOCK',
  VALIDATING = 'VALIDATING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}
```

## Examples

### Example 1: Simple Block Generation

```typescript
const result = await generateBlockFromFigma({
  blockName: 'quick-cards',
  figmaUrl: 'https://figma.com/design/abc/file?node-id=123-456',
});

if (result.currentStep === 'COMPLETED') {
  console.log('✅ Block created at ./blocks/quick-cards');
}
```

### Example 2: Block Generation with Custom Options

```typescript
const result = await generateBlockFromFigma({
  blockName: 'hero-banner',
  figmaNodeId: '13157:13513',
  outputPath: './custom-blocks',
  options: {
    skipScreenshot: true,        // Skip screenshot (faster)
    updateSectionModel: false,   // Don't modify section model
    validateOutput: true,        // Still validate
    strictValidation: true,      // Use strict mode
    persistContext: false,       // Don't save intermediate files
  }
});
```

### Example 3: Analysis Before Generation

```typescript
// First, analyze the design
const analysis = await analyzeFigmaDesign({
  figmaUrl: 'https://figma.com/design/abc/file?node-id=123-456',
});

if (analysis.success) {
  // Show preview to user
  console.log(`Block will have:`);
  console.log(`- Type: ${analysis.analysis?.blockType}`);
  console.log(`- Container Fields: ${analysis.analysis?.containerFields?.length}`);
  console.log(`- Item Fields: ${analysis.analysis?.itemFields?.length}`);
  
  // Ask for confirmation, then generate
  const confirmed = await askUser('Generate this block?');
  
  if (confirmed) {
    const result = await generateBlockFromFigma({
      blockName: 'my-block',
      figmaUrl: 'https://figma.com/design/abc/file?node-id=123-456',
    });
  }
}
```

## Troubleshooting

### "Tool 'mcp_figma-mcp_get_design_context' not found"

**Cause**: Figma MCP server not running or not configured.

**Solution**: Check `.vscode/mcp.json` and ensure figma-mcp server is running.

### "Tool 'mcp_aem-eds-mcp_analyzeBlockStructure' not found"

**Cause**: AEM-EDS MCP server not running or not configured.

**Solution**: Check `.vscode/mcp.json` and ensure aem-eds-mcp server is configured with absolute path to node.

### "No Figma node ID provided or could not parse from URL"

**Cause**: Invalid Figma URL format or missing node-id parameter.

**Solution**: Ensure URL includes `?node-id=<id>` or use `figmaNodeId` parameter directly.

### Workflow hangs or times out

**Cause**: MCP server not responding or network issue.

**Solution**: Check MCP server logs, restart servers, or use `skipScreenshot: true` to speed up workflow.

## Benefits Over Manual Tool Calls

1. **Automated Orchestration**: All 6 steps handled automatically
2. **Error Recovery**: Built-in retry logic and circuit breaker
3. **State Management**: Track progress and resume from failures
4. **Type Safety**: Full TypeScript types for inputs and outputs
5. **Observability**: Detailed logging and error messages
6. **Consistency**: Same workflow every time, no missed steps

## Future Enhancements

- **Batch Processing**: Generate multiple blocks from Figma frames
- **Incremental Updates**: Update existing blocks from Figma changes
- **Validation Rules**: Custom validation rules per project
- **CI/CD Integration**: Run workflow in automated pipelines
- **Performance Metrics**: Track generation time and quality scores
