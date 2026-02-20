1. Read prompts/figma-to-eds-xwalk-block.md and the design system documentation in prompts/ey-theme.

2. Run #get_code and #get_screenshot from https://www.figma.com/design/a22zeHataamSBeRrqPvwvt/AEM-Landing-w--Kit?node-id=10474-45482&m=dev to see what we are going to build.

3. **Analyze the Figma design to identify:**
   - 2-column card layout with image, heading, and body text
   - 1200px max container width with 120px margins
   - 24px gap between cards, 282px minimum card width
   - Typography: 18px Roboto Condensed semibold headings, 14px Roboto regular body
   - 4:3 aspect ratio images with white border overlay

4. **Create a multi-item block named tab-cards with:**
   - Container definition for any main heading/configuration
   - Item definition (tab-card) for individual cards
   - Filter pattern enabling add/remove in Universal Editor
   - Two model definitions following the xwalk documentation

5. **Implementation Requirements:**
   - Use CSS Grid for responsive 2-column → 1-column layout
   - Apply design system variables (--grid-max-width, --grid-margin, --grid-gutter)
   - Handle 4:3 aspect ratio images with proper styling
   - Include placeholder styling for empty Universal Editor items
   - Implement moveInstrumentation for editing capabilities

6. **Create both test files:**
   - Simple structure and Universal Editor realstructure versions
   - Test with 2 cards matching the Figma design
   - Include empty card testing for Universal Editor workflow

## Next Step
After completion, run: `prompts/validation/block-model-validation.md` to validate and fix model structure.