# Agentic Figma → EDS Block Workflow Instructions

## Overview

This document describes how to use the new agentic workflow that automatically generates Adobe Edge Delivery Services (EDS) blocks from Figma designs. The workflow orchestrates multiple MCP tools to provide a seamless experience from Figma design to production-ready EDS block.

## Prerequisites

### Required MCP Servers
Ensure these MCP servers are configured in your VS Code settings:

1. **Figma MCP Tools** (`figma-mcp`)
   - Provides `get_design_context`, `get_screenshot`, `get_metadata`
   - Generates high-quality React + Tailwind code from Figma designs

2. **Figma-EDS MCP Server** (`aem-eds-mcp`)
   - Provides `analyzeBlockStructure`, `generateEdsBlock`
   - Transforms Figma designs into EDS blocks with Universal Editor support

### VS Code Configuration
Add this to your VS Code `settings.json`:
```json
{
  "mcp.servers": {
    "figma-eds": {
      "command": "node",
      "args": ["/Users/seanohern/adobe-code-kit/adobe-code-kit/figma-eds-mcp-server/dist/server.js"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "your-figma-personal-access-token"
      }
    }
  }
}
```

## How to Use the Agentic Workflow

### Step 1: Switch to Block Builder Chat Mode

1. **Open VS Code Chat Panel**
   - Use `Cmd+Shift+I` (macOS) or `Ctrl+Shift+I` (Windows/Linux)
   - Or go to View → Command Palette → "Chat: Focus on Chat View"

2. **Select Block Builder Mode**
   - Click the chat mode selector dropdown (usually shows "Agent" or current mode)
   - Select **"Block Builder"** from the available chat modes
   - You should see the 🏗️ Block Builder interface

### Step 2: Provide Your Input

The Block Builder agent accepts several types of input:

#### Option A: Figma URL
```
Create an EDS block from this Figma design: 
https://figma.com/design/ABC123DEF456/Homepage-Design?node-id=13157-13513
```

#### Option B: Node ID (if file key is known)
```
Generate an EDS block called "service-cards" from node 13157:13513 in file ABC123DEF456
```

#### Option C: Description-Based
```
Create a feature carousel block with 3 service cards showing Internet, TV, and Voice services, each with a CTA button
```

#### Option D: Existing Design Reference
```
Build an EDS block for the hero section on the homepage - node 13157:11781
```

### Step 3: Automatic Workflow Execution

Once you provide your input, the Block Builder agent will automatically execute the **6-step Figma MCP Integration Rules workflow**:

1. **Extract Design Context** 
   - Calls `mcp_my-mcp-server_get_design_context`
   - Gets React + Tailwind representation of the Figma design
   - Uses `forceCode: true` for complete code generation

2. **Get Visual Reference**
   - Calls `mcp_my-mcp-server_get_screenshot` 
   - Captures visual representation for validation

3. **Get Structure Overview** (if needed)
   - Calls `mcp_my-mcp-server_get_metadata`
   - Understands node hierarchy and structure

4. **Analyze for EDS**
   - Calls `mcp_figma-eds_analyzeBlockStructure`
   - Passes the `generatedCode` from step 1
   - Determines block type (single vs multi-item)
   - Analyzes content structure and design tokens

5. **Generate EDS Block**
   - Calls `mcp_figma-eds_generateEdsBlock`
   - Creates complete EDS block structure
   - Generates all required files

6. **Validate Output**
   - Ensures 1:1 visual parity with Figma design
   - Validates EDS compliance and accessibility

## What Gets Generated

The workflow creates a complete EDS block with:

### File Structure
```
/blocks/[block-name]/
├── README.md                    # Documentation and usage instructions
├── [block-name].css            # Styling using CSS variables
├── [block-name].js             # JavaScript with Universal Editor support
└──  _[block-name].json          # Universal Editor model definition
```

### Updated Section Model
- Automatically adds the new block to `/models/_section.json`
- Enables the block in Universal Editor component picker
- Supports both page-level and container-level insertion

### Features
- **Universal Editor Compatible**: Handles nested DOM structure
- **Design System Compliant**: Uses CSS variables exclusively
- **Accessible**: WCAG 2.1 AA compliant
- **Performant**: Optimized for Lighthouse scores ≥90
- **Production Ready**: Passes ESLint/Stylelint validation

## Example Workflow Output

```bash
🔧 Step 1: Getting design context from Figma...
✅ Generated 15,847 characters of React + Tailwind code

📷 Step 2: Capturing screenshot...
✅ Screenshot captured for visual validation

📊 Step 3: Analyzing design for EDS compatibility...
✅ Analysis complete:
   - Block type: multi-item (3 service cards detected)
   - Container fields: heading, description  
   - Item fields: cardHeading, cardBody, primaryCta, primaryCtaText
   - CTAs: "Learn More", "View Plans", "Get Started"

🏗️ Step 4: Generating EDS block files...
✅ Generated complete EDS block 'service-cards':
   - service-cards.css (using CSS variables)
   - service-cards.js (Universal Editor compatible)
   - _service-cards.json (UE model)
   - README.md, icon.svg, test files

🎯 Step 5: Validating output...
✅ All validations passed:
   - Visual accuracy: 98% match with Figma
   - Accessibility: WCAG 2.1 AA compliant
   - Performance: Lighthouse score 95+

✅ Block 'service-cards' ready for production use!
```

## Quality Standards

The agentic workflow ensures:

- **Visual Accuracy**: Within 2% of Figma design
- **Code Quality**: Zero ESLint/Stylelint errors
- **Design System Compliance**: CSS variables only, no hardcoded values
- **Universal Editor Support**: Full authoring and editing capabilities
- **Performance**: Lighthouse scores ≥90 across all metrics
- **Accessibility**: WCAG 2.1 AA compliance

## Troubleshooting

### Common Issues

**Issue**: "No generatedCode provided" warning
- **Solution**: Ensure Figma MCP tools are properly configured
- **Check**: VS Code MCP server settings and Figma access token

**Issue**: Block type detection incorrect
- **Solution**: Provide more specific input or use node ID directly
- **Check**: Figma design structure and component naming

**Issue**: CSS variables not applied
- **Solution**: Verify `/styles/root.css` contains required variables
- **Check**: Design system integration in generated CSS

### Getting Help

1. **Check Debug Information**: The workflow provides detailed debug output
2. **Validate Prerequisites**: Ensure all MCP servers are running
3. **Review Generated Files**: Check README.md for block-specific instructions
4. **Test in Universal Editor**: Verify block works in authoring environment

## Advanced Usage

### Custom Block Names
```
Generate a block called "hero-banner" from this Figma design: [URL]
```

### Specific Output Directory
```
Create an EDS block in ./custom-blocks/ from node 13157:13513
```

### With Custom Options
```
Build a carousel block with validation disabled and custom test files from [Figma URL]
```

---

## Quick Reference

**Switch to Block Builder** → **Provide Figma URL/Node ID** → **Automatic Generation** → **Production-Ready Block**

The agentic workflow eliminates the manual 2-hour block creation process, reducing it to a 3-minute automated pipeline while maintaining high quality and EDS compliance standards.