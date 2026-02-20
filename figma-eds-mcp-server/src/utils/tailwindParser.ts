/**
 * Utility to extract design measurements from Tailwind classes in generated code
 */

export interface ExtractedMeasurements {
  heights: Map<string, number>;
  widths: Map<string, number>;
  padding: Map<string, number>;
  margin: Map<string, number>;
  gaps: Map<string, number>;
  borderRadius: Map<string, number>;
  fontSize: Map<string, number>;
  lineHeight: Map<string, number>;
  letterSpacing: Map<string, number>;
  colors: Map<string, number>;
}

export class TailwindParser {
  /**
   * Extract all measurements from Tailwind classes in the generated code
   * Maps now store value → count for proper frequency tracking
   */
  static extractMeasurements(generatedCode: string): ExtractedMeasurements {
    const measurements: ExtractedMeasurements = {
      heights: new Map(),
      widths: new Map(),
      padding: new Map(),
      margin: new Map(),
      gaps: new Map(),
      borderRadius: new Map(),
      fontSize: new Map(),
      lineHeight: new Map(),
      letterSpacing: new Map(),
      colors: new Map(),
    };

    // Extract heights: h-[680px], h-[278px], etc.
    const heightRegex = /h-\[([^\]]+)\]/g;
    let match;
    while ((match = heightRegex.exec(generatedCode)) !== null) {
      const value = match[1];
      measurements.heights.set(value, (measurements.heights.get(value) || 0) + 1 as any);
    }

    // Extract widths: w-[400px], w-full, etc.
    const widthRegex = /w-\[([^\]]+)\]/g;
    while ((match = widthRegex.exec(generatedCode)) !== null) {
      const value = match[1];
      measurements.widths.set(value, (measurements.widths.get(value) || 0) + 1 as any);
    }

    // Extract padding: px-[32px], py-[40px], p-[10px], pt-[20px], pb-[36px], pl-[x], pr-[x]
    const paddingRegex = /p([xytblr]?)-\[([^\]]+)\]/g;
    while ((match = paddingRegex.exec(generatedCode)) !== null) {
      const value = match[2];
      measurements.padding.set(value, (measurements.padding.get(value) || 0) + 1 as any);
    }

    // Extract margin: mx-[x], my-[x], m-[x], mt-[x], mb-[x], ml-[x], mr-[x]
    const marginRegex = /m([xytblr]?)-\[([^\]]+)\]/g;
    while ((match = marginRegex.exec(generatedCode)) !== null) {
      const value = match[2];
      measurements.margin.set(value, (measurements.margin.get(value) || 0) + 1 as any);
    }

    // Extract gaps: gap-[24px], gap-[16px], etc.
    const gapRegex = /gap-\[([^\]]+)\]/g;
    while ((match = gapRegex.exec(generatedCode)) !== null) {
      const value = match[1];
      measurements.gaps.set(value, (measurements.gaps.get(value) || 0) + 1 as any);
    }

    // Extract border radius: rounded-[3px], rounded-[14px], etc.
    const radiusRegex = /rounded-\[([^\]]+)\]/g;
    while ((match = radiusRegex.exec(generatedCode)) !== null) {
      const value = match[1];
      measurements.borderRadius.set(value, (measurements.borderRadius.get(value) || 0) + 1 as any);
    }

    // Extract font sizes: text-[length:var(--typography\/font-size\/headings\/heading-m,22px)]
    const fontSizeRegex = /text-\[length:var\([^,]+,([^\]]+)\)\]/g;
    while ((match = fontSizeRegex.exec(generatedCode)) !== null) {
      const value = match[1];
      measurements.fontSize.set(value, (measurements.fontSize.get(value) || 0) + 1 as any);
    }

    // Extract line heights: leading-[var(--typography\/height\/line-headings\/m,27.5px)]
    const lineHeightRegex = /leading-\[var\([^,]+,([^\]]+)\)\]/g;
    while ((match = lineHeightRegex.exec(generatedCode)) !== null) {
      const value = match[1];
      measurements.lineHeight.set(value, (measurements.lineHeight.get(value) || 0) + 1 as any);
    }

    // Extract letter spacing: tracking-[2.2px], tracking-[3.6px], etc.
    const letterSpacingRegex = /tracking-\[([^\]]+)\]/g;
    while ((match = letterSpacingRegex.exec(generatedCode)) !== null) {
      const value = match[1];
      measurements.letterSpacing.set(value, (measurements.letterSpacing.get(value) || 0) + 1 as any);
    }

    // Extract colors: text-[color:var(--text\/primary,#131313)]
    const colorRegex = /(?:text|bg|border)-\[color:var\([^,]+,(#[0-9a-fA-F]{3,8})\)\]/g;
    while ((match = colorRegex.exec(generatedCode)) !== null) {
      const value = match[1];
      measurements.colors.set(value, (measurements.colors.get(value) || 0) + 1 as any);
    }

    return measurements;
  }

  /**
   * Get the most common value from a map (useful for card heights, etc.)
   * Map is already value → count, so just find the highest count
   */
  static getMostCommon(map: Map<string, number>): string | null {
    if (map.size === 0) return null;

    let maxCount = 0;
    let mostCommon: string | null = null;
    for (const [value, count] of map.entries()) {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = value;
      }
    }

    return mostCommon;
  }

  /**
   * Get all unique values from a map, sorted by frequency
   * Map is already value → count, so just sort by count
   */
  static getValuesByFrequency(map: Map<string, number>): string[] {
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([value]) => value);
  }

  /**
   * Extract specific measurement context (e.g., card height vs image height)
   */
  static extractContextualMeasurements(generatedCode: string): {
    cardHeight?: string;
    imageHeight?: string;
    cardPadding?: string;
    imagePadding?: string;
    cardGap?: string;
    borderRadius?: string;
  } {
    const measurements = this.extractMeasurements(generatedCode);
    
    // Try to identify card container height (usually the larger height value)
    const heights = this.getValuesByFrequency(measurements.heights);
    const cardHeight = heights[0]; // Most common or first height
    const imageHeight = heights[1]; // Second most common (if exists)

    // Most common padding value
    const paddingValues = this.getValuesByFrequency(measurements.padding);
    const cardPadding = paddingValues[0];

    // Most common gap
    const gaps = this.getValuesByFrequency(measurements.gaps);
    const cardGap = gaps[0];

    // Border radius
    const radii = this.getValuesByFrequency(measurements.borderRadius);
    const borderRadius = radii[0];

    return {
      cardHeight,
      imageHeight,
      cardPadding,
      cardGap,
      borderRadius,
    };
  }
}
