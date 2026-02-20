export class DesignSystemValidator {
  
  private readonly ALLOWED_CSS_VARIABLES = [
    // Colors
    '--text-primary',
    '--text-secondary',
    '--text-accent',
    '--background-primary',
    '--background-secondary',
    '--background-accent',
    '--border-primary',
    '--border-secondary',
    '--link-color',
    '--link-hover-color',
    
    // Typography
    '--font-family-heading',
    '--font-family-body',
    '--font-weight-light',
    '--font-weight-normal',
    '--font-weight-medium',
    '--font-weight-bold',
    '--heading-font-size-xs',
    '--heading-font-size-s',
    '--heading-font-size-m',
    '--heading-font-size-l',
    '--heading-font-size-xl',
    '--heading-font-size-xxl',
    '--body-font-size-xs',
    '--body-font-size-s',
    '--body-font-size-m',
    '--body-font-size-l',
    '--body-font-size-xl',
    '--line-height-heading',
    '--line-height-body',
    
    // Spacing
    '--spacing-xs',
    '--spacing-s',
    '--spacing-m',
    '--spacing-l',
    '--spacing-xl',
    '--spacing-xxl',
    
    // Grid
    '--grid-container-width',
    '--grid-gutter-width',
    '--grid-column-count',
    '--grid-breakpoint-xs',
    '--grid-breakpoint-s',
    '--grid-breakpoint-m',
    '--grid-breakpoint-l',
    '--grid-breakpoint-xl',
    
    // Components
    '--button-padding-xs',
    '--button-padding-s',
    '--button-padding-m',
    '--button-padding-l',
    '--button-border-radius',
    '--card-padding',
    '--card-border-radius',
    '--card-shadow',
    
    // Animation
    '--transition-duration-fast',
    '--transition-duration-normal',
    '--transition-duration-slow',
    '--transition-easing'
  ];

  private readonly FORBIDDEN_HARDCODED_VALUES = [
    // Colors (hex, rgb, rgba, hsl, hsla)
    /#[0-9a-fA-F]{3,8}/,
    /rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)/,
    /rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)/,
    /hsl\(\s*\d+\s*,\s*\d+%?\s*,\s*\d+%?\s*\)/,
    /hsla\(\s*\d+\s*,\s*\d+%?\s*,\s*\d+%?\s*,\s*[\d.]+\s*\)/,
    
    // Named colors (common ones that should use variables)
    /\b(black|white|red|green|blue|yellow|orange|purple|pink|gray|grey)\b/i,
    
    // Font sizes (px, em, rem values)
    /font-size\s*:\s*\d+(\.\d+)?(px|em|rem)/,
    
    // Spacing values (margins, padding)
    /margin\s*:\s*\d+(\.\d+)?(px|em|rem)/,
    /padding\s*:\s*\d+(\.\d+)?(px|em|rem)/,
    
    // Common pixel values that should be variables
    /\b\d+px\b/
  ];

  private readonly REQUIRED_RESPONSIVE_BREAKPOINTS = [
    '@media (max-width: 767px)', // Mobile
    '@media (min-width: 768px) and (max-width: 1199px)', // Tablet  
    '@media (min-width: 1200px)' // Desktop
  ];

  /**
   * Validate CSS code for design system compliance
   */
  validateCSS(cssContent: string): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for hardcoded values
    this.checkHardcodedValues(cssContent, errors);

    // Check for CSS variable usage
    this.checkCSSVariableUsage(cssContent, warnings);

    // Check for responsive design patterns
    this.checkResponsiveDesign(cssContent, warnings);

    // Check for accessibility patterns
    this.checkAccessibilityPatterns(cssContent, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get recommended CSS variables for a given context
   */
  getRecommendedVariables(context: 'typography' | 'colors' | 'spacing' | 'grid' | 'components'): string[] {
    const variables: { [key: string]: string[] } = {
      typography: this.ALLOWED_CSS_VARIABLES.filter(v => 
        v.includes('font') || v.includes('heading') || v.includes('body') || v.includes('line-height')
      ),
      colors: this.ALLOWED_CSS_VARIABLES.filter(v => 
        v.includes('text') || v.includes('background') || v.includes('border') || v.includes('link')
      ),
      spacing: this.ALLOWED_CSS_VARIABLES.filter(v => v.includes('spacing')),
      grid: this.ALLOWED_CSS_VARIABLES.filter(v => v.includes('grid')),
      components: this.ALLOWED_CSS_VARIABLES.filter(v => v.includes('button') || v.includes('card'))
    };

    return variables[context] || [];
  }

  /**
   * Convert hardcoded values to design system variables
   */
  convertToDesignSystem(cssContent: string): string {
    let convertedCSS = cssContent;

    // Common hardcoded to variable conversions
    const conversions: Array<{pattern: RegExp, replacement: string, context?: string}> = [
      // Colors
      { pattern: /#0d0d0c/g, replacement: 'var(--text-primary)' },
      { pattern: /#6e6e6e/g, replacement: 'var(--text-secondary)' },
      { pattern: /#ffffff/g, replacement: 'var(--background-primary)' },
      { pattern: /#f5f5f5/g, replacement: 'var(--background-secondary)' },
      { pattern: /\bblack\b/g, replacement: 'var(--text-primary)' },
      { pattern: /\bwhite\b/g, replacement: 'var(--background-primary)' },
      
      // Typography sizes (prefer typography context)
      { pattern: /(?<=font-size\s*:\s*)60px/g, replacement: 'var(--heading-font-size-xxl)', context: 'typography' },
      { pattern: /(?<=font-size\s*:\s*)48px/g, replacement: 'var(--heading-font-size-xl)', context: 'typography' },
      { pattern: /(?<=font-size\s*:\s*)36px/g, replacement: 'var(--heading-font-size-l)', context: 'typography' },
      { pattern: /(?<=font-size\s*:\s*)24px/g, replacement: 'var(--heading-font-size-m)', context: 'typography' },
      { pattern: /(?<=font-size\s*:\s*)20px/g, replacement: 'var(--heading-font-size-s)', context: 'typography' },
      { pattern: /(?<=font-size\s*:\s*)18px/g, replacement: 'var(--body-font-size-l)', context: 'typography' },
      { pattern: /(?<=font-size\s*:\s*)16px/g, replacement: 'var(--body-font-size-m)', context: 'typography' },
      { pattern: /(?<=font-size\s*:\s*)14px/g, replacement: 'var(--body-font-size-s)', context: 'typography' },
      { pattern: /(?<=font-size\s*:\s*)12px/g, replacement: 'var(--body-font-size-xs)', context: 'typography' },
      
      // Spacing context (margins, padding, gaps)
      { pattern: /(?<=(margin|padding|gap)\s*:\s*)64px/g, replacement: 'var(--spacing-xxl)', context: 'spacing' },
      { pattern: /(?<=(margin|padding|gap)\s*:\s*)48px/g, replacement: 'var(--spacing-xl)', context: 'spacing' },
      { pattern: /(?<=(margin|padding|gap)\s*:\s*)32px/g, replacement: 'var(--spacing-l)', context: 'spacing' },
      { pattern: /(?<=(margin|padding|gap)\s*:\s*)24px/g, replacement: 'var(--spacing-m)', context: 'spacing' },
      { pattern: /(?<=(margin|padding|gap)\s*:\s*)16px/g, replacement: 'var(--spacing-s)', context: 'spacing' },
      { pattern: /(?<=(margin|padding|gap)\s*:\s*)8px/g, replacement: 'var(--spacing-xs)', context: 'spacing' },
    ];

    // Apply conversions
    conversions.forEach(({ pattern, replacement }) => {
      convertedCSS = convertedCSS.replace(pattern, replacement);
    });

    return convertedCSS;
  }

  private checkHardcodedValues(cssContent: string, errors: string[]): void {
    this.FORBIDDEN_HARDCODED_VALUES.forEach(pattern => {
      const matches = cssContent.match(pattern);
      if (matches) {
        matches.forEach(match => {
          errors.push(`Hardcoded value "${match}" detected. Use design system variables instead.`);
        });
      }
    });

    // Check for specific hardcoded values that are commonly problematic
    const problematicValues = [
      { value: '#0d0d0c', replacement: 'var(--text-primary)' },
      { value: '#ffffff', replacement: 'var(--background-primary)' },
      { value: '16px', replacement: 'var(--body-font-size-m) or var(--spacing-s)' },
      { value: '24px', replacement: 'var(--heading-font-size-s) or var(--spacing-m)' },
    ];

    problematicValues.forEach(({ value, replacement }) => {
      if (cssContent.includes(value)) {
        errors.push(`Replace hardcoded "${value}" with ${replacement}`);
      }
    });
  }

  private checkCSSVariableUsage(cssContent: string, warnings: string[]): void {
    // Check if CSS variables are being used at all
    const hasVariables = /var\(--[^)]+\)/.test(cssContent);
    if (!hasVariables) {
      warnings.push('No CSS variables detected. Consider using design system variables for consistency.');
    }

    // Check for unknown CSS variables
    const variableMatches = cssContent.match(/var\(--([^)]+)\)/g);
    if (variableMatches) {
      variableMatches.forEach(match => {
        const variableName = match.match(/var\((--[^)]+)\)/)?.[1];
        if (variableName && !this.ALLOWED_CSS_VARIABLES.includes(variableName)) {
          warnings.push(`Unknown CSS variable "${variableName}". Verify it exists in the design system.`);
        }
      });
    }
  }

  private checkResponsiveDesign(cssContent: string, warnings: string[]): void {
    // Check for responsive patterns
    const hasMediaQueries = /@media/.test(cssContent);
    if (!hasMediaQueries) {
      warnings.push('No responsive design detected. Consider adding mobile-first responsive patterns.');
    }

    // Check for mobile-first approach
    const mobileFirstPattern = /@media\s*\(\s*min-width/;
    const maxWidthPattern = /@media\s*\(\s*max-width/;
    
    if (maxWidthPattern.test(cssContent) && !mobileFirstPattern.test(cssContent)) {
      warnings.push('Consider using mobile-first responsive design with min-width media queries.');
    }
  }

  private checkAccessibilityPatterns(cssContent: string, warnings: string[]): void {
    // Check for focus states
    if (!/:focus/.test(cssContent) && cssContent.includes('button')) {
      warnings.push('Missing focus states for interactive elements. Add :focus styles for accessibility.');
    }

    // Check for proper contrast patterns
    if (cssContent.includes('color:') && !cssContent.includes('background')) {
      warnings.push('Text color changes should be accompanied by background considerations for contrast.');
    }

    // Check for reduced motion considerations
    if (cssContent.includes('animation') || cssContent.includes('transition')) {
      if (!cssContent.includes('@media (prefers-reduced-motion')) {
        warnings.push('Consider adding prefers-reduced-motion media query for animations/transitions.');
      }
    }
  }
}