/**
 * HTML Simplifier - Preprocesses Figma React+Tailwind output into clean, semantic HTML
 * 
 * This preprocessor solves the problem of Figma's verbose output containing:
 * - Excessive Tailwind classes (className="absolute inset-[8.333%] bg-clip-padding...")
 * - Deep nesting for layout positioning (divs within divs for absolute positioning)
 * - Complex icon/vector structures
 * - Inline style objects with CSS variables
 * 
 * The simplified output makes regex pattern matching reliable for block analysis.
 */

export class HTMLSimplifier {
  /**
   * Main simplification method - converts Figma React+Tailwind to clean HTML
   */
  simplify(reactCode: string): string {
    let html = reactCode;

    // Step 1: Extract the JSX return statement (remove imports, function wrapper, etc.)
    html = this.extractJSX(html);

    // Step 2: Convert React attributes to HTML (className → class, etc.)
    html = this.convertReactToHTML(html);

    // Step 3: Remove all class attributes (Tailwind bloat)
    html = this.removeClassAttributes(html);

    // Step 4: Remove inline style attributes
    html = this.removeInlineStyles(html);

    // Step 5: Collapse layout-only wrapper divs (preserve data-name divs)
    html = this.collapseLayoutWrappers(html);

    // Step 6: Simplify icon/image structures
    html = this.simplifyImages(html);

    // Step 7: Clean up whitespace and formatting
    html = this.normalizeWhitespace(html);

    return html;
  }

  /**
   * Extract just the JSX from React component code
   */
  private extractJSX(code: string): string {
    // Find the return statement
    const returnMatch = code.match(/return\s*\(([\s\S]*)\);?\s*\}/);
    if (returnMatch) {
      return returnMatch[1].trim();
    }

    // Fallback: try to find JSX starting with opening tag
    const jsxMatch = code.match(/<div[\s\S]*<\/div>/);
    if (jsxMatch) {
      return jsxMatch[0];
    }

    return code;
  }

  /**
   * Convert React JSX attributes to standard HTML
   */
  private convertReactToHTML(html: string): string {
    // Replace className with class
    html = html.replace(/className=/g, 'class=');

    // Remove React template literals in text content: {`text`} → text
    html = html.replace(/\{\`([^`]+)\`\}/g, '$1');

    // Replace image src variables with the actual URLs
    // Pattern: src={imgVector} → src="..."
    html = html.replace(/src=\{img[^}]+\}/g, 'src=""');

    return html;
  }

  /**
   * Remove all class attributes (Tailwind bloat)
   */
  private removeClassAttributes(html: string): string {
    // Remove class="..." attributes entirely
    // Use a regex that handles multi-line class values and escaped characters
    return html.replace(/\s+class="[^"]*"/g, '');
  }

  /**
   * Remove inline style attributes
   */
  private removeInlineStyles(html: string): string {
    // Remove style={{...}} React objects
    html = html.replace(/\s+style=\{[^}]+\}/g, '');
    
    // Remove style="..." HTML attributes
    html = html.replace(/\s+style="[^"]*"/g, '');

    return html;
  }

  /**
   * Collapse layout-only wrapper divs
   * 
   * Figma generates many wrapper divs purely for positioning that have no semantic meaning.
   * We keep divs with data-name attributes (semantic) and remove pure layout wrappers.
   */
  private collapseLayoutWrappers(html: string): string {
    // Pattern: <div><div data-name="Something">content</div></div>
    // Result: <div data-name="Something">content</div>
    
    // Remove wrappers around data-name divs (iteratively, up to 5 levels deep)
    for (let i = 0; i < 5; i++) {
      // Match: <div (no data-name)> <div data-name="X">content</div> </div>
      html = html.replace(
        /<div(?![^>]*data-name)([^>]*)>\s*(<div[^>]*data-name=[^>]*>[\s\S]*?<\/div>)\s*<\/div>/g,
        '$2'
      );
    }

    // Remove empty wrapper divs between semantic elements
    for (let i = 0; i < 3; i++) {
      html = html.replace(
        /<div(?![^>]*data-name)([^>]*)>\s*(<(?:p|img|div\s+data-name)[^>]*>[\s\S]*?<\/(?:p|div)>)\s*<\/div>/g,
        '$2'
      );
    }

    return html;
  }

  /**
   * Simplify icon and image structures
   * 
   * Figma generates deeply nested structures for icons with multiple Vector layers.
   * Simplify to just the outermost image tag with data-name.
   */
  private simplifyImages(html: string): string {
    // Pattern: <div data-name="Icon"><div><div><img.../></div></div></div>
    // Result: <div data-name="Icon"><img.../></div>
    
    // Find Icon containers and extract just the first img tag
    html = html.replace(
      /<div([^>]*data-name="Icon"[^>]*)>([\s\S]*?)<\/div>/g,
      (match, attrs, content) => {
        // Extract the first img tag from nested content
        const imgMatch = content.match(/<img[^>]*>/);
        if (imgMatch) {
          return `<div${attrs}>${imgMatch[0]}</div>`;
        }
        return match;
      }
    );

    // Similar pattern for Image containers
    html = html.replace(
      /<div([^>]*data-name="Image"[^>]*)>([\s\S]*?)<\/div>/g,
      (match, attrs, content) => {
        const imgMatch = content.match(/<img[^>]*>/);
        if (imgMatch) {
          return `<div${attrs}>${imgMatch[0]}</div>`;
        }
        return match;
      }
    );

    // Remove Vector wrapper divs (keep only the semantic Icon/Image containers)
    html = html.replace(
      /<div[^>]*data-name="Vector"[^>]*>([\s\S]*?)<\/div>/g,
      '$1'
    );

    return html;
  }

  /**
   * Normalize whitespace and formatting
   */
  private normalizeWhitespace(html: string): string {
    // Replace multiple spaces with single space
    html = html.replace(/\s{2,}/g, ' ');

    // Remove spaces around tags
    html = html.replace(/>\s+</g, '><');

    // Remove leading/trailing whitespace
    html = html.trim();

    // Add newlines after closing div tags for readability
    html = html.replace(/<\/div>/g, '</div>\n');

    // Clean up multiple newlines
    html = html.replace(/\n{3,}/g, '\n\n');

    return html;
  }

  /**
   * Debug method - show before/after comparison
   */
  debugComparison(reactCode: string): { original: string; simplified: string; stats: { originalSize: number; simplifiedSize: number; reductionPercent: number } } {
    const simplified = this.simplify(reactCode);
    
    return {
      original: reactCode,
      simplified,
      stats: {
        originalSize: reactCode.length,
        simplifiedSize: simplified.length,
        reductionPercent: Math.round((1 - simplified.length / reactCode.length) * 100)
      }
    };
  }
}
