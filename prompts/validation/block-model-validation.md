# Block Model Validation

**Prerequisites**: Any EDS block must be completed with its `_<block-name>.json` model file created

## Objective
Review and fix the `_<block-name>.json` model for proper structure and field naming compliance to avoid common AI-generated model errors.

## Critical Validation Checks

### 1. **Field Name Restrictions - FORBIDDEN FIELD PATTERNS**

**🚫 COMPLETELY RESTRICTED Field Names - NEVER use these:**
- Any field name containing **`Title`** (e.g., `cardTitle`, `heroTitle`, `mainTitle`) 
- Any field name containing **`Type`** unless it's a link type field with corresponding base field
- Any field name containing **`Text`** unless it's a link text field with corresponding base field

**✅ CORRECT ALTERNATIVES:**
- Instead of `cardTitle` → use `cardHeading`
- Instead of `heroTitle` → use `heroHeading` 
- Instead of `mainTitle` → use `mainHeading`
- Instead of `bodyText` → use `bodyContent` or `body`
- Instead of `buttonText` → use `buttonLabel` or `ctaText` (with `cta` base field)

### 2. **Special Characters in Field Values**

**🚫 FORBIDDEN CHARACTERS in field properties:**
- Forward slashes `/` in any field property (name, label, description)
- Backslashes `\` in field properties
- Special characters that break JSON or JavaScript parsing
- Spaces or hyphens in field names

**✅ CLEAN UP EXAMPLES:**
```json
// WRONG
{ "name": "card/heading", "label": "Card Title/Heading" }
{ "name": "card-title", "label": "Card Title" }
{ "name": "card heading", "label": "Card Title" }

// CORRECT  
{ "name": "cardHeading", "label": "Card Heading" }
```

### 3. **Link Field Suffix Validation**

**✅ VALID SUFFIX PATTERNS (only with base fields):**
```json
// Correct - has base field + suffix
{ "name": "cta", "label": "CTA URL" },
{ "name": "ctaText", "label": "CTA Button Text" },
{ "name": "ctaType", "label": "CTA Style" }

// Correct - has base field + suffix  
{ "name": "primaryLink", "label": "Primary Link URL" },
{ "name": "primaryLinkText", "label": "Primary Link Text" }
```

**❌ INVALID SUFFIX PATTERNS:**
```json
// Wrong - Text suffix without base field
{ "name": "buttonText", "label": "Button Text" } 

// Wrong - Type suffix without base field
{ "name": "cardType", "label": "Card Type" }

// Wrong - Alt suffix without base field
{ "name": "imageAlt", "label": "Image Alt" }
```

### 4. **Image Alt Text Field Validation**

**✅ CORRECT Image + Alt Patterns:**
```json
// Base image field + corresponding alt field
{ "name": "heroImage", "label": "Hero Image" },
{ "name": "heroImageAlt", "label": "Hero Image Alt Text" },

// Base icon field + corresponding alt field  
{ "name": "icon", "label": "Icon" },
{ "name": "iconAlt", "label": "Icon Alt Text" }
```

**❌ INVALID Alt Patterns:**
```json
// Wrong - Alt field without corresponding image field
{ "name": "imageAlt", "label": "Image Alt Text" } // No "image" base field
```

## Validation Process

### Step 1: Locate and Check the Generated Model
1. Open `/blocks/<block-name>/_<block-name>.json`
2. Review all field names in both container and item models (if multi-item block)
3. Check for restricted patterns and special characters

### Step 2: Fix Field Name Violations

**Common Violations and Fixes:**
```json
// BEFORE (violations)
{
  "fields": [
    { "name": "title", "label": "Main Title" },           // ❌ "title" completely forbidden
    { "name": "cardTitle", "label": "Card Title" },       // ❌ Contains "Title"
    { "name": "card/heading", "label": "Card/Heading" },  // ❌ Contains "/"
    { "name": "buttonText", "label": "Button Text" },     // ❌ Text without base
    { "name": "imageAlt", "label": "Alt Text" },          // ❌ Alt without base image
    { "name": "linkType", "label": "Link Style" }         // ❌ Type without base link
  ]
}

