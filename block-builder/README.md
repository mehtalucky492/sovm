# Block Builder - LangGraph.js Workflow

A LangGraph.js-based workflow orchestration system for generating Adobe Edge Delivery Services (EDS) blocks from Figma designs. This refactored system provides better control, observability, and extensibility compared to the previous ad-hoc approach.

## Overview

The Block Builder workflow automates the process of:
1. Extracting design context from Figma (React + Tailwind code)
2. Capturing screenshots for visual reference
3. Analyzing the design for EDS compatibility
4. Generating EDS block files (CSS, JS, JSON model)
5. Validating the output
6. Updating the section model for Universal Editor integration

## Architecture

### LangGraph State Machine

The workflow is implemented as a LangGraph StateGraph with the following nodes:

```
┌─────────────┐
│ Initialize  │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ Extract Design  │
└────────┬────────┘
         │
         ▼
┌──────────────────┐
│ Get Screenshot   │
└────────┬─────────┘
         │
         ▼
┌─────────────────┐
│ Analyze Block   │
└────────┬────────┘
         │
         ▼
┌──────────────────┐
│ Generate Files   │
└────────┬─────────┘
         │
         ▼
┌──────────────┐
│  Validate    │
└──────┬───────┘
       │
       ▼
┌─────────────┐
│  Complete   │
└─────────────┘
```

### Key Components

- **`workflow.ts`**: LangGraph StateGraph definition and orchestration
- **`nodes.ts`**: Individual workflow step implementations
- **`types.ts`**: TypeScript type definitions for state and data structures
- **`mcp-client.ts`**: MCP tool client wrappers for Figma and EDS servers
- **`retry.ts`**: Error handling, retry logic, and circuit breaker
- **`persistence.ts`**: Workflow state persistence and recovery
- **`cli.ts`**: Command-line interface

## Installation

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- Figma access token (for design context extraction)
- MCP servers configured in VS Code (see Configuration section below)

### Setup

1. **Navigate to the block-builder directory:**
   ```bash
   cd block-builder
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the TypeScript code:**
   ```bash
   npm run build
   ```

4. **Configure MCP servers** (see Configuration section below for details)

## Usage

The Block Builder workflow is primarily invoked **from VS Code chat mode** as an MCP tool. When you interact with GitHub Copilot or other chat interfaces in VS Code, you can trigger the Block Builder workflow to generate EDS blocks from Figma designs.

### Primary Usage: Chat Mode

Simply describe what you want in the chat:

**Examples:**
```
"Generate a service-cards block from this Figma URL: https://www.figma.com/design/xyz?node-id=123-456"

"Create an EDS block called hero-banner from Figma node 10438:8072"

"Build a new block for the feature cards design in Figma"
```

The chat assistant will invoke the `block-builder_generate` MCP tool, which:
- Extracts design context from Figma
- Captures screenshots for visual reference
- Analyzes block structure
- Generates files (CSS, JS, JSON model)
- Validates output
- Registers in section model

### Alternative: CLI Usage

For automation or scripting, you can also invoke the workflow directly from the command line:

```bash
node block-builder/dist/cli.js generate \
  --name "service-cards" \
  --url "https://www.figma.com/design/a22zeHataamSBeRrqPvwvt/AEM-Landing-w--Kit?node-id=10438-8072"
```

Or using a node ID:

```bash
node block-builder/dist/cli.js generate \
  --name "service-cards" \
  --node-id "10438:8072" \
  --output "./blocks"
```

### Advanced Options

#### In Chat Mode
You can specify options in your chat request:
```
"Generate service-cards block from Figma, skip validation"
"Create hero-banner block with strict validation enabled"
"Build feature-cards without updating section model"
```

#### In CLI Mode
Control workflow behavior with flags:

```bash
node block-builder/dist/cli.js generate \
  --name "hero-banner" \
  --url "https://figma.com/..." \
  --output "./blocks" \
  --no-screenshot \              # Skip screenshot capture
  --no-section-model \           # Don't update section model
  --no-validate \                # Skip validation
  --strict \                     # Enable strict validation
  --no-persist \                 # Don't save context artifacts
  --save-state "./state.json"    # Save final state to file
