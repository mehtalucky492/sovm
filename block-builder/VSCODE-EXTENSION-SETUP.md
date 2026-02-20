# Block Builder Workflow - VS Code Extension Setup

## Overview

The Block Builder workflow is now available as a VS Code language model tool (`block-builder_generate`) that can be called directly from chat modes and other VS Code extensions.

## Installation Steps

### Option 1: Install as VS Code Extension (Recommended)

1. **Copy extension files to VS Code extensions directory:**

```bash
# From the adobe-code-kit root directory
mkdir -p ~/.vscode/extensions/block-builder-workflow-1.0.0
cp -r block-builder/dist ~/.vscode/extensions/block-builder-workflow-1.0.0/
cp block-builder/extension.package.json ~/.vscode/extensions/block-builder-workflow-1.0.0/package.json
```

2. **Reload VS Code:**
   - Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
   - Type "Reload Window"
   - Press Enter

3. **Verify installation:**
   - Open any file in VS Code
   - Check that the tool is registered in the VS Code language model tools

### Option 2: Symlink for Development

For development, create a symlink so changes are reflected immediately:

```bash
# From the adobe-code-kit root directory
ln -s "$(pwd)/block-builder" ~/.vscode/extensions/block-builder-workflow-dev

# Copy the extension package.json
cp block-builder/extension.package.json ~/.vscode/extensions/block-builder-workflow-dev/package.json
```

Then reload VS Code.

### Option 3: Package as VSIX

For distribution, package as a VSIX file:

```bash
cd block-builder

# Install vsce if not already installed
npm install -g @vscode/vsce

# Create extension package.json from extension.package.json
cp extension.package.json package.json.bak
mv extension.package.json package.json

# Package the extension
vsce package

# Restore original package.json
mv package.json.bak package.json

# Install the VSIX
code --install-extension block-builder-workflow-1.0.0.vsix
```

## Verify Installation

Open VS Code and check that the tool is registered:

1. Open Developer Console: `Help` → `Toggle Developer Tools`
2. In the console, run:
```javascript
vscode.lm.tools.find(t => t.name === 'block-builder_generate')
```

You should see the tool definition with its schema.

## Usage from Chat Mode

Once installed, the Block Builder chat mode can call the workflow:

```
User: "Generate a feature-cards block from this Figma URL: https://figma.com/design/abc?node-id=13157-13513"

AI calls: block-builder_generate({
  blockName: "feature-cards",
  figmaUrl: "https://figma.com/design/abc?node-id=13157-13513"
})

Result: Complete workflow execution with formatted output
```

## Tool Parameters

### Required
- `blockName`: String - Block name in lowercase-hyphenated format

### Optional (one required)
- `figmaUrl`: String - Complete Figma URL with node-id parameter
- `figmaNodeId`: String - Figma node ID in format "13157:13513"

### Optional Configuration
- `outputPath`: String - Output directory (default: "./blocks")
- `skipScreenshot`: Boolean - Skip screenshot capture (default: false)
- `updateSectionModel`: Boolean - Add to section model (default: true)
- `validateOutput`: Boolean - Run validation (default: true)
- `strictValidation`: Boolean - Enable strict mode (default: false)
- `persistContext`: Boolean - Save intermediate files (default: true)

## Tool Output

The tool returns formatted markdown with:
- ✅ Success status and block location
- 📦 Generated files (CSS, JS, JSON)
- ✅ Validation results (errors, warnings, status)
- ⏱️ Duration
- ❌ Error details (if failed)

## Troubleshooting

### Tool not found

**Symptom**: Chat mode can't find `block-builder_generate`

**Solution**:
1. Check extension is installed: `ls ~/.vscode/extensions/block-builder-workflow-*`
2. Reload VS Code window
3. Check Developer Console for extension activation errors

### MCP servers not available

**Symptom**: "Figma MCP server not available" error

**Solution**: Ensure `.vscode/mcp.json` is configured with both servers:
```json
{
  "servers": {
    "figma-mcp": {
      "url": "http://127.0.0.1:3845/mcp",
      "type": "http"
    },
    "aem-eds-mcp": {
      "command": "/path/to/node",
      "args": ["/path/to/figma-eds-mcp-server/dist/server.js"]
    }
  }
}
```

### Workflow fails at specific step

**Symptom**: Error at "EXTRACTING_DESIGN" or other step

**Solution**:
1. Check MCP server logs
2. Verify Figma URL has valid node-id parameter
3. Try with `skipScreenshot: true` to isolate issue
4. Check that node executable path is correct (use absolute path)

## Development

To modify the workflow:

1. Edit files in `block-builder/src/`
2. Build: `npm run build`
3. If using symlink setup, reload VS Code
4. If using copied extension, re-copy dist files
5. Test in chat mode

## Uninstallation

Remove the extension directory:

```bash
rm -rf ~/.vscode/extensions/block-builder-workflow-*
```

Then reload VS Code.