// AFTER (corrected)  
{
  "fields": [
    { "name": "heading", "label": "Main Heading" },       // ✅ Safe field name
    { "name": "cardHeading", "label": "Card Heading" },   // ✅ Safe field name
    { "name": "cardHeading", "label": "Card Heading" },   // ✅ No special chars
    { "name": "cta", "label": "CTA URL" },                // ✅ Base field
    { "name": "ctaText", "label": "CTA Text" },           // ✅ Valid with base
    { "name": "cardImage", "label": "Card Image" },       // ✅ Base image field
    { "name": "cardImageAlt", "label": "Card Image Alt" }, // ✅ Valid with base
    { "name": "cta", "label": "CTA URL" },                // ✅ Base link field  
    { "name": "ctaType", "label": "CTA Style" }           // ✅ Valid with base
  ]
}
```

### Step 3: Validate Complete Field Structure
Ensure each field has proper structure with all required properties:

```json
{
  "component": "text",
  "valueType": "string", 
  "name": "fieldName",
  "label": "Field Label",
  "description": "Clear description of the field purpose",
  "required": true
}
```

### Step 4: Verify Block Type and Model Structure

#### For Single Blocks (hero, banner, etc.):
```json
{
  "definitions": [
    {
      "title": "Block Name",
      "id": "block-name",
      "plugins": {
        "xwalk": {
          "page": {
            "resourceType": "core/franklin/components/block/v1/block",
            "template": {
              "name": "Block Name",
              "model": "block-name"
            }
          }
        }
      }
    }
  ],
  "models": [
    {
      "id": "block-name",
      "fields": [
        // Your validated fields here
      ]
    }
  ]
}
```

#### For Multi-Item Blocks (cards, accordions, etc.):
```json
{
  "definitions": [
    {
      "title": "Block Container",
      "id": "block-name",
      "plugins": {
        "xwalk": {
          "page": {
            "resourceType": "core/franklin/components/block/v1/block",
            "template": {
              "name": "Block Container",
              "filter": "block-name"
            }
          }
        }
      }
    },
    {
      "title": "Block Item",
      "id": "block-item",
      "plugins": {
        "xwalk": {
          "page": {
            "resourceType": "core/franklin/components/block/v1/block/item",
            "template": {
              "name": "Block Item",
              "model": "block-item"
            }
          }
        }
      }
    }
  ],
  "models": [
    {
      "id": "block-item",
      "fields": [
        // Your validated item fields here
      ]
    }
  ],
  "filters": [
    {
      "id": "block-name",
      "components": ["block-item"]
    }
  ]
}
```

### Step 5: Test Model Integration
1. Check that model validates without errors using `npm run lint`
2. Verify Universal Editor can load the component
3. Test that field names match JavaScript extraction logic in the block
4. Ensure no console errors when editing in Universal Editor

## Common Field Naming Patterns

### ✅ Safe Standalone Field Names:
- `heading`, `subheading`, `body`, `content`, `description`
- `cardHeading`, `cardBody`, `cardContent`
- `heroHeading`, `heroContent`, `heroDescription`
- `buttonLabel`, `ctaLabel` (avoid `buttonText`)

### ✅ Safe Link Field Patterns:
```json
// Base link + related fields
{ "name": "cta", "label": "CTA URL" },
{ "name": "ctaText", "label": "CTA Button Text" },
{ "name": "ctaType", "label": "CTA Button Style" }

// Multiple links
{ "name": "primaryLink", "label": "Primary Link URL" },
{ "name": "primaryLinkText", "label": "Primary Link Text" },
{ "name": "secondaryLink", "label": "Secondary Link URL" },
{ "name": "secondaryLinkText", "label": "Secondary Link Text" }
```

### ✅ Safe Image Field Patterns:
```json
// Base image + alt text
{ "name": "heroImage", "label": "Hero Image" },
{ "name": "heroImageAlt", "label": "Hero Image Alt Text" },

// Multiple images
{ "name": "cardImage", "label": "Card Image" },
{ "name": "cardImageAlt", "label": "Card Image Alt Text" },
{ "name": "backgroundImage", "label": "Background Image" },
{ "name": "backgroundImageAlt", "label": "Background Image Alt Text" }
```

## Universal Completion Checklist

- [ ] **No forbidden field names**: No "Title", "Type", or "Text" unless valid link/image patterns
- [ ] **No special characters**: No `/`, `\`, spaces, or hyphens in field properties  
- [ ] **Suffix field validation**: All suffix fields have corresponding base fields
- [ ] **Model structure**: Correct single vs multi-item block pattern
- [ ] **Field properties**: All fields have component, valueType, name, label, description
- [ ] **JavaScript compatibility**: Field names match variables used in block decoration
- [ ] **Linting passes**: `npm run lint` completes without model errors
- [ ] **Universal Editor loads**: Block appears in component picker without errors

## Output Confirmation
After validation and fixes, confirm:
1. **✅ Model file is clean and compliant**
2. **✅ No forbidden field naming patterns** 
3. **✅ No special characters in field properties**
4. **✅ Proper block architecture (single vs multi-item)**
5. **✅ All suffix fields have corresponding base fields**
6. **✅ Block integration works correctly in Universal Editor**

This validation ensures any EDS block follows proper Universal Editor conventions and avoids the most common model definition errors that break authoring functionality.

## Next Step
After completion, run: `prompts/validation/block-processing-logic-validation.md` to validate and fix js processing logic.