```

### CLI Commands Reference

When using CLI mode (not chat mode), run commands from the **root of the adobe-code-kit project**.

#### Generate a Block

```bash
node block-builder/dist/cli.js generate [options]
```

**Required Options:**
- `-n, --name <name>` - Block name (lowercase-hyphenated, e.g., "service-cards")
- `-u, --url <url>` - Figma URL with node-id parameter
  
  **OR**
  
- `-i, --node-id <nodeId>` - Figma node ID directly (e.g., "13157:13513")

**Optional Parameters:**
- `-o, --output <path>` - Output directory (default: "./blocks")
- `--no-screenshot` - Skip screenshot capture
- `--no-section-model` - Skip section model update (not recommended)
- `--no-validate` - Skip output validation
- `--strict` - Enable strict validation mode
- `--no-persist` - Don't persist context artifacts to `.tmp/figma-eds`
- `--save-state <path>` - Save workflow state to JSON file

**Examples:**

```bash
# Standard generation with Figma URL
node block-builder/dist/cli.js generate \
  --name "feature-cards" \
  --url "https://www.figma.com/design/xyz?node-id=123-456" \
  --output "./blocks"

# Using node ID directly
node block-builder/dist/cli.js generate \
  --name "hero-banner" \
  --node-id "123:456"

# Skip validation (faster, use for iteration)
node block-builder/dist/cli.js generate \
  --name "quick-cards" \
  --url "https://figma.com/..." \
  --no-validate

# Strict mode (more thorough validation)
node block-builder/dist/cli.js generate \
  --name "service-grid" \
  --url "https://figma.com/..." \
  --strict
```

#### Validate an Existing Block

Validate block files without regenerating:

```bash
node block-builder/dist/cli.js validate \
  --name "service-cards" \
  --path "./blocks" \
  --strict
```

#### Resume from Saved State

Resume a workflow from a previously saved state file:

```bash
node block-builder/dist/cli.js resume \
  --state "./state.json"
```

## Features

### 1. State Management

The workflow maintains a comprehensive state object throughout execution:

```typescript
interface WorkflowState {
  input: WorkflowInput;
  designContext?: DesignContext;
  screenshot?: Screenshot;
  analysis?: BlockAnalysis;
  generatedFiles?: GeneratedFiles;
  validation?: ValidationResult;
  currentStep: WorkflowStep;
  errors: WorkflowError[];
  startTime: string;
  endTime?: string;
  duration?: number;
}
```

### 2. Error Handling

- **Retry with exponential backoff**: Automatic retries for transient failures
- **Circuit breaker**: Prevents cascading failures with threshold-based circuit opening
- **Error classification**: Distinguishes between retryable and non-retryable errors

```typescript
// Automatic retry with backoff
await retryWithBackoff(
  async () => await figmaClient.getDesignContext(nodeId),
  { maxRetries: 3, initialDelay: 1000 }
);

// Circuit breaker for MCP calls
const breaker = new CircuitBreaker(5, 60000);
await breaker.execute(() => mcpClient.callTool(...));
```

### 3. State Persistence

- **Auto-save**: Periodic state snapshots during execution
- **Checkpoints**: Manual checkpoints at key workflow stages
- **Resume capability**: Resume workflows from saved states
- **State history**: Keep track of recent workflow executions

```typescript
const persistence = new StatePersistence();

// Auto-save every 5 seconds
persistence.enableAutoSave(state, (path) => {
  console.log(`State saved: ${path}`);
});

// Create checkpoint
await persistence.createCheckpoint(state, 'after-analysis');

