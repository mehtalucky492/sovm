# Quick Start Guide

## Prerequisites

1. Node.js 18+ installed
2. VS Code with MCP servers configured
3. Figma access token

## Setup

### 1. Install Dependencies

```bash
cd block-builder
npm install
```

### 2. Build the Project

```bash
npm run build
```

### 3. Verify Installation

```bash
npm run generate -- --help
```

## Your First Block

### Example: Generate a Service Cards Block

```bash
npm run generate -- \
  --name "service-cards" \
  --url "https://www.figma.com/design/a22zeHataamSBeRrqPvwvt/AEM-Landing-w--Kit?node-id=10438-8072" \
  --output "../blocks"
```

Expected output:

```
🚀 Initializing Block Builder workflow...
   Block name: service-cards
   Parsed node ID from URL: 10438:8072

📥 Step 1: Extracting design context from Figma...
✅ Design context extracted: 15847 characters

📷 Step 2: Capturing screenshot from Figma...
✅ Screenshot captured

🔍 Step 3: Analyzing block structure for EDS compatibility...
✅ Analysis complete:
   - Block type: multi-item
   - Container fields: 2
   - Item fields: 5

🏗️  Step 4: Generating EDS block files...
✅ Block files generated:
   - CSS: 2341 bytes
   - JavaScript: 1876 bytes
   - Model: 945 bytes

✅ Step 5: Validating generated block...
✅ Validation PASSED:
   - Errors: 0
   - Warnings: 1

🎉 Block Builder workflow completed successfully!
   Block "service-cards" is ready in ../blocks
   Duration: 12.34s
```

### Generated Files

```
blocks/service-cards/
├── service-cards.css
├── service-cards.js
└── _service-cards.json
```

## Common Workflows

### 1. Quick Generation (Skip Validation)

```bash
npm run generate -- \
  --name "hero" \
  --url "https://figma.com/..." \
  --no-validate
```

### 2. Strict Validation

```bash
npm run generate -- \
  --name "hero" \
  --url "https://figma.com/..." \
  --strict
```

### 3. Save State for Debugging

```bash
npm run generate -- \
  --name "hero" \
  --url "https://figma.com/..." \
  --save-state "./debug/hero-state.json"
```

### 4. Generate Without Section Model Update

```bash
npm run generate -- \
  --name "temp-block" \
  --url "https://figma.com/..." \
  --no-section-model
```

## Using in Code

### Basic Usage

```typescript
import { runWorkflow, WorkflowInput, WorkflowStep } from './block-builder';
import { createVSCodeMCPClient } from './block-builder/src/vscode-mcp-client';

const input: WorkflowInput = {
  blockName: 'service-cards',
  figmaUrl: 'https://figma.com/...',
  outputPath: './blocks',
};

const mcpClient = createVSCodeMCPClient();
const result = await runWorkflow(input, mcpClient);

if (result.currentStep === WorkflowStep.COMPLETED) {
  console.log('Success!', result.generatedFiles);
} else {
  console.error('Failed:', result.errors);
}
```

### With State Persistence

```typescript
import { runWorkflow } from './block-builder';
import { StatePersistence } from './block-builder/src/persistence';

const persistence = new StatePersistence();
const input = { blockName: 'hero', figmaUrl: '...' };

// Enable auto-save
persistence.enableAutoSave(state, (path) => {
  console.log(`State saved: ${path}`);
});

const result = await runWorkflow(input, mcpClient);

// Save final state
await persistence.saveState(result, 'hero-final.json');
```

### With Retry Logic

```typescript
import { runWorkflow } from './block-builder';
import { retryWithBackoff } from './block-builder/src/retry';

const result = await retryWithBackoff(
  async () => await runWorkflow(input, mcpClient),
  { maxRetries: 3, initialDelay: 2000 },
  (attempt, error) => {
    console.log(`Retry ${attempt}: ${error.message}`);
  }
);
```

## Troubleshooting

### Issue: "No Figma node ID provided"

**Cause**: Invalid Figma URL or missing node-id parameter

**Solution**: 
- Ensure URL includes `?node-id=XXX-YYY`
- Or provide `--node-id` directly: `--node-id "123:456"`

### Issue: "Failed to extract design context"

**Cause**: Invalid Figma access token or node not accessible

**Solution**:
- Check Figma access token in VS Code MCP settings
- Verify node exists and is accessible with your token
- Try accessing the node directly in Figma

### Issue: "Block generation failed"

**Cause**: Issue with generated code or analysis

**Solution**:
- Check saved state: `--save-state debug.json`
- Review design context in `.tmp/figma-eds/` (if `persistContext: true`)
- Try with `--no-validate` to see raw output

### Issue: VS Code MCP client requires extension context

**Cause**: Using `createVSCodeMCPClient()` outside of VS Code extension

**Solution**:
- Use within VS Code extension activation context
- Pass `toolInvocationToken` when called from language model tools
- See `vscode-mcp-client.ts` and `mcp-tool.ts` for examples

## Next Steps

1. **Add custom validation rules**: Extend validation logic in `nodes.ts`
2. **Create workflow templates**: Define reusable workflow configurations
3. **Set up monitoring**: Add metrics collection and reporting
4. **Implement persistent checkpointing**: Replace MemorySaver with disk-based storage

## Integration Guide

### VS Code Extension Integration

To integrate with a VS Code extension:

```typescript
// In your VS Code extension
import * as vscode from 'vscode';
import { runWorkflow } from './block-builder';

// Create MCP client using VS Code API
class VSCodeMCPClient implements MCPClient {
  async callTool<T>(toolName: string, args: Record<string, unknown>): Promise<MCPToolResult<T>> {
    // Use VS Code's MCP integration
    const result = await vscode.lm.invokeTool(toolName, args);
    return {
      success: true,
      data: result as T,
    };
  }
}

// Use in command
vscode.commands.registerCommand('blockBuilder.generate', async () => {
  const figmaUrl = await vscode.window.showInputBox({
    prompt: 'Enter Figma URL',
  });
  
  const blockName = await vscode.window.showInputBox({
    prompt: 'Enter block name',
  });
  
  if (figmaUrl && blockName) {
    const client = new VSCodeMCPClient();
    const result = await runWorkflow({
      blockName,
      figmaUrl,
      outputPath: vscode.workspace.rootPath + '/blocks',
    }, client);
    
    if (result.currentStep === WorkflowStep.COMPLETED) {
      vscode.window.showInformationMessage('Block generated successfully!');
    }
  }
});
```

## Additional Resources

- [LangGraph.js Documentation](https://langchain-ai.github.io/langgraphjs/)
- [Adobe EDS Documentation](https://www.aem.live/docs/)
- [Figma API Documentation](https://www.figma.com/developers/api)
- [MCP Protocol](https://modelcontextprotocol.io/)