// Load previous state
const prevState = await persistence.loadState('service-cards-2025-12-03.json');
```

### 4. Observability

- **Detailed logging**: Console output for each workflow step
- **Progress tracking**: Real-time updates on workflow progress
- **State inspection**: Export state summaries and diffs
- **Error reporting**: Comprehensive error context and stack traces

## Configuration

### MCP Server Configuration

The workflow requires two MCP servers:

1. **Figma MCP Server** (`figma-mcp`)
   - Provides: `get_design_context`, `get_screenshot`, `get_metadata`

2. **Figma-EDS MCP Server** (`aem-eds-mcp`)
   - Provides: `analyzeBlockStructure`, `generateEdsBlock`, `validateBlockOutput`

Add to your VS Code `settings.json`:

```json
{
  "mcp.servers": {
    "figma-mcp": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-figma"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "your-figma-token"
      }
    },
    "aem-eds-mcp": {
      "command": "node",
      "args": ["../figma-eds-mcp-server/dist/server.js"]
    }
  }
}
```

### Workflow Configuration

Customize behavior via `WorkflowInput.options`:

```typescript
const input: WorkflowInput = {
  blockName: 'hero-banner',
  figmaUrl: 'https://figma.com/...',
  outputPath: './blocks',
  options: {
    updateSectionModel: true,    // Update section model
    validateOutput: true,         // Run validation
    persistContext: true,         // Save artifacts
    skipScreenshot: false,        // Capture screenshot
    strictValidation: false,      // Strict mode
  },
};
```

## Development

### Project Structure

```
block-builder/
├── src/
│   ├── types.ts           # Type definitions
│   ├── mcp-client.ts      # MCP client wrappers
│   ├── nodes.ts           # Workflow node implementations
│   ├── workflow.ts        # LangGraph orchestration
│   ├── retry.ts           # Error handling utilities
│   ├── persistence.ts     # State persistence
│   ├── vscode-mcp-client.ts # Real VS Code MCP client implementation
│   ├── cli.ts             # Command-line interface
│   └── index.ts           # Main entry point
├── dist/                  # Compiled JavaScript
├── package.json
├── tsconfig.json
└── README.md
```

### Building from Source

When making changes to the TypeScript source:

```bash
# From the block-builder directory
cd block-builder

# Build once
npm run build

# Or watch mode for development (auto-recompile on changes)
npm run dev
```

### Testing Your Changes

After building, test from the project root:

```bash
# Navigate back to project root
cd ..

# Test your changes
node block-builder/dist/cli.js generate \
  --name "test-block" \
  --url "https://figma.com/..."
```

## Workflow Output

Upon successful completion, the Block Builder creates:

1. **Block files in `/blocks/[block-name]/`:**
   - `[block-name].css` - Styles using EY design tokens
   - `[block-name].js` - Universal Editor compatible decoration logic
   - `_[block-name].json` - Universal Editor model definition

2. **Updated section model:**
   - Adds your block to `/models/_section.json` filters (unless `--no-section-model` used)

3. **Context artifacts in `.tmp/figma-eds/`** (unless `--no-persist` used):
   - Design context (React code)
   - Screenshots
   - Analysis results

4. **State file** (if `--save-state` specified):
   - Complete workflow state for debugging/resume

### Post-Generation Steps

After successful generation:

1. **Rebuild Universal Editor models:**
   ```bash
   npm run build:json
   ```

2. **Test the block locally:**
   ```bash
   aem up  # Start local EDS development server
   ```

3. **Validate with linting:**
   ```bash
   npm run lint
   ```

## How Chat Mode Integration Works

The Block Builder is registered as an MCP tool (`block-builder_generate`) that VS Code chat interfaces can invoke:

### MCP Tool Registration

```typescript
// From mcp-tool.ts
export function registerBlockBuilderTool(context: vscode.ExtensionContext) {
  return vscode.lm.registerTool('block-builder_generate', {
    async invoke(options, token) {
      const workflowInput = {
        blockName: options.input.blockName,
        figmaUrl: options.input.figmaUrl,
        outputPath: options.input.outputPath || './blocks',
        // ... options
      };
      
      const mcpClient = createVSCodeMCPClient(options.toolInvocationToken);
      const result = await runWorkflow(workflowInput, mcpClient);
      
      return formatResultForChat(result);
    }
  });
}
```

### Programmatic Usage

You can also call the workflow directly from extensions:

```typescript
import { generateBlockFromFigma } from './block-builder/dist/chat-integration.js';

const result = await generateBlockFromFigma({
  blockName: 'service-cards',
  figmaUrl: 'https://figma.com/...',
  outputPath: './blocks',
  options: {
    validateOutput: true,
    strictValidation: false,
  }
});
```

## Advantages Over Previous Approach

### 1. **Better Control**
- Explicit state machine with defined transitions
- Conditional routing based on state
- Ability to pause/resume workflows

### 2. **Observability**
- Comprehensive state tracking
- Detailed logging at each step
- State persistence for debugging

### 3. **Error Handling**
- Retry logic with exponential backoff
- Circuit breaker pattern
- Graceful degradation

### 4. **Extensibility**
- Easy to add new nodes
- Modular architecture
- Clear separation of concerns

### 5. **Testability**
- Mock MCP client for testing
- State-based testing
- Isolated node functions

## Future Enhancements

- [x] Real VS Code MCP client integration (VSCodeMCPClient implemented)
- [ ] Parallel execution for independent steps
- [ ] Workflow visualization and monitoring dashboard
- [ ] Advanced validation rules and custom validators
- [ ] Integration with CI/CD pipelines
- [ ] Support for batch block generation
- [ ] Workflow templates for common patterns
- [ ] Performance metrics and analytics

## Troubleshooting

### Common Issues

**Issue**: `Cannot find module` or `command not found`
- **Cause**: Block Builder not built or running from wrong directory
- **Solution**: 
  ```bash
  # Build the project first
  cd block-builder
  npm install
  npm run build
  cd ..
  
  # Run from project root
  node block-builder/dist/cli.js generate --name "test" --url "..."
  ```

**Issue**: "Circuit breaker is open"
- **Cause**: Too many failed MCP server requests
- **Solution**: Wait 60 seconds for reset, or check MCP server configuration in VS Code settings

**Issue**: "No design context available"
- **Cause**: Invalid Figma node ID or missing access token
- **Solution**: 
  - Verify node ID format (e.g., "123:456" not "123-456")
  - Check Figma access token in MCP server config
  - Ensure node is accessible with your Figma account

**Issue**: "Validation failed"
- **Cause**: Generated files don't meet quality standards
- **Solution**: 
  - Review generated files manually in `/blocks/[block-name]/`
  - Use `--no-validate` to skip validation during iteration
  - Check error details in console output

**Issue**: "MCP server not responding"
- **Cause**: MCP servers not configured or not running
- **Solution**: 
  - Verify MCP server configuration in VS Code `settings.json`
  - Restart VS Code to initialize MCP servers
  - Check server paths and environment variables

### Debug Mode

Enable verbose logging with environment variables:

```bash
DEBUG=block-builder:* node block-builder/dist/cli.js generate \
  --name "debug-test" \
  --url "..."
```

### State Inspection

Load and inspect a saved state for debugging:

```typescript
import { StatePersistence, exportStateSummary } from './block-builder/dist/persistence.js';

const persistence = new StatePersistence();
const state = await persistence.loadState('service-cards-2025-12-03.json');
console.log(exportStateSummary(state));
```

### Checking MCP Server Status

Verify MCP servers are accessible:

```bash
# From VS Code, check Developer Tools Console for MCP server logs
# Look for initialization messages from:
# - figma-mcp
# - aem-eds-mcp
```

## License

MIT

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request
