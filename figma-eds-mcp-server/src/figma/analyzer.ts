import { FigmaNode, BlockAnalysis, VisualPatterns, FieldSuggestion } from '../types.js';
import { 
  DesignToken, 
  TypographyToken, 
  SpacingToken, 
  CTAButton, 
  InteractionLink, 
  HoverState,
  FigmaFill,
  BlockField
} from '../interfaces.js';
import { HTMLSimplifier } from '../preprocessors/htmlSimplifier.js';

export class DesignAnalyzer {
  private htmlSimplifier: HTMLSimplifier;

  constructor() {
    this.htmlSimplifier = new HTMLSimplifier();
  }

  // Code-derived signal structure
  private parseCodeSignals(rawCode?: string): {
    repeatedContainerNames: Record<string, number>;
    distinctHeadings: string[];
    actionButtonCount: number;
    itemLikeContainerCount: number;
    multiItemLikely: boolean;
    semanticCtas?: { text: string; href?: string; type: 'button' | 'link' }[];
  } {
    if (!rawCode || rawCode.length < 40) {
      return {
        repeatedContainerNames: {},
        distinctHeadings: [],
        actionButtonCount: 0,
        itemLikeContainerCount: 0,
        multiItemLikely: false,
        semanticCtas: [],
      };
    }
    const code = rawCode.toLowerCase();
    const repeatedContainerNames: Record<string, number> = {};
    // Common item container name patterns
    const containerNamePatterns = [
      'accordion item', 'card', 'service item', 'plan card', 'pricing card', 'tab item', 'carousel item', 'gallery item'
    ];
    containerNamePatterns.forEach(p => {
      const regex = new RegExp(p.replace(/ /g, '[\"\'\-\s]*'), 'g');
      const matches = code.match(regex);
      if (matches && matches.length > 0) {
        repeatedContainerNames[p] = matches.length;
      }
    });
    // Headings: collect text inside <h1>-<h6>, and bold div spans that look like headings
  const headingMatches = Array.from(code.matchAll(/<h[1-6][^>]*>(.*?)<\/h[1-6]>|class=["'][^"']*(?:font-bold|text-xl|text-2xl|heading)[^"']*["'][^>]*>(.*?)<\//g));
    const headingTexts: string[] = [];
    headingMatches.forEach(m => {
      const text = (m[1] || m[2] || '').replace(/<[^>]+>/g, '').trim();
      if (text && text.length <= 60) headingTexts.push(text);
    });
    const distinctHeadings = Array.from(new Set(headingTexts));
    // Action buttons: look for buttons/links with action verbs
    const actionKeywords = ['add','edit','remove','delete','view','upgrade','select','choose','learn more','subscribe','sign up'];
    let actionButtonCount = 0;
    actionKeywords.forEach(k => {
      const r = new RegExp(`<button[^>]*>[^<]*${k}[^<]*<|<a[^>]*>[^<]*${k}[^<]*<`, 'g');
      const m = code.match(r);
      if (m) actionButtonCount += m.length;
    });
  // Extract semantic CTAs - ONLY from actual interactive elements
  // Simple rule: If there are no <button>, <a href>, or data-name="Button" elements, there are no CTAs
    const semanticCtas: { text: string; href?: string; type: 'button' | 'link' }[] = [];
    
    // Extract actual <button> elements
    const buttonMatches = Array.from(code.matchAll(/<button[^>]*>(.*?)<\/button>/g));
    buttonMatches.forEach(m => {
      const text = m[1].replace(/<[^>]+>/g,'').trim();
      if (text && text.length <= 100) { // Reasonable text length limit
        semanticCtas.push({ text, type: 'button' });
      }
    });
    
    // Extract actual <a href> elements with real URLs
    const linkMatches = Array.from(code.matchAll(/<a[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/g));
    linkMatches.forEach(m => {
      const href = m[1];
      const text = m[2].replace(/<[^>]+>/g,'').trim();
      // Only include links with actual URLs (not placeholders)
      if (text && href && href !== '#' && href.length > 1 && !href.startsWith('javascript:') && text.length <= 100) {
        semanticCtas.push({ text, href, type: 'link' });
      }
    });
    
    // Extract Figma button components: <div data-name="Button">
    const divButtonMatches = Array.from(rawCode.matchAll(/<div[^>]*data-name=["']Button["'][^>]*>([\s\S]*?)<\/div>/g));
    divButtonMatches.forEach(m => {
      const inner = m[1];
      const textMatch = inner.match(/<p[^>]*>(.*?)<\/p>/i) || inner.match(/<span[^>]*>(.*?)<\/span>/i) || inner.match(/>([^<>]{1,100})</);
      if (textMatch) {
        const rawText = textMatch[1].replace(/<[^>]+>/g,'').trim();
        if (rawText && rawText.length <= 100) {
          semanticCtas.push({ text: rawText, type: 'button' });
        }
      }
    });
    
    // Simple deduplication by text (no complex filtering needed)
    const filteredSemantic = (() => {
      const seen = new Set<string>();
      return semanticCtas.filter(c => {
        const norm = c.text.toLowerCase();
        if (seen.has(norm)) return false;
        seen.add(norm);
        return true;
      });
    })();
    // Item-like containers: repeated structural wrappers with data attributes or role patterns
      const itemLikeContainerMatches = code.match(/data-name=("|')(accordion item|card|service item|plan card)("|')/g) || [];
      const itemLikeContainerCount = itemLikeContainerMatches.length;
      // Generic container heuristic: multiple generic data-name="Container" blocks plus headings or bullet lists
      const genericContainerMatches = Array.from(code.matchAll(/data-name=["']container["']/g));
      const genericContainerCount = genericContainerMatches.length;
      const smallHeadingMatches = code.match(/data-name=["']heading(?: \d+)?["']/g) || [];
      const bulletListIndicators = code.match(/•\s+[a-z0-9]/g) || [];
      const genericContainerMultiItemSignal = genericContainerCount >= 2 && (smallHeadingMatches.length >= 2 || bulletListIndicators.length >= 4);
  // Multi-item likely if we have >1 (>=2) repeated container name occurrences OR >=2 distinct headings paired with >=1 action button OR itemLikeContainerCount >=2
  // Lowering thresholds to increase sensitivity for multi-item detection
  // Threshold rationale: we use >=2 (rather than >=3) for repeated structural containers and candidate frames
  // to catch small sets of items (e.g., 2-card layouts) early. False positives are mitigated by requiring
  // heading/action/button patterns elsewhere in overall heuristics.
  const hasRepeatedContainers = Object.values(repeatedContainerNames).some(c => c >= 2);
  // Removed actionButtonCount requirement; distinct multiple headings alone can indicate repeated item structure.
  const multiItemLikely = hasRepeatedContainers || (distinctHeadings.length >= 2) || itemLikeContainerCount >= 2 || genericContainerMultiItemSignal;
    return {
      repeatedContainerNames,
      distinctHeadings,
      actionButtonCount,
      itemLikeContainerCount,
      multiItemLikely,
      semanticCtas: filteredSemantic,
    };
  }
  
  /**
   * Analyze a Figma node to determine block structure
   */
  async analyze(node: FigmaNode, rawCode?: string, screenshot?: string): Promise<BlockAnalysis> {
    const debugMetrics: Record<string, unknown> = {};
    
    // CRITICAL: Simplify Figma's verbose React+Tailwind output before analysis
    // This removes Tailwind bloat, collapses layout wrappers, and normalizes structure
    let processedCode = rawCode;
    if (rawCode && rawCode.length > 100) {
      const simplificationResult = this.htmlSimplifier.debugComparison(rawCode);
      processedCode = simplificationResult.simplified;
      debugMetrics.htmlSimplification = {
        originalSize: simplificationResult.stats.originalSize,
        simplifiedSize: simplificationResult.stats.simplifiedSize,
        reductionPercent: simplificationResult.stats.reductionPercent
      };
      console.log('[DEBUG] HTML simplification:', debugMetrics.htmlSimplification);
    }
    
    // Parse code-derived signals from the SIMPLIFIED code
    const codeSignals = this.parseCodeSignals(processedCode);
    debugMetrics.codeSignals = codeSignals;
    
    // NEW: Analyze visual patterns from screenshot if available
    let visualPatterns = null;
    if (screenshot) {
      visualPatterns = await this.analyzeVisualPatterns(screenshot);
      debugMetrics.visualPatterns = visualPatterns;
      console.log('[DEBUG] Visual pattern analysis:', visualPatterns);
    }
  // ENHANCED: Block type determination using both code and visual signals
  // Visual analysis takes precedence when available and confident
  let blockType: 'multi-item' | 'single';
  if (visualPatterns?.isMultiItem && visualPatterns?.confidence === 'high') {
    blockType = 'multi-item';
    console.log('[DEBUG] Block type determined by visual analysis: multi-item');
  } else {
    blockType = codeSignals.multiItemLikely ? 'multi-item' : 'single';
    console.log('[DEBUG] Block type determined by code signals:', blockType);
  }
    const analysis: BlockAnalysis = {
      blockType,
      blockName: this.sanitizeBlockName(node.name),
      contentStructure: {
        containerFields: [],
        itemFields: [],
        configurationOptions: [],
        jsPattern: 'cards', // Default to cards pattern
      },
      designTokens: {
        colors: [],
        typography: [],
        spacing: [],
        grid: {
          columns: 12,
          gutter: '24px',
          margin: '120px',
          maxWidth: '1200px',
        },
      },
      interactions: {
        ctaButtons: [],
        links: [],
        hovers: [],
      },
      variants: [],
      accessibility: {
        headingHierarchy: [],
        altTextRequired: false,
        colorContrast: { valid: true },
        keyboardNavigation: true,
      },
      // Embed debug metrics for tooling visibility
      debug: debugMetrics as any,
    };

    // Analyze content structure (processedCode-driven for multi-item, enhanced with visual patterns)
    this.analyzeContentStructure(node, analysis, processedCode, visualPatterns);
    
    // Extract design tokens
    this.extractDesignTokens(node, analysis);
    
    // Analyze interactions
    this.analyzeInteractions(node, analysis);
    
    // Check accessibility requirements
    this.analyzeAccessibility(node, analysis);

    return analysis;
  }

  /**
   * Parse rawCode artifact to infer multi-item structural data when Figma node tree is unavailable.
   */
  private parseRawCodeForMultiItemStructure(rawCode: string): {
    containerHeading?: string;
    containerIconPresent?: boolean;
    itemHeadings: string[];
    itemDescriptions: string[];
    itemLists: string[][];
    itemIconsPresent: boolean;
    hasItemCTAs?: boolean;
  } {
    // 1. Attempt to extract a container heading
    let containerHeading: string | undefined;
    let containerIconPresent = false;
    
    // Try CardTitle pattern first (use [^<]* for JSX/Tailwind attributes)
    const cardTitle = rawCode.match(/data-name=["']CardTitle["'][\s\S]*?<p[^<]*>(.*?)<\/p>/i);
    const cardTitleIcon = rawCode.match(/data-name=["']CardTitle["'][\s\S]*?<img[^>]*src=(?:"[^"]+"|{[^}]+})[^>]*>/i);
    const cardTitleIconWrapper = !cardTitleIcon && /data-name=["']CardTitle["'][\s\S]*?data-name=["']Icon["'][^>]*>\s*<img/i.test(rawCode);
    if (cardTitleIcon || cardTitleIconWrapper) {
      containerIconPresent = true;
    }
    if (cardTitle) {
      containerHeading = this.stripHtml(cardTitle[1]).trim();
    }
    
    // Try "Header + Body" or "Header" pattern (common in Figma components)
    if (!containerHeading) {
      const headerMatch = rawCode.match(/data-name=["']Header(?:\s*\+\s*Body)?["'][\s\S]*?<p[^<]*>(.*?)<\/p>/i);
      if (headerMatch) {
        containerHeading = this.stripHtml(headerMatch[1]).trim();
      }
    }
    
    // Fallback: first capitalized paragraph before first item container
    if (!containerHeading) {
      const preItems = rawCode.split(/data-name=["'](?:Container|Card|Products)["']/i)[0] || '';
      const alt = preItems.match(/<p[^>]*>([A-Z][^<]{8,180})<\/p>/);
      if (alt) containerHeading = this.stripHtml(alt[1]).trim();
      if (!containerHeading) {
        const phrase = rawCode.match(/(Enhanced [A-Za-z0-9 ]{3,120}|Features? [A-Za-z0-9 ]{3,120}|[A-Z][a-z]+ [A-Z][a-z]+)/);
        if (phrase) containerHeading = phrase[1].trim();
      }
    }

    // 2. Extract item headings, descriptions, and bullet lists from Card or Container blocks
    const itemHeadings: string[] = [];
    const itemDescriptions: string[] = [];
    const itemLists: string[][] = [];
    const itemIcons: boolean[] = [];
    let hasItemCTAs = false;
    
    // Try Card pattern first (common in card grids with icons, headings, descriptions)
    // Match all Card blocks - they can be deeply nested
    // Also match React component usage: <Card ... />
    const cardDivMatches = Array.from(rawCode.matchAll(/<div[^>]*data-name=["']Card["'][^>]*>/gi));
    const cardComponentMatches = Array.from(rawCode.matchAll(/<Card\s+/gi));
    
    console.log(`[DEBUG] Found ${cardDivMatches.length} Card div matches, ${cardComponentMatches.length} Card component uses`);
    
    // If we have Card component uses but no divs, we're dealing with React components
    // Extract from the Card function definition instead
    if (cardComponentMatches.length > 0 && cardDivMatches.length <= 1) {
      console.log(`[DEBUG] Detected React component pattern, extracting from Card function props`);
      
      // Extract from Card component usage - parse the props
      cardComponentMatches.forEach((match, cardIndex) => {
        const startPos = (match.index || 0);
        const segment = rawCode.substring(startPos, startPos + 800);
        
        // Extract title prop
        const titleMatch = segment.match(/title=["']([^"']+)["']/);
        if (titleMatch) {
          const heading = titleMatch[1];
          console.log(`[DEBUG] Card ${cardIndex + 1} heading from props: ${heading}`);
          if (heading && heading.length <= 150) itemHeadings.push(heading);
        }
        
        // Extract text prop (description)
        const textMatch = segment.match(/text=["']([^"']+)["']/);
        if (textMatch) {
          const desc = textMatch[1];
          console.log(`[DEBUG] Card ${cardIndex + 1} description from props: ${desc.substring(0, 50)}...`);
          if (desc && desc.length >= 20 && desc.length <= 500) itemDescriptions.push(desc);
        }
        
        // Extract buttonText prop (CTA text)
        const buttonTextMatch = segment.match(/buttonText=["']([^"']+)["']/);
        if (buttonTextMatch) {
          console.log(`[DEBUG] Card ${cardIndex + 1} has CTA button`);
        }
        
        // Icons are in the icon prop
        const iconMatch = segment.match(/icon=\{/);
        if (iconMatch) {
          itemIcons.push(true);
        }
      });
      
      hasItemCTAs = cardComponentMatches.length > 0; // All cards have CTAs
    } else {
      // Original Card div pattern processing
      console.log(`[DEBUG] Using Card div pattern extraction`);
      const cardMatches = cardDivMatches;
    
      cardMatches.forEach((match, cardIndex) => {
        console.log(`[DEBUG] Processing card ${cardIndex + 1}/${cardMatches.length}`);
      // Extract the segment after the Card opening tag
      const startPos = (match.index || 0) + match[0].length;
      // Look ahead to find card content (up to 2000 chars should cover most cards)
      const segment = rawCode.substring(startPos, startPos + 2000);
      
      // Only process if this looks like a card item (has heading, title, or paragraph content)
      const hasHeadingOrPara = /data-name=["'](?:Heading(?: \d+)?|Title|Text|Paragraph)["']/.test(segment);
      if (!hasHeadingOrPara) return;
      
      // Extract heading with multiple pattern support
      // Try: Any Heading level, Title, or any bold/large text (use [^<]* for JSX/Tailwind)
      let heading: string | undefined;
      const hMatch = segment.match(/data-name=["']Heading(?: \d+)?["'][^>]*>[\s\S]*?<p[^<]*>([\s\S]*?)<\/p>/i);
      const titleMatch = segment.match(/data-name=["']Title["'][^>]*>[\s\S]*?<p[^<]*>([\s\S]*?)<\/p>/i);
      const hGeneric = segment.match(/<p[^<]*class="[^"]*(?:font-(?:bold|medium|semibold)|text-(?:xl|2xl|3xl|4xl)|heading)[^"]*"[^<]*>([\s\S]*?)<\/p>/i);
      
      if (hMatch) heading = this.stripHtml(hMatch[1]).trim();
      else if (titleMatch) heading = this.stripHtml(titleMatch[1]).trim();
      else if (hGeneric) heading = this.stripHtml(hGeneric[1]).trim();
      
      console.log(`[DEBUG] Card ${cardIndex + 1} heading: ${heading || 'NOT FOUND'}`);
      if (heading && heading.length <= 150) itemHeadings.push(heading);
      
      // Extract description/paragraph text with multiple pattern support
      // Try: Paragraph, Text, or any body text pattern
      // Use [\s\S]{0,800} to allow for nested divs between data-name and <p>
      // Use <p[^<]*> instead of <p[^>]*> to handle JSX/Tailwind with special chars like className="text-[color:var(...)]>"
      const paraMatch = segment.match(/data-name=["']Paragraph["'][\s\S]{0,800}?<p[^<]*>([\s\S]*?)<\/p>/i);
      const textMatch = segment.match(/data-name=["']Text["'][\s\S]{0,800}?<p[^<]*>([\s\S]*?)<\/p>/i);
      
      console.log(`[DEBUG] Card ${cardIndex + 1} paraMatch: ${!!paraMatch}, textMatch: ${!!textMatch}`);
      
      if (paraMatch) {
        const desc = this.stripHtml(paraMatch[1]).trim();
        console.log(`[DEBUG] Card ${cardIndex + 1} paraMatch desc length: ${desc.length}, content: ${desc.substring(0, 50)}...`);
        if (desc && desc.length >= 20 && desc.length <= 500) itemDescriptions.push(desc);
      } else if (textMatch) {
        const desc = this.stripHtml(textMatch[1]).trim();
        console.log(`[DEBUG] Card ${cardIndex + 1} textMatch desc length: ${desc.length}, content: ${desc.substring(0, 50)}...`);
        if (desc && desc.length >= 20 && desc.length <= 500) itemDescriptions.push(desc);
      }
      
      // Detect icon presence - check for Image wrapper or direct img tags
      const hasImageWrapper = /data-name=["']Image["']/.test(segment);
      const hasIconWrapper = /data-name=["']Icon["']/.test(segment);
      const hasImgTag = /<img[^>]*src=/.test(segment);
      const hasIcon = hasImageWrapper || hasIconWrapper || hasImgTag;
      itemIcons.push(hasIcon);
      
      // Extract bullet lists if present (use [^<]* for JSX/Tailwind)
      const bullets: string[] = [];
      const bulletRegex = /<p[^<]*>([^<]*•[^<]*)<\/p>/g;
      let b: RegExpExecArray | null;
      while ((b = bulletRegex.exec(segment)) !== null) {
        const bullet = this.stripHtml(b[1]).trim().replace(/^•\s*/, '');
        if (bullet) bullets.push(bullet);
      }
      if (bullets.length > 0) itemLists.push(bullets);
    });
    
    // Extract CTA buttons from cards (detect button text)
    hasItemCTAs = cardMatches.some((match, idx) => {
      const startPos = (match.index || 0) + match[0].length;
      const segment = rawCode.substring(startPos, startPos + 2000);
      
      // Look for button patterns: data-name with "Button" or "Type=Primary"
      const hasButtonElement = /data-name=["'][^"']*(?:Button|Type=Primary)[^"']*["']/.test(segment);
      console.log(`[DEBUG] Card ${idx + 1} CTA check - hasButtonElement: ${hasButtonElement}`);
      if (!hasButtonElement) {
        // Debug: show what data-name values we do have
        const dataNames = segment.match(/data-name=["']([^"']+)["']/g);
        console.log(`[DEBUG] Card ${idx + 1} data-name attributes found:`, dataNames?.slice(0, 5));
      }
      return hasButtonElement;
    });
    } // Close else block for Card div pattern
    
    // Also process Container pattern (original logic - handles feature lists, etc.)
    const containerRegex = /<div[^>]*data-name=["']Container["'][^>]*>([\s\S]*?)<\/div>/gi;
    let cMatch: RegExpExecArray | null;
    while ((cMatch = containerRegex.exec(rawCode)) !== null) {
      const segment = cMatch[1];
      
      // Extract heading (any Heading level, use [^<]* for JSX/Tailwind)
      const hMatch = segment.match(/data-name=["']Heading(?: \d+)?["'][\s\S]*?<p[^<]*>(.*?)<\/p>/i);
      if (hMatch) {
        const heading = this.stripHtml(hMatch[1]).trim();
        if (heading && heading.length <= 150) {
          // Only add if not already captured from Card pattern
          if (!itemHeadings.includes(heading)) {
            itemHeadings.push(heading);
          }
        }
      }
      
      // Extract bullet lists (use [^<]* for JSX/Tailwind)
      const bullets: string[] = [];
      const bulletRegex = /<p[^<]*>([^<]*•[^<]*)<\/p>/g;
      let b: RegExpExecArray | null;
      while ((b = bulletRegex.exec(segment)) !== null) {
        const bullet = this.stripHtml(b[1]).trim().replace(/^•\s*/, '');
        if (bullet) bullets.push(bullet);
      }
      if (bullets.length > 0) itemLists.push(bullets);
    }

    // 3. Global fallback heading extraction if none found (use [^<]* for JSX/Tailwind)
    if (itemHeadings.length === 0) {
      const globalHeadings = Array.from(rawCode.matchAll(/data-name=["']Heading(?: \d+)?["'][\s\S]*?<p[^<]*>(.*?)<\/p>/gi));
      globalHeadings.forEach(g => {
        const heading = this.stripHtml(g[1]).trim();
        if (heading && heading.length <= 150 && !itemHeadings.includes(heading)) itemHeadings.push(heading);
      });
    }

    // 4. Global fallback bullet list collection (use [^<]* for JSX/Tailwind)
    if (!itemLists.some(list => list.length > 0)) {
      const globalBullets: string[] = [];
      const globalBulletRegex = /<p[^<]*>(\s*•\s*[^<]{2,200})<\/p>/g;
      let gb: RegExpExecArray | null;
      while ((gb = globalBulletRegex.exec(rawCode)) !== null) {
        const bullet = this.stripHtml(gb[1]).trim().replace(/^•\s*/, '');
        if (bullet) globalBullets.push(bullet);
      }
      if (globalBullets.length > 0) itemLists.push(globalBullets);
    }

    // 5. Pairing heuristic - ensure itemLists length >= itemHeadings length
    // Removed replication of last list to prevent artificial duplication; lists remain associated only where detected.
    
    // Determine if icons are present in items
    const itemIconsPresent = itemIcons.length > 0 && itemIcons.some(hasIcon => hasIcon);

    console.log(`[DEBUG] Final extraction results:`, {
      containerHeading,
      containerIconPresent,
      itemHeadingsCount: itemHeadings.length,
      itemHeadings: itemHeadings,
      itemDescriptionsCount: itemDescriptions.length,
      itemDescriptions: itemDescriptions.map(d => d.substring(0, 50) + '...'),
      itemListsCount: itemLists.length,
      itemIconsPresent,
      hasItemCTAs
    });

    return { 
      containerHeading, 
      containerIconPresent, 
      itemHeadings, 
      itemDescriptions, 
      itemLists, 
      itemIconsPresent,
      hasItemCTAs
    };
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '');
  }

  /**
   * Determine if this should be a single block or multi-item block
   */

  /**
   * Find direct sibling frames/groups/components under any parent that qualify as item frames:
   * Criteria: contain heading-sized text (>=18) AND either an action keyword text OR a detected button.
   * Groups only counted if parent has >=2 such children; returned unique child frames across all parents.
   */
  private findSiblingItemFrames(root: FigmaNode): FigmaNode[] {
    const result: FigmaNode[] = [];
    const parents: FigmaNode[] = [];
    const collectParents = (n: FigmaNode) => {
      if (n.children && n.children.length > 1) parents.push(n);
      n.children?.forEach(collectParents);
    };
    collectParents(root);
    const actionKeywords = ['add','edit','remove','delete','view','learn more','upgrade','select','choose'];
    parents.forEach(parent => {
      const candidates = (parent.children || []).filter(c => ['FRAME','GROUP','COMPONENT'].includes(c.type));
      const qualified = candidates.filter(f => {
        if (!f.children) return false;
        // Heading can appear in any descendant
        const hasHeading = this.findAllTextNodes(f).some(t => (t.style?.fontSize || 0) >= 18);
        const hasActionText = this.findAllTextNodes(f).some(t => {
          const txt = (t.characters || '').toLowerCase();
          return actionKeywords.some(k => txt.includes(k));
        });
        const hasButton = this.findAllButtonNodes(f).length > 0;
        return hasHeading && (hasActionText || hasButton);
      });
      if (qualified.length >= 2) {
        qualified.forEach(q => {
          if (!result.includes(q)) result.push(q);
        });
      }
    });
    return result;
  }

  /**
   * Find repeated named containers that meet structural criteria: heading-sized text and button/action text.
   */
  private findRepeatedNamedContainers(node: FigmaNode): { name: string; count: number }[] {
    interface ContainerInfo { nodes: FigmaNode[]; }
    const map: Record<string, ContainerInfo> = {};
    const isContainerCandidate = (n: FigmaNode): boolean => {
      if (!n.children) return false;
      const hasHeading = n.children.some(c => c.type === 'TEXT' && (c.style?.fontSize || 0) >= 18);
      // Look for a text child with action keywords
      const actionKeywords = ['add','edit','remove','delete','view','learn more','upgrade','select','choose'];
      const hasActionText = this.findAllTextNodes(n).some(t => {
        const txt = (t.characters || '').toLowerCase();
        return actionKeywords.some(k => txt.includes(k));
      });
      // Or presence of a button node
      const hasButton = this.findAllButtonNodes(n).length > 0;
      return hasHeading && (hasActionText || hasButton);
    };
    const traverse = (n: FigmaNode) => {
      if (n.name && (n.type === 'FRAME' || n.type === 'GROUP' || n.type === 'COMPONENT')) {
        const norm = n.name.trim().toLowerCase();
        // Filter out overly generic names to reduce false positives
        const genericNames = ['frame','group','auto layout','container','wrapper'];
        if (genericNames.includes(norm)) {
          n.children?.forEach(traverse);
          return;
        }
        if (isContainerCandidate(n)) {
          if (!map[norm]) map[norm] = { nodes: [] };
          map[norm].nodes.push(n);
        }
      }
      n.children?.forEach(traverse);
    };
    traverse(node);
    return Object.entries(map)
      .filter(([_, info]) => info.nodes.length >= 2)
      .map(([name, info]) => ({ name, count: info.nodes.length }));
  }

  /**
   * Detect frames/groups that look like repeatable item containers (cards, service tiles, etc.)
   * Heuristic: Similar dimensions + contain at least one heading-sized text OR image.
   */
  private findCandidateItemContainers(node: FigmaNode): FigmaNode[] {
    const containers: FigmaNode[] = [];
    const collect = (n: FigmaNode) => {
      if ((n.type === 'FRAME' || n.type === 'GROUP' || n.type === 'COMPONENT') && n.children && n.children.length > 0) {
        const hasHeadingText = n.children.some(c => c.type === 'TEXT' && c.style?.fontSize && c.style.fontSize >= 18);
        const hasImage = this.findAllImageNodes(n).length > 0;
        const hasButton = this.findAllButtonNodes(n).length > 0;
        if (hasHeadingText || hasImage || hasButton) {
          containers.push(n);
        }
      }
      n.children?.forEach(collect);
    };
    collect(node);

    // Group by size signature and keep groups of size >=2
    const bySignature: Record<string, FigmaNode[]> = {};
    containers.forEach(c => {
      const bounds = c.absoluteBoundingBox;
      const sig = bounds ? `${Math.round(bounds.width)}x${Math.round(bounds.height)}` : 'nosize';
      bySignature[sig] = bySignature[sig] || [];
      bySignature[sig].push(c);
    });
    const repeating = Object.values(bySignature).filter(g => g.length >= 2).flat();
    return repeating;
  }

  /**
   * Detect basic accordion structures: repeated headers followed by content regions.
   * Looks for frames/groups with a header-like text node and sibling content container.
   */
  private isAccordionComponent(node: FigmaNode): boolean {
    const sections: { header: FigmaNode; container: FigmaNode }[] = [];
    const traverse = (n: FigmaNode) => {
      if ((n.type === 'FRAME' || n.type === 'GROUP') && n.children && n.children.length >= 2) {
        // header candidate: text with medium+ font size or name containing 'header'/'accordion'
        const header = n.children.find(c => (
          c.type === 'TEXT' && c.style?.fontSize && c.style.fontSize >= 18
        ) || (c.name && /header|accordion|title/i.test(c.name)));
        // content candidate: frame/group following header
        const container = header ? n.children.find(c => c !== header && (c.type === 'FRAME' || c.type === 'GROUP')) : undefined;
        if (header && container) {
          sections.push({ header, container });
        }
      }
      n.children?.forEach(traverse);
    };
    traverse(node);
    if (sections.length >= 3) {
      console.log(`[DEBUG] Accordion sections detected: ${sections.length}`);
      return true;
    }
    return false;
  }

  /**
   * Analyze the content structure to determine fields
   */
  private analyzeContentStructure(node: FigmaNode, analysis: BlockAnalysis, rawCode?: string, visualPatterns?: VisualPatterns | null): void {
    // Primary rawCode-driven multi-item extraction (artifact-only mode)
    // ENHANCED: Use visual patterns to supplement or override code analysis
    if (analysis.blockType === 'multi-item' && rawCode && rawCode.length > 40) {
      const extracted = this.parseRawCodeForMultiItemStructure(rawCode);
      (analysis.debug as any).rawCodePrimaryMultiItem = true;
      (analysis.debug as any).rawCodePrimaryStats = {
        containerHeadingPresent: !!extracted.containerHeading,
        itemHeadingCount: extracted.itemHeadings.length,
        itemListBlocks: extracted.itemLists.length,
      };
      // Initialize arrays defensively
      analysis.contentStructure.containerFields = [];
      analysis.contentStructure.itemFields = [];
      // Container heading field
      if (extracted.containerHeading) {
        analysis.contentStructure.containerFields.push({
          name: 'heading',
          label: 'Container Heading',
          component: 'text',
          valueType: 'string',
          required: true,
          maxLength: 200,
          description: 'Primary heading for the list group',
        });
      }
      // Icon reference field if icon detected in CardTitle raw HTML
      if ((extracted as any).containerIconPresent) {
        analysis.contentStructure.containerFields.push({
          name: 'icon',
          label: 'Container Icon',
          component: 'reference',
          valueType: 'string',
          required: false,
          description: 'Icon image associated with container heading',
        });
        analysis.contentStructure.containerFields.push({
          name: 'iconAlt',
          label: 'Icon Alt Text',
          component: 'text',
          valueType: 'string',
          required: false,
          maxLength: 120,
          description: 'Alt text for the icon (leave blank if purely decorative).',
        });
      }
      // Item heading field
      if (extracted.itemHeadings.length > 0) {
        analysis.contentStructure.itemFields.push({
          name: 'heading',
          label: 'Item Heading',
          component: 'text',
          valueType: 'string',
          required: true,
          maxLength: 150,
          description: 'Heading text for each item',
        });
      }
      // Item icon fields (if icons detected in items)
      if (extracted.itemIconsPresent) {
        analysis.contentStructure.itemFields.push({
          name: 'icon',
          label: 'Item Icon',
          component: 'reference',
          valueType: 'string',
          required: false,
          description: 'Icon image for the item',
        });
        analysis.contentStructure.itemFields.push({
          name: 'iconAlt',
          label: 'Icon Alt Text',
          component: 'text',
          valueType: 'string',
          required: false,
          maxLength: 120,
          description: 'Alt text for the icon (leave blank if purely decorative).',
        });
      }
      // Item description field (if descriptions detected)
      if (extracted.itemDescriptions.length > 0) {
        analysis.contentStructure.itemFields.push({
          name: 'description',
          label: 'Item Description',
          component: 'text',
          valueType: 'string',
          required: false,
          maxLength: 500,
          description: 'Descriptive text for each item',
        });
      }
      // Rich content field for bullet lists
      if (extracted.itemLists.some(l => l.length > 0)) {
        analysis.contentStructure.itemFields.push({
          name: 'richContent',
          label: 'Item List Content',
          component: 'richtext',
          valueType: 'string',
          required: false,
          maxLength: 1000,
          description: 'List or rich content associated with each item',
        });
      }
      // CTA button fields (if CTAs detected in items)
      if (extracted.hasItemCTAs) {
        analysis.contentStructure.itemFields.push({
          name: 'cta',
          label: 'CTA URL',
          component: 'text',
          valueType: 'string',
          required: false,
          description: 'URL for the item call-to-action button',
        });
        analysis.contentStructure.itemFields.push({
          name: 'ctaText',
          label: 'CTA Button Text',
          component: 'text',
          valueType: 'string',
          required: false,
          maxLength: 50,
          description: 'Display text for the CTA button',
        });
      }
      // Configuration options still derived from node name patterns
      analysis.contentStructure.configurationOptions = this.findConfigurationOptions(node);
      
      // Determine JS pattern based on block name and field structure
      // Use 'carousel' pattern if:
      // 1. Block name contains 'carousel' or 'slider' or 'gallery'
      // Use 'cards' pattern (ul/li, every row) if:
      // 1. Block name contains 'card' or 'cards' (primary indicator)
      // 2. OR no richtext fields (bullet lists need decorated pattern)
      // Otherwise use 'decorated' pattern (filter rows, decorateItem function)
      const blockNameLower = this.sanitizeBlockName(node.name).toLowerCase();
      const isCarouselBlock = blockNameLower.includes('carousel') || blockNameLower.includes('slider') || blockNameLower.includes('gallery');
      const isCardBlock = blockNameLower.includes('card');
      const hasRichtext = analysis.contentStructure.itemFields.some(f => f.component === 'richtext');
      
      // Pattern priority: carousel > cards > decorated
      if (isCarouselBlock) {
        analysis.contentStructure.jsPattern = 'carousel';
      } else if (isCardBlock) {
        analysis.contentStructure.jsPattern = 'cards';
      } else {
        analysis.contentStructure.jsPattern = hasRichtext ? 'decorated' : 'cards';
      }
      
      return; // Skip Figma structural analysis entirely
    }
    const textNodes = this.findAllTextNodes(node);
    const allImageNodes = this.findAllImageNodes(node);
    const buttonNodes = this.findAllButtonNodes(node);

    // Structural partition for Option B: separate container-level vs item-level images
    let containerImageNodes = allImageNodes;
    let itemImageNodes: FigmaNode[] = [];
    if (analysis.blockType === 'multi-item') {
      const itemContainerNodes = this.findItemContainerNodes(node);
      // Build a fast lookup by traversing each item container subtree
      const itemImageSet: Set<FigmaNode> = new Set();
      const markDescendantImages = (container: FigmaNode) => {
        const traverse = (n: FigmaNode) => {
          if (allImageNodes.includes(n)) itemImageSet.add(n);
          n.children?.forEach(traverse);
        };
        traverse(container);
      };
      itemContainerNodes.forEach(markDescendantImages);
      itemImageNodes = Array.from(itemImageSet);
      containerImageNodes = allImageNodes.filter(n => !itemImageSet.has(n));
      (analysis.debug as any).imagePartitioning = {
        totalImages: allImageNodes.length,
        itemImages: itemImageNodes.length,
        containerImages: containerImageNodes.length,
        itemContainerCount: itemContainerNodes.length,
      };
    }

    if (analysis.blockType === 'multi-item') {
      // For multi-item blocks, separate container and item fields
      
      // Container fields analysis - check for all possible container content
      const containerFields = this.analyzeContainerFields(textNodes, containerImageNodes, buttonNodes, analysis);
      analysis.contentStructure.containerFields = containerFields;

      // Item fields (content that repeats for each item)
      const itemStructure = this.analyzeItemStructure(node, analysis, itemImageNodes);
      analysis.contentStructure.itemFields = itemStructure.fields;
      
      // ENHANCEMENT: Merge visual pattern suggestions if available
      if (visualPatterns?.suggestedFields && visualPatterns.suggestedFields.length > 0) {
        analysis.contentStructure.itemFields = this.mergeFieldSuggestions(
          analysis.contentStructure.itemFields,
          visualPatterns.suggestedFields
        );
        console.log('[DEBUG] Merged visual field suggestions. Final item field count:', analysis.contentStructure.itemFields.length);
      }
      
      // Determine JS pattern based on block name, field structure, and visual patterns
      // Use 'cards' pattern (ul/li, every row) if:
      // 1. Block name contains 'card' or 'cards' (primary indicator)
      // 2. OR no richtext fields (bullet lists need decorated pattern)
      // Otherwise use 'decorated' pattern (filter rows, decorateItem function)
      const blockNameLower = analysis.blockName.toLowerCase();
      const isCarouselBlock = blockNameLower.includes('carousel') || blockNameLower.includes('slider') || blockNameLower.includes('gallery');
      const isCardBlock = blockNameLower.includes('card');
      const hasRichtext = analysis.contentStructure.itemFields.some(f => f.component === 'richtext');
      
      // ENHANCEMENT: Check visual patterns for carousel indicators
      const visualSuggestsCarousel = visualPatterns?.suggestedFields?.some(f => 
        f.label.toLowerCase().includes('slide')
      );
      
      // Pattern priority: carousel (visual or name) > cards > decorated
      if (isCarouselBlock || visualSuggestsCarousel) {
        analysis.contentStructure.jsPattern = 'carousel';
        console.log('[DEBUG] JS pattern set to carousel based on', isCarouselBlock ? 'block name' : 'visual analysis');
      } else if (isCardBlock) {
        analysis.contentStructure.jsPattern = 'cards';
      } else {
        analysis.contentStructure.jsPattern = hasRichtext ? 'decorated' : 'cards';
      }
      
    } else {
      // For single blocks, all fields are container fields
      analysis.contentStructure.containerFields = this.extractAllFields(textNodes, allImageNodes, buttonNodes);
    }

    // Configuration options (themes, variants, etc.)
    analysis.contentStructure.configurationOptions = this.findConfigurationOptions(node);
  }

  /**
   * Extract design tokens from the Figma node
   */
  private extractDesignTokens(node: FigmaNode, analysis: BlockAnalysis): void {
    // Extract colors
    analysis.designTokens.colors = this.extractColors(node);
    
    // Extract typography
    analysis.designTokens.typography = this.extractTypography(node);
    
    // Extract spacing
    analysis.designTokens.spacing = this.extractSpacing(node);
  }

  /**
   * Analyze interactive elements
   */
  private analyzeInteractions(node: FigmaNode, analysis: BlockAnalysis): void {
    // Use semantic CTAs derived from code signals (most reliable)
    const debugAny: any = analysis.debug as any;
    const semanticCtas = debugAny?.codeSignals?.semanticCtas as { text: string; href?: string; type: 'button' | 'link' }[] | undefined;
    let ctas: CTAButton[] = [];
    
    if (semanticCtas && semanticCtas.length > 0) {
      // Simple deduplication by text, no filtering needed since semantic extraction is already clean
      const seen = new Set<string>();
      const deduped = semanticCtas.filter(c => {
        const norm = c.text.trim().toLowerCase();
        if (!norm || seen.has(norm)) return false;
        seen.add(norm);
        return true;
      });
      
      // Map to primary/secondary, cap at 3
      const limited = deduped.slice(0, 3);
      ctas = limited.map((c, i) => ({
        text: c.text,
        type: (i === 0 ? 'primary' : 'secondary') as 'primary' | 'secondary',
        url: c.href || '#'
      }));
      debugAny.ctaExtraction = 'semantic';
    } else {
      // Fallback to heuristic detection (less reliable)
      const heuristic = this.findCTAButtons(node);
      const seen = new Set<string>();
      ctas = heuristic.filter(c => {
        const norm = c.text.toLowerCase();
        if (seen.has(norm)) return false;
        seen.add(norm);
        return true;
      }).slice(0, 3).map((c, i) => ({
        text: c.text,
        type: (i === 0 ? 'primary' : 'secondary') as 'primary' | 'secondary',
        url: c.url
      }));
      debugAny.ctaExtraction = 'heuristic';
    }
    
    analysis.interactions.ctaButtons = ctas;

    // Links & hovers unchanged for now
    analysis.interactions.links = this.findLinks(node);
    analysis.interactions.hovers = this.findHoverStates(node);
  }

  /**
   * Analyze accessibility requirements
   */
  private analyzeAccessibility(node: FigmaNode, analysis: BlockAnalysis): void {
    // Determine heading hierarchy
    analysis.accessibility.headingHierarchy = this.determineHeadingHierarchy(node);
    
    // Check if images require alt text
    analysis.accessibility.altTextRequired = this.findAllImageNodes(node).length > 0;
    
    // Basic color contrast check (simplified)
    analysis.accessibility.colorContrast = this.checkColorContrast(node);
  }

  // Helper methods
  
  private sanitizeBlockName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private findAllTextNodes(node: FigmaNode): FigmaNode[] {
    const textNodes: FigmaNode[] = [];
    
    const traverse = (n: FigmaNode) => {
      if (n.type === 'TEXT') {
        textNodes.push(n);
      }
      if (n.children) {
        n.children.forEach(traverse);
      }
    };
    
    traverse(node);
    return textNodes;
  }

  private findAllImageNodes(node: FigmaNode): FigmaNode[] {
    const imageNodes: FigmaNode[] = [];
    const iconParentSet: Set<FigmaNode> = new Set();
    
    const traverse = (n: FigmaNode, parent?: FigmaNode) => {
      // Traditional image fills
      if (n.type === 'RECTANGLE' && n.fills && n.fills.some((fill: FigmaFill) => fill.type === 'IMAGE')) {
        imageNodes.push(n);
      }
      
      // SVG/Vector nodes (often used for icons)
      if (n.type === 'VECTOR' || n.type === 'BOOLEAN_OPERATION') {
        // Skip vectors whose parent is an icon/image container we already classified
        if (!parent || !iconParentSet.has(parent)) {
          imageNodes.push(n);
        }
      }
      
      // Components or instances that are likely images/icons
      if ((n.type === 'COMPONENT' || n.type === 'INSTANCE') && n.name) {
        const lname = n.name.toLowerCase();
        if (lname.includes('icon') || lname.includes('image') || lname.includes('logo') || 
            lname.includes('svg') || lname.includes('graphic')) {
          imageNodes.push(n);
          iconParentSet.add(n);
        }
      }
      
      // Frames/Groups named as icons
      if ((n.type === 'FRAME' || n.type === 'GROUP') && n.name) {
        const lname = n.name.toLowerCase();
        if (lname.includes('icon') || lname.includes('image')) {
          imageNodes.push(n);
          iconParentSet.add(n);
        }
      }

      // Broadening heuristic: treat small frames/groups containing a single vector child as an image/icon
      // Criteria:
      //  - Node is FRAME or GROUP
      //  - Has exactly 1 child
      //  - Child is VECTOR or BOOLEAN_OPERATION
      //  - Bounding box width and height are both <= 32px (small icon size threshold)
      //  - Not already added (avoid duplicates)
      if ((n.type === 'FRAME' || n.type === 'GROUP') && n.children && n.children.length === 1) {
        const child = n.children[0];
        const bounds = n.absoluteBoundingBox;
        if (child && (child.type === 'VECTOR' || child.type === 'BOOLEAN_OPERATION') && bounds) {
          const { width, height } = bounds;
          if (width <= 32 && height <= 32) {
            // Avoid duplicate addition if child was already classified
            if (!imageNodes.includes(n)) {
              imageNodes.push(n);
              iconParentSet.add(n); // treat as icon parent to suppress child vector duplication
            }
          }
        }
      }
      
      if (n.children) {
        n.children.forEach(child => traverse(child, n));
      }
    };
    
    traverse(node, undefined);
    return imageNodes;
  }

  private findAllButtonNodes(node: FigmaNode): FigmaNode[] {
    const buttonNodes: FigmaNode[] = [];
    const actionKeywords = ['add','edit','remove','delete','view','upgrade','select','choose','learn more','subscribe','sign up'];
    const serviceKeywords = ['internet','tv','voice','mobile','offer','special offer','xfinity home offer'];
    
    const traverse = (n: FigmaNode) => {
      // Look for common button patterns
      const lname = n.name?.toLowerCase() || '';
      const nameCheck = lname.includes('button') || lname.includes('cta');
      // Frame is considered a button only if it has a text child containing an action keyword (avoid service headings)
      const frameCheck = (n.type === 'FRAME' || n.type === 'GROUP' || n.type === 'COMPONENT') && n.backgroundColor && this.hasTextChild(n) &&
        this.findAllTextNodes(n).some(t => {
          const txt = (t.characters || '').toLowerCase();
          return actionKeywords.some(k => txt.includes(k)) && !serviceKeywords.includes(txt);
        });
      
      if (nameCheck || frameCheck) {
        buttonNodes.push(n);
        console.log(`[DEBUG] findAllButtonNodes found: ${n.name} (type: ${n.type}, nameCheck: ${nameCheck}, frameCheck: ${frameCheck})`);
      }
      if (n.children) {
        n.children.forEach(traverse);
      }
    };
    
    traverse(node);
    console.log(`[DEBUG] findAllButtonNodes total: ${buttonNodes.length}`);
    return buttonNodes;
  }

  private hasTextChild(node: FigmaNode): boolean {
    if (node.type === 'TEXT') return true;
    if (!node.children) return false;
    return node.children.some(child => this.hasTextChild(child));
  }

  private findRepeatingComponents(node: FigmaNode): FigmaNode[] {
    if (!node.children) return [];
    
    // Group children by similar structure/size
    const groups: { [key: string]: FigmaNode[] } = {};
    
    node.children.forEach(child => {
      const signature = this.getNodeSignature(child);
      if (!groups[signature]) {
        groups[signature] = [];
      }
      groups[signature].push(child);
    });
    
    // Return groups with more than one item
    return Object.values(groups).filter(group => group.length > 1).flat();
  }

  /**
   * Compute a simple grid density score: count of sibling frames/groups/components with similar heights
   * and aligned roughly in a row or column. Higher counts imply a multi-item grid layout.
   */
  private computeGridDensity(node: FigmaNode): number {
    if (!node.children) return 0;
    const candidates = node.children.filter(c => ['FRAME','GROUP','COMPONENT'].includes(c.type));
    interface Dim { h: number; w: number; x: number; y: number; node: FigmaNode }
    const dims: Dim[] = candidates.map(c => ({
      h: Math.round(c.absoluteBoundingBox?.height || 0),
      w: Math.round(c.absoluteBoundingBox?.width || 0),
      x: Math.round(c.absoluteBoundingBox?.x || 0),
      y: Math.round(c.absoluteBoundingBox?.y || 0),
      node: c
    })).filter(d => d.h > 0 && d.w > 0);
    if (dims.length < 2) return 0;
    // Group by approx height similarity (within 10px)
    const groups: Dim[][] = [];
    dims.forEach(d => {
      let group = groups.find(g => Math.abs(g[0].h - d.h) <= 10);
      if (!group) { group = [d]; groups.push(group); }
      else group.push(d);
    });
    // Score: largest group size adjusted by average horizontal or vertical alignment pattern
    let score = 0;
    groups.forEach(g => {
      if (g.length < 2) return;
      // Determine if mostly in a row (y within 20px) or a column (x within 20px)
      const rowAligned = g.filter(d => Math.abs(d.y - g[0].y) <= 20).length;
      const colAligned = g.filter(d => Math.abs(d.x - g[0].x) <= 20).length;
      const alignmentFactor = Math.max(rowAligned, colAligned);
      score = Math.max(score, alignmentFactor);
    });
    return score;
  }

  /**
   * Compute hierarchical repetition score by traversing all descendants and counting repeating signatures.
   * Score increments for each signature group beyond first occurrence; deeper levels add slight weight.
   */
  private computeHierarchicalRepetitionScore(node: FigmaNode): number {
    let score = 0;
    const signatureMap: Record<string, number> = {};
    const traverse = (n: FigmaNode, depth: number) => {
      const sig = this.getNodeSignature(n);
      signatureMap[sig] = (signatureMap[sig] || 0) + 1;
      if (signatureMap[sig] > 1) {
        // Add depth-weighted increment (deeper repetition counts slightly more)
        score += 1 + Math.min(depth, 3) * 0.25;
      }
      n.children?.forEach(c => traverse(c, depth + 1));
    };
    traverse(node, 0);
    return Math.round(score);
  }

  private getNodeSignature(node: FigmaNode): string {
    // Create a signature based on node structure
    const bounds = node.absoluteBoundingBox;
    const width = bounds ? Math.round(bounds.width / 10) * 10 : 0;
    const height = bounds ? Math.round(bounds.height / 10) * 10 : 0;
    const childCount = node.children?.length || 0;
    
    return `${node.type}-${width}x${height}-${childCount}`;
  }

  private findContainerElements(node: FigmaNode): boolean {
    // Look for elements that suggest this is a container
    return node.name?.toLowerCase().includes('container') || 
           node.name?.toLowerCase().includes('wrapper') ||
           node.type === 'FRAME';
  }

  private findTitleElements(node: FigmaNode): boolean {
    const textNodes = this.findAllTextNodes(node);
    return textNodes.some(n => 
      n.name?.toLowerCase().includes('title') ||
      n.name?.toLowerCase().includes('heading') ||
      (n.style && n.style.fontSize && n.style.fontSize > 32)
    );
  }

  private hasRepeatingContentPattern(node: FigmaNode): boolean {
    return this.findRepeatingComponents(node).length > 0;
  }

  /**
   * Check if this node represents a carousel/slider component
   */
  private isCarouselComponent(node: FigmaNode): boolean {
    // Check component name for carousel indicators
    const name = node.name?.toLowerCase() || '';
    const carouselKeywords = ['carousel', 'slider', 'slides', 'gallery', 'slideshow'];
    
    if (carouselKeywords.some(keyword => name.includes(keyword))) {
      return true;
    }

    // Look for navigation elements (arrows, prev/next buttons)
    const hasNavigation = this.hasNavigationControls(node);
    
    // Look for page indicators (dots, progress indicators)
    const hasPageIndicators = this.hasPageIndicators(node);
    
    // Look for slide container patterns
    const hasSlideStructure = this.hasSlideStructure(node);

    // Check for high number of buttons (indicates multiple slides)
    const allButtons = this.findAllButtonNodes(node);
    const hasManyCTAs = allButtons.length >= 5;

    // If we have navigation OR page indicators OR slide structure OR many CTAs, it's likely a carousel
    return hasNavigation || hasPageIndicators || hasSlideStructure || hasManyCTAs;
  }

  /**
   * Check for navigation controls (arrows, prev/next buttons, back/forward links)
   */
  private hasNavigationControls(node: FigmaNode): boolean {
    return this.traverseNodeTree(node, (n) => {
      const name = n.name?.toLowerCase() || '';
      const navigationKeywords = [
        'arrow', 'prev', 'next', 'previous', 'forward', 'back',
        'chevron', 'nav', 'button', 'control', 'action', 'link',
        'left', 'right', '<', '>', '←', '→', '‹', '›'
      ];
      
      // Check if name contains navigation keywords
      const hasNavKeyword = navigationKeywords.some(keyword => name.includes(keyword));
      
      // Check for common arrow/button patterns
      const isArrowShape = name.includes('arrow') || 
                          name.includes('chevron') ||
                          name.includes('caret') ||
                          !!name.match(/[<>←→‹›]/);
      
      const isNavButton = name.includes('button') && 
                         (name.includes('prev') || name.includes('next') || 
                          name.includes('back') || name.includes('forward'));
      
      const isNavLink = (name.includes('link') || name.includes('cta')) && 
                       (name.includes('prev') || name.includes('next') || 
                        name.includes('back') || name.includes('forward'));
      
      const isActionButton = name.includes('action') && name.includes('button');
      
      // Check for circular/round buttons that are typically navigation
      const isRoundButton = (name.includes('ellipse') || name.includes('circle')) && 
                           (n.type === 'ELLIPSE' || name.includes('button'));
      
      // Check for icon components commonly used for navigation
      const isNavIcon = name.includes('icon') && 
                       (name.includes('arrow') || name.includes('chevron') || 
                        name.includes('nav') || name.includes('prev') || name.includes('next'));
      
      // Check for vector shapes that look like arrows
      const isVectorArrow = (n.type === 'VECTOR' || n.type === 'BOOLEAN_OPERATION') && 
                           (name.includes('arrow') || name.includes('chevron') || 
                            name.includes('triangle'));
      
      return hasNavKeyword || isArrowShape || isNavButton || isNavLink || 
             isActionButton || isRoundButton || isNavIcon || isVectorArrow;
    });
  }

  /**
   * Check for page indicators (dots, progress indicators)
   */
  private hasPageIndicators(node: FigmaNode): boolean {
    return this.traverseNodeTree(node, (n) => {
      const name = n.name?.toLowerCase() || '';
      const indicatorKeywords = [
        'indicator', 'dot', 'dots', 'progress', 'pagination', 'pager',
        'stepper', 'counter', 'bullet', 'marker'
      ];
      
      return indicatorKeywords.some(keyword => name.includes(keyword));
    });
  }

  /**
   * Check for slide container structure
   */
  private hasSlideStructure(node: FigmaNode): boolean {
    if (!node.children) return false;

    // Look for multiple similar containers that could be slides
    const containers = node.children.filter(child => 
      child.type === 'FRAME' || child.type === 'GROUP'
    );

    if (containers.length < 2) return false;

    // Check if containers have similar content structure
    return containers.some(container => {
      const hasContent = this.hasTextChild(container);
      const hasImages = this.findAllImageNodes(container).length > 0;
      const hasButtons = this.findAllButtonNodes(container).length > 0;
      
      // A slide typically has text content and may have images/buttons
      return hasContent && (hasImages || hasButtons);
    });
  }

  /**
   * Traverse the node tree and check if any node matches the condition
   */
  private traverseNodeTree(node: FigmaNode, condition: (n: FigmaNode) => boolean): boolean {
    if (condition(node)) {
      return true;
    }
    
    if (node.children) {
      return node.children.some(child => this.traverseNodeTree(child, condition));
    }
    
    return false;
  }

  private findMainHeading(textNodes: FigmaNode[]): FigmaNode | null {
    // Find the largest text node, likely the main heading
    return textNodes.reduce((largest, node) => {
      const currentSize = node.style?.fontSize || 0;
      const largestSize = largest?.style?.fontSize || 0;
      return currentSize > largestSize ? node : largest;
    }, null as FigmaNode | null);
  }

  /**
   * Analyze container-level fields for multi-item blocks
   */
  private analyzeContainerFields(textNodes: FigmaNode[], imageNodes: FigmaNode[], buttonNodes: FigmaNode[], analysis: BlockAnalysis): BlockField[] {
    const containerFields: BlockField[] = [];
    
    // Check if this is a list-based component from code signals - if so, skip CTA analysis
    const debugAny: any = analysis.debug as any;
    const codeSignals = debugAny?.codeSignals;
    const isListBased = this.isCodeBasedListComponent(codeSignals);
    
    // UNIVERSAL EDITOR PATTERN:
    // Container heading is added as a model field for better authoring UX
    // The same heading will be extracted from the first DOM row in JavaScript
    // This dual-use allows: 1) Authors edit via UI form, 2) Published site extracts from DOM
    const mainHeading = this.findMainHeading(textNodes);
    if (mainHeading) {
      containerFields.push({
        name: 'heading',
        label: 'Container Heading',
        component: 'text',
        valueType: 'string',
        required: true,
        maxLength: 200,
        description: 'Main heading displayed above the items',
      });
    }

    // Container-level images: create a field for EACH image discovered and corresponding alt text field
    imageNodes.forEach((imgNode, index) => {
      const baseName = index === 0 ? 'image' : `image${index}`;
      containerFields.push({
        name: baseName,
        label: `Container Image ${index + 1}`,
        component: 'reference',
        valueType: 'string',
        required: false,
        description: 'Image asset extracted from Figma design',
      });
      containerFields.push({
        name: `${baseName}Alt`,
        label: `Container Image ${index + 1} Alt Text`,
        component: 'text',
        valueType: 'string',
        required: false,
        maxLength: 150,
        description: 'Alternative text for accessibility. Leave blank if decorative.',
      });
    });

    // Container-level text content (descriptive text below heading, intro paragraphs, etc.)
    const containerTextContent = this.findContainerTextContent(textNodes, mainHeading);
    if (containerTextContent.hasSimpleText) {
      containerFields.push({
        name: 'text',
        label: 'Container Text',
        component: 'text',
        valueType: 'string',
        required: false,
        maxLength: 500,
        description: 'Descriptive text displayed with the container heading',
      });
    } else if (containerTextContent.hasRichText) {
      containerFields.push({
        name: 'richText',
        label: 'Container Rich Text',
        component: 'richtext',
        valueType: 'string',
        required: false,
        maxLength: 1000,
        description: 'Rich text content with formatting, lists, or multiple paragraphs',
      });
    }

    // Container-level CTAs: only add if actual container CTAs detected AND not list-based
    const containerCTAs = (!isListBased) ? this.findContainerCTAs(buttonNodes, analysis) : [];
    if (containerCTAs.length > 0) {
      containerCTAs.forEach((cta, index) => {
        const suffix = index === 0 ? 'Primary' : 'Secondary';
        containerFields.push({
          name: `${suffix.toLowerCase()}Cta`,
          label: `${suffix} CTA`,
          component: 'text',
          valueType: 'string',
          required: false,
          description: `URL for the container ${suffix.toLowerCase()} call-to-action`,
        });
        containerFields.push({
          name: `${suffix.toLowerCase()}CtaText`,
          label: `${suffix} CTA Text`,
          component: 'text',
          valueType: 'string',
          required: false,
          maxLength: 50,
          description: `Display text for the container ${suffix.toLowerCase()} CTA`,
        });
      });
    } else {
      console.log('[DEBUG] analyzeContainerFields: No container CTAs detected; skipping CTA fields');
    }

    return containerFields;
  }

  /**
   * Find text content that belongs to the container (not repeating items)
   */
  private findContainerTextContent(textNodes: FigmaNode[], mainHeading: FigmaNode | null): {
    hasSimpleText: boolean;
    hasRichText: boolean;
  } {
    // Filter out the main heading and focus on other container text
    const otherTextNodes = textNodes.filter(node => node !== mainHeading);
    
    if (otherTextNodes.length === 0) {
      return { hasSimpleText: false, hasRichText: false };
    }

    const allText = otherTextNodes.map(n => n.characters || '').join('\n');
    
    // Check for rich text patterns (lists, multiple paragraphs, formatting)
    const hasList = /[•\-*]\s+|^\d+\.\s+/m.test(allText);
    const paragraphs = allText.split('\n').filter(line => line.trim().length > 20);
    const hasMultipleParagraphs = paragraphs.length > 1;
    const hasRichText = hasList || hasMultipleParagraphs;
    
    // Simple text (single paragraph or line)
    const hasSimpleText = !hasRichText && allText.trim().length > 0;
    
    return { hasSimpleText, hasRichText };
  }

  /**
   * Find CTAs that belong to the container level (not item-specific)
   */
  private findContainerCTAs(buttonNodes: FigmaNode[], analysis: BlockAnalysis): CTAButton[] {
    // Get CTAs from code analysis if available
    const debugAny: any = analysis.debug as any;
    const semanticCtas = debugAny?.codeSignals?.semanticCtas as { text: string; href?: string; type: 'button' | 'link' }[] | undefined;
    
    if (semanticCtas && semanticCtas.length > 0) {
      return semanticCtas.slice(0, 2).map((cta, index) => ({
        text: cta.text,
        type: (index === 0 ? 'primary' : 'secondary') as 'primary' | 'secondary',
        url: cta.href || '#',
      }));
    }

    // Fallback to button node analysis
    const containerButtons = buttonNodes.filter(button => {
      const text = this.extractButtonText(button)?.toLowerCase() || '';
      const actionKeywords = ['add', 'edit', 'remove', 'delete', 'view', 'upgrade', 'select', 'choose', 'learn more', 'subscribe', 'sign up', 'get started'];
      return actionKeywords.some(k => text.includes(k));
    });

    return containerButtons.slice(0, 2).map((button, index) => ({
      text: this.extractButtonText(button) || `CTA ${index + 1}`,
      type: (index === 0 ? 'primary' : 'secondary') as 'primary' | 'secondary',
      url: '#',
    }));
  }

  /**
   * Find CTAs that belong to repeating items (not container-level)
   */
  private findItemCTAs(node: FigmaNode, analysis?: BlockAnalysis): CTAButton[] {
    // Get CTAs from code analysis if available
    const debugAny: any = analysis?.debug as any;
    const semanticCtas = debugAny?.codeSignals?.semanticCtas as { text: string; href?: string; type: 'button' | 'link' }[] | undefined;
    
    // For item-level CTAs, look for semantic CTAs that are item-specific
    if (semanticCtas && semanticCtas.length > 0) {
      // Filter out CTAs that are clearly container-level (like global actions)
      const itemSpecificCtas = semanticCtas.filter(cta => {
        const text = cta.text.toLowerCase();
        const containerKeywords = ['view all', 'see more', 'get started', 'learn more about us', 'contact us'];
        return !containerKeywords.some(k => text.includes(k));
      });
      
      if (itemSpecificCtas.length > 0) {
        return itemSpecificCtas.slice(0, 2).map((cta, index) => ({
          text: cta.text,
          type: (index === 0 ? 'primary' : 'secondary') as 'primary' | 'secondary',
          url: cta.href || '#',
        }));
      }
    }

    // Fallback: check for buttons that appear in repeating item patterns
    const buttonNodes = this.findAllButtonNodes(node);
    const repeatingButtons = buttonNodes.filter(button => {
      const text = this.extractButtonText(button)?.toLowerCase() || '';
      const itemActionKeywords = ['select', 'choose', 'add to cart', 'buy now', 'subscribe', 'upgrade', 'view details'];
      return itemActionKeywords.some(k => text.includes(k));
    });

    return repeatingButtons.slice(0, 2).map((button, index) => ({
      text: this.extractButtonText(button) || `Item CTA ${index + 1}`,
      type: (index === 0 ? 'primary' : 'secondary') as 'primary' | 'secondary',
      url: '#',
    }));
  }

  /**
   * Detect if this is a list-based component from code signals (more accurate than Figma node analysis)
   */
  private isCodeBasedListComponent(codeSignals?: any): boolean {
    if (!codeSignals) return false;
    
    // If no semantic CTAs found from actual code, likely a list-based component
    const semanticCtas = codeSignals.semanticCtas || [];
    const hasNoCTAs = semanticCtas.length === 0;
    
    // Check if component has list-like naming patterns
    const hasListContainers = Object.keys(codeSignals.repeatedContainerNames || {}).some(name => 
      name.includes('list') || name.includes('item')
    );
    
    // Check for multiple headings without CTAs (typical feature list pattern)
    const hasMultipleHeadings = (codeSignals.distinctHeadings || []).length >= 2;
    
    return hasNoCTAs && (hasListContainers || hasMultipleHeadings);
  }

  private analyzeItemStructure(node: FigmaNode, analysis?: BlockAnalysis, itemImageNodes?: FigmaNode[]): { fields: BlockField[] } {
    // Analyze actual Figma content to extract field names from repeating items
    return this.analyzeActualContent(node, analysis, itemImageNodes);
  }

  /**
   * Analyze actual Figma content to extract field names
   */
  private analyzeActualContent(node: FigmaNode, analysis?: BlockAnalysis, imageNodesOverride?: FigmaNode[]): { fields: BlockField[] } {
    const fields: BlockField[] = [];
    const textNodes = this.findAllTextNodes(node);
    const imageNodes = imageNodesOverride ?? this.findAllImageNodes(node);

    // Find headings in repeating sections → create "heading" field
    const headings = this.findRepeatingHeadings(textNodes);
    if (headings.length > 0) {
      fields.push({
        name: 'heading',
        label: 'Heading',
        component: 'text',
        valueType: 'string',
        required: true,
        maxLength: 200,
        description: 'Heading text for this item',
      });
    }

    // Find images → create a field AND alt text field for EACH image
    if (imageNodes.length > 0) {
      imageNodes.forEach((imgNode, index) => {
        const baseName = index === 0 ? 'image' : `image${index}`;
        fields.push({
          name: baseName,
          label: `Image ${index + 1}`,
          component: 'reference',
          valueType: 'string',
          required: false,
          description: 'Image asset for this item',
        });
        fields.push({
          name: `${baseName}Alt`,
          label: `Image ${index + 1} Alt Text`,
          component: 'text',
          valueType: 'string',
          required: false,
          maxLength: 150,
          description: 'Alternative text for accessibility. Leave blank if decorative.',
        });
      });
    }

    // Find sections of text with bullets, numbers, repeated * or - characters, 
    // or multiple related paragraphs → create rich text fields
    const textContent = this.findStructuredTextContent(textNodes);
    if (textContent.hasList || textContent.hasMultipleParagraphs) {
      fields.push({
        name: 'richContent',
        label: 'Rich Content',
        component: 'richtext',
        valueType: 'string',
        required: false,
        maxLength: 1000,
        description: 'Rich text content including lists, paragraphs, and structured text',
      });
    } else if (textContent.hasSimpleText) {
      fields.push({
        name: 'simpleContent',
        label: 'Simple Content',
        component: 'text',
        valueType: 'string',
        required: false,
        maxLength: 500,
        description: 'Text content for this item',
      });
    }

    // Intelligently detect item-level CTAs (only if they actually exist)
    const itemCTAs = this.findItemCTAs(node, analysis);
    if (itemCTAs.length > 0) {
      console.log(`[DEBUG] analyzeActualContent: Found ${itemCTAs.length} item-level CTAs`);
      itemCTAs.forEach((cta, index) => {
        const suffix = index === 0 ? 'Primary' : 'Secondary';
        fields.push({
          name: `${suffix.toLowerCase()}Cta`,
          label: `${suffix} CTA`,
          component: 'text',
          valueType: 'string',
          required: false,
          description: `URL for the item ${suffix.toLowerCase()} call-to-action`,
        });
        
        fields.push({
          name: `${suffix.toLowerCase()}CtaText`,
          label: `${suffix} CTA Text`,
          component: 'text',
          valueType: 'string',
          required: false,
          maxLength: 50,
          description: `Display text for the item ${suffix.toLowerCase()} CTA`,
        });
      });
    } else {
      console.log('[DEBUG] analyzeActualContent: No item-level CTAs detected');
    }

    return { fields };
  }

  /**
   * Find headings that appear in repeating sections
   */
  private findRepeatingHeadings(textNodes: FigmaNode[]): FigmaNode[] {
    return textNodes.filter(node => {
      const text = node.characters || '';
      const fontSize = node.style?.fontSize || 0;
      const fontWeight = node.style?.fontWeight || 400;
      
      // Detect heading-like characteristics
      const isLargerText = fontSize > 14;
      const isBoldText = fontWeight >= 500;
      const isShortText = text.length < 100;
      const isNotListItem = !text.startsWith('•') && !text.startsWith('-') && !text.match(/^\d+\./);
      
      return (isLargerText || isBoldText) && isShortText && isNotListItem;
    });
  }

  // Identify item container nodes for partitioning images (Option B)
  private findItemContainerNodes(root: FigmaNode): FigmaNode[] {
    // Prefer sibling item frames heuristic; fallback to candidate item containers
    const siblingGroups = this.findSiblingItemFrames(root);
    if (siblingGroups.length >= 2) return siblingGroups;
    const candidates = this.findCandidateItemContainers(root);
    // Deduplicate and return
    const unique: FigmaNode[] = [];
    candidates.forEach(c => { if (!unique.includes(c)) unique.push(c); });
    return unique;
  }

  /**
   * Analyze text content structure to determine appropriate field types
   */
  private findStructuredTextContent(textNodes: FigmaNode[]): {
    hasList: boolean;
    hasMultipleParagraphs: boolean;
    hasSimpleText: boolean;
  } {
    const allText = textNodes.map(n => n.characters || '').join('\n');
    
    // Check for list patterns
    const hasList = /[•\-*]\s+|^\d+\.\s+/m.test(allText) || 
                    allText.split('\n').filter(line => line.trim().startsWith('•') || 
                    line.trim().startsWith('-')).length > 1;
    
    // Check for multiple paragraphs
    const paragraphs = allText.split('\n').filter(line => line.trim().length > 20);
    const hasMultipleParagraphs = paragraphs.length > 1 && !hasList;
    
    // Simple text (single line or simple content)
    const hasSimpleText = !hasList && !hasMultipleParagraphs && allText.trim().length > 0;
    
    return {
      hasList,
      hasMultipleParagraphs,
      hasSimpleText,
    };
  }

  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  private extractAllFields(textNodes: FigmaNode[], imageNodes: FigmaNode[], _buttonNodes: FigmaNode[]): BlockField[] {
    // For single blocks, create fields for all content
    const fields: BlockField[] = [];
    
    // Add text fields
    textNodes.forEach((node, index) => {
      const isHeading = node.style?.fontSize && node.style.fontSize > 24;
      fields.push({
        name: isHeading ? `heading${index || ''}` : `text${index || ''}`,
        label: isHeading ? `Heading ${index + 1}` : `Text ${index + 1}`,
        component: isHeading ? 'text' : 'richtext',
        valueType: 'string',
        required: true,
      });
    });
    
    // Add image fields (single-block) and paired alt fields
    imageNodes.forEach((node, index) => {
      const baseName = `image${index || ''}`;
      fields.push({
        name: baseName,
        label: `Image ${index + 1}`,
        component: 'reference',
        valueType: 'string',
        required: false,
      });
      fields.push({
        name: `${baseName}Alt`,
        label: `Image ${index + 1} Alt Text`,
        component: 'text',
        valueType: 'string',
        required: false,
        maxLength: 150,
        description: 'Alternative text for accessibility. Leave blank if decorative.',
      });
    });
    
    return fields;
  }

  private findConfigurationOptions(node: FigmaNode): string[] {
    // Look for common configuration patterns
    const options = ['light', 'dark'];
    
    // Check node name for variants
    if (node.name?.toLowerCase().includes('compact')) {
      options.push('compact');
    }
    
    if (node.name?.toLowerCase().includes('centered')) {
      options.push('centered');
    }
    
    return options;
  }

  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  private extractColors(_node: FigmaNode): DesignToken[] {
    // Extract color tokens from the design
    const colors = [];
    
    // Default EDS colors based on common patterns
    colors.push({
      figmaToken: 'Text/Primary',
      cssVariable: '--text-primary',
      value: '#0d0d0c',
      context: 'text' as const,
    });
    
    colors.push({
      figmaToken: 'Button/Primary',
      cssVariable: '--button-primary',
      value: '#769bcd',
      context: 'button' as const,
    });
    
    colors.push({
      figmaToken: 'Surface/White',
      cssVariable: '--surface-white',
      value: '#ffffff',
      context: 'background' as const,
    });
    
    return colors;
  }

  private extractTypography(node: FigmaNode): TypographyToken[] {
    const typography: TypographyToken[] = [];
    const textNodes = this.findAllTextNodes(node);
    
    textNodes.forEach(textNode => {
      if (textNode.style) {
        const fontSize = textNode.style.fontSize || 16;
        const lineHeight = textNode.style.lineHeightPx || Math.round(fontSize * 1.5);
        
        let cssVariable = '--body-font-size-m';
        let figmaToken = 'Typography/Body/M';
        
        if (fontSize >= 48) {
          cssVariable = '--heading-font-size-xl';
          figmaToken = 'Typography/Heading/XL';
        } else if (fontSize >= 32) {
          cssVariable = '--heading-font-size-l';
          figmaToken = 'Typography/Heading/L';
        } else if (fontSize >= 24) {
          cssVariable = '--heading-font-size-m';
          figmaToken = 'Typography/Heading/M';
        }
        
        typography.push({
          figmaToken,
          cssVariable,
          fontSize: `${fontSize}px`,
          lineHeight: `${lineHeight}px`,
          fontWeight: `${textNode.style.fontWeight || 400}`,
          fontFamily: textNode.style.fontFamily || 'Roboto',
        });
      }
    });
    
    return typography;
  }

  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  private extractSpacing(_node: FigmaNode): SpacingToken[] {
    // Extract spacing patterns
    return [
      {
        figmaToken: 'Spacing/L',
        cssVariable: '--spacing-l',
        value: '32px',
        usage: 'padding' as const,
      },
      {
        figmaToken: 'Spacing/M',
        cssVariable: '--spacing-m',
        value: '24px',
        usage: 'gap' as const,
      },
    ];
  }

  private findCTAButtons(node: FigmaNode): CTAButton[] {
    const buttons = this.findAllButtonNodes(node);
    console.log(`[DEBUG] findCTAButtons called findAllButtonNodes, got: ${buttons.length}`);
    
    // Filter out buttons that are likely not actual CTAs (e.g., service headings misclassified as buttons)
    const actualCTAButtons = buttons.filter(button => {
      const text = this.extractButtonText(button)?.toLowerCase() || '';
      const actionKeywords = ['add', 'edit', 'remove', 'delete', 'view', 'upgrade', 'select', 'choose', 'learn more', 'subscribe', 'sign up', 'get started', 'start', 'continue', 'next', 'submit'];
      
      // Only include if it has clear action keywords or explicitly button-like text
      return actionKeywords.some(k => text.includes(k)) || 
             text.includes('button') || 
             text.includes('cta') ||
             text.includes('click');
    });
    
    const ctaButtons = actualCTAButtons.map((button, index) => ({
      text: this.extractButtonText(button) || `CTA ${index + 1}`,
      type: (index === 0 ? 'primary' : 'secondary') as 'primary' | 'secondary',
      url: '#',
    }));
    
    console.log(`[DEBUG] findCTAButtons returning: ${ctaButtons.length} CTAs after filtering`);
    return ctaButtons;
  }

  /**
   * Alternative button detection method that looks for any node with button-like text
   */
  private findButtonsAlternativeMethod(node: FigmaNode): FigmaNode[] {
    const buttonNodes: FigmaNode[] = [];
    
    const traverse = (n: FigmaNode) => {
      // Look for any frame/group that contains button-like text
      if (n.type === 'FRAME' || n.type === 'GROUP' || n.type === 'COMPONENT') {
        const hasButtonLikeText = this.containsButtonLikeText(n);
        if (hasButtonLikeText) {
          buttonNodes.push(n);
        }
      }
      
      if (n.children) {
        n.children.forEach(traverse);
      }
    };
    
    traverse(node);
    return buttonNodes;
  }

  /**
   * Check if a node contains button-like text content
   */
  private containsButtonLikeText(node: FigmaNode): boolean {
    const textNodes = this.findAllTextNodes(node);
    const actionKeywords = ['add','edit','remove','delete','view','upgrade','select','choose','learn more','subscribe','sign up'];
    return textNodes.some(textNode => {
      if (!textNode.characters) return false;
      const text = textNode.characters.toLowerCase();
      // Exclude pure service headings
      const buttonTexts = ['button','cta','click'];
      return actionKeywords.some(k => text.includes(k)) || buttonTexts.some(bt => text.includes(bt));
    });
  }

  private extractButtonText(node: FigmaNode): string | null {
    const textNodes = this.findAllTextNodes(node);
    return textNodes[0]?.characters || null;
  }

  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  private findLinks(_node: FigmaNode): InteractionLink[] {
    // Find links that aren't buttons
    return [];
  }

  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  private findHoverStates(_node: FigmaNode): HoverState[] {
    // Analyze hover states if available
    return [];
  }

  private determineHeadingHierarchy(node: FigmaNode): string[] {
    const textNodes = this.findAllTextNodes(node);
    const headings = textNodes
      .filter(n => n.style?.fontSize && n.style.fontSize > 24)
      .sort((a, b) => (b.style?.fontSize || 0) - (a.style?.fontSize || 0))
      .map((n, index) => `h${index + 1}`);
      
    return headings.slice(0, 6); // Max 6 heading levels
  }

  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  private checkColorContrast(_node: FigmaNode): { valid: boolean; ratio?: number } {
    // Simplified color contrast check
    return { valid: true };
  }

  /**
   * Analyzes screenshot to detect visual patterns using AI vision capabilities
   * This helps identify card grids, content hierarchy, and field requirements
   * that may not be obvious from code analysis alone
   */
  private async analyzeVisualPatterns(screenshot: string): Promise<VisualPatterns | null> {
    try {
      console.log('[DEBUG] Starting AI vision analysis from screenshot...');
      
      // Parse screenshot data
      const isBase64 = screenshot.startsWith('data:image');
      const imageData = isBase64 ? screenshot : `data:image/png;base64,${screenshot}`;
      
      // Use AI vision to analyze the screenshot
      const analysis = await this.performAIVisualAnalysis(imageData);
      
      console.log('[DEBUG] AI vision analysis complete:', analysis);
      return analysis;
      
    } catch (error) {
      console.warn('[WARN] AI vision analysis failed, falling back to heuristics:', error);
      // Fallback to heuristic analysis if AI vision fails
      return this.performHeuristicVisualAnalysis(screenshot);
    }
  }

  /**
   * Use AI vision to analyze screenshot and detect UI patterns
   * Uses GitHub Models API with GPT-4o vision capabilities
   */
  private async performAIVisualAnalysis(imageData: string): Promise<VisualPatterns> {
    console.log('[DEBUG] Using GitHub Models API for AI vision analysis...');
    
    const prompt = `Analyze this UI design screenshot and provide detailed information about its structure:

1. **Layout Type**: Is this a carousel/slider (horizontal scrolling with navigation), a card grid (static 2D layout), a list, or another pattern?

2. **Navigation Elements**: 
   - Are there arrow buttons, chevrons, or prev/next controls visible?
   - Are there pagination dots or slide indicators?
   - Describe any navigation UI elements you see

3. **Item Count**: How many distinct cards, items, or sections are visible?

4. **Content Structure per Item**:
   - Does each item have an image or logo at the top?
   - What type of image: photo, logo, or icon?
   - Is there a heading/title in each item?
   - Is there descriptive text or body content?
   - Are there call-to-action buttons or links in each item?
   - What do the CTAs say? (e.g., "Download PDF", "Visit website", "Learn More")

5. **Container-Level Content**:
   - Is there a section heading above all the items?
   - Is there intro text before the items?

Return ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "layoutType": "carousel" | "card-grid" | "list" | "hero",
  "hasNavigationIndicators": boolean,
  "navigationDescription": "description of arrows/buttons/dots",
  "itemCount": number,
  "hasContainerHeading": boolean,
  "itemStructure": {
    "hasImage": boolean,
    "imageType": "photo" | "logo" | "icon",
    "hasHeading": boolean,
    "hasDescription": boolean,
    "hasCta": boolean,
    "ctaType": "download" | "link" | "button",
    "ctaText": "example CTA text"
  }
}`;

    try {
      // Parse image data - remove data URL prefix if present
      const base64Data = imageData.includes(',') 
        ? imageData.split(',')[1] 
        : imageData;
      
      // GitHub Models API endpoint
      const apiUrl = 'https://models.inference.ai.azure.com/chat/completions';
      const githubToken = process.env.GITHUB_TOKEN;
      
      if (!githubToken) {
        throw new Error('GITHUB_TOKEN environment variable not set');
      }
      
      console.log('[DEBUG] Calling GitHub Models API with GPT-4o...');
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${githubToken}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: prompt,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/png;base64,${base64Data}`,
                  },
                },
              ],
            },
          ],
          max_tokens: 1000,
          temperature: 0.1, // Low temperature for consistent structured output
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GitHub Models API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      const content = result.choices?.[0]?.message?.content;
      
      if (!content) {
        throw new Error('No content in GitHub Models API response');
      }

      console.log('[DEBUG] GitHub Models API response:', content);

      // Parse the JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in API response');
      }

      const visionAnalysis = JSON.parse(jsonMatch[0]);
      
      // Convert to VisualPatterns format
      return this.convertVisionAnalysisToPatterns(visionAnalysis);
      
    } catch (error) {
      console.warn('[WARN] GitHub Models AI vision analysis failed:', error);
      console.log('[INFO] Falling back to heuristic analysis...');
      throw error; // Will trigger fallback to heuristics
    }
  }

  /**
   * Convert LLM vision analysis response to VisualPatterns format
   */
  private convertVisionAnalysisToPatterns(analysis: any): VisualPatterns {
    const isCarousel = analysis.layoutType === 'carousel';
    const isMultiItem = analysis.itemCount > 1;
    
    // Generate field suggestions based on the analysis
    const suggestedFields: FieldSuggestion[] = [];
    
    if (analysis.itemStructure.hasImage) {
      const imageLabel = isCarousel ? 'Slide Image' : 
                        analysis.itemStructure.imageType === 'logo' ? 'Organization Logo' : 
                        'Card Image';
      suggestedFields.push({
        name: 'image',
        component: 'reference',
        label: imageLabel,
        confidence: 'high',
      });
      suggestedFields.push({
        name: 'imageAlt',
        component: 'text',
        label: 'Image Alt Text',
        confidence: 'high',
      });
    }
    
    if (analysis.itemStructure.hasHeading) {
      const headingLabel = isCarousel ? 'Slide Heading' : 'Card Heading';
      suggestedFields.push({
        name: isCarousel ? 'slideHeading' : 'cardHeading',
        component: 'text',
        label: headingLabel,
        confidence: 'high',
      });
    }
    
    if (analysis.itemStructure.hasDescription) {
      const descLabel = isCarousel ? 'Slide Description' : 'Card Description';
      suggestedFields.push({
        name: isCarousel ? 'slideDescription' : 'cardDescription',
        component: 'richtext',
        label: descLabel,
        confidence: 'high',
      });
    }
    
    if (analysis.itemStructure.hasCta) {
      suggestedFields.push({
        name: 'cta',
        component: 'text',
        label: isCarousel ? 'Slide Link URL' : 'Button URL',
        confidence: 'high',
      });
      
      if (analysis.itemStructure.ctaText) {
        suggestedFields.push({
          name: 'ctaText',
          component: 'text',
          label: analysis.itemStructure.ctaText.toLowerCase().includes('download') ? 
                 'Download Button Text' : 'Button Text',
          confidence: 'high',
        });
      }
    }
    
    return {
      isMultiItem,
      itemCount: analysis.itemCount,
      confidence: 'high',
      layoutType: analysis.layoutType,
      hasContainerHeading: analysis.hasContainerHeading,
      hasNavigationIndicators: analysis.hasNavigationIndicators,
      itemStructure: analysis.itemStructure,
      suggestedFields,
    };
  }

  /**
   * Heuristic-based visual pattern detection
   * In production, replace with AI vision model analysis
   * 
   * This method should analyze the screenshot to detect:
   * - Layout patterns (grid, horizontal scroll, carousel, etc.)
   * - Navigation indicators (dots, arrows, prev/next buttons)
   * - Content arrangement (overlapping cards = carousel, equal spacing = grid)
   * - Visual cues (partial visibility of next item = carousel)
   */
  private performHeuristicVisualAnalysis(screenshot: string): VisualPatterns {
    console.log('[DEBUG] Using heuristic visual analysis (placeholder for AI vision)');
    
    // In production, this would call an AI vision model with a prompt like:
    // "Analyze this UI design. Is it a carousel (horizontal scrolling with navigation),
    //  a card grid (static 2D layout), or a list? Count visible items. Identify
    //  navigation elements (arrows, dots). Describe each item's content structure."
    
    // For now, provide intelligent defaults that can be overridden by code signals
    // The actual implementation would analyze the screenshot data
    const screenshotLower = screenshot.toLowerCase();
    
    // Enhanced carousel detection with multiple indicators
    const carouselKeywords = [
      'carousel', 'slider', 'swiper', 'slideshow',
      'arrow', 'chevron', 'prev', 'next', 'previous', 'forward', 'back',
      'navigation', 'nav-button', 'nav-arrow', 'slide-nav',
      'dots', 'indicator', 'pagination', 'stepper'
    ];
    
    const hasCarouselKeywords = carouselKeywords.some(keyword => 
      screenshotLower.includes(keyword)
    );
    
    // Check for specific navigation patterns
    const hasArrows = screenshotLower.includes('arrow') || 
                     screenshotLower.includes('chevron') ||
                     screenshotLower.includes('<') || 
                     screenshotLower.includes('>');
    
    const hasNavButtons = screenshotLower.includes('prev') || 
                         screenshotLower.includes('next') ||
                         screenshotLower.includes('back') ||
                         screenshotLower.includes('forward');
    
    const hasIndicators = screenshotLower.includes('dot') || 
                         screenshotLower.includes('indicator') ||
                         screenshotLower.includes('pagination');
    
    // Determine if this is likely a carousel
    const isLikelyCarousel = hasCarouselKeywords || hasArrows || hasNavButtons || hasIndicators;
    
    console.log('[DEBUG] Carousel detection signals:', {
      hasCarouselKeywords,
      hasArrows,
      hasNavButtons,
      hasIndicators,
      isLikelyCarousel
    });
    
    if (isLikelyCarousel) {
      return this.generateCarouselPatterns();
    }
    
    // Default to card grid pattern
    return this.generateCardGridPatterns();
  }

  /**
   * Generate visual patterns for carousel/slider layouts
   */
  private generateCarouselPatterns(): VisualPatterns {
    console.log('[DEBUG] Detected carousel pattern from visual analysis');
    return {
      isMultiItem: true,
      itemCount: 4, // Typical carousel has multiple slides
      confidence: 'high',
      layoutType: 'carousel',
      hasContainerHeading: true, // Carousels often have section headings
      hasNavigationIndicators: true, // Carousels typically have dots/arrows
      itemStructure: {
        hasImage: true,
        imageType: 'photo',
        hasHeading: true,
        hasDescription: true,
        hasCta: true,
        ctaType: 'link',
      },
      suggestedFields: [
        {
          name: 'image',
          component: 'reference',
          label: 'Slide Image',
          confidence: 'high',
        },
        {
          name: 'imageAlt',
          component: 'text',
          label: 'Image Alt Text',
          confidence: 'high',
        },
        {
          name: 'slideHeading',
          component: 'text',
          label: 'Slide Heading',
          confidence: 'high',
        },
        {
          name: 'slideDescription',
          component: 'richtext',
          label: 'Slide Description',
          confidence: 'high',
        },
        {
          name: 'cta',
          component: 'text',
          label: 'Slide Link URL',
          confidence: 'high',
        },
        {
          name: 'ctaText',
          component: 'text',
          label: 'Link Text',
          confidence: 'medium',
        },
      ],
    };
  }

  /**
   * Generate visual patterns for card grid layouts
   */
  private generateCardGridPatterns(): VisualPatterns {
    console.log('[DEBUG] Detected card grid pattern from visual analysis');
    return {
      isMultiItem: true,
      itemCount: 3,
      confidence: 'medium',
      layoutType: 'card-grid',
      hasContainerHeading: false,
      hasNavigationIndicators: false,
      itemStructure: {
        hasImage: true,
        imageType: 'photo',
        hasHeading: true,
        hasDescription: true,
        hasCta: true,
        ctaType: 'button',
      },
      suggestedFields: [
        {
          name: 'image',
          component: 'reference',
          label: 'Card Image',
          confidence: 'high',
        },
        {
          name: 'cardHeading',
          component: 'text',
          label: 'Card Heading',
          confidence: 'high',
        },
        {
          name: 'cardDescription',
          component: 'richtext',
          label: 'Card Description',
          confidence: 'high',
        },
        {
          name: 'cta',
          component: 'text',
          label: 'Button URL',
          confidence: 'high',
        },
        {
          name: 'ctaText',
          component: 'text',
          label: 'Button Text',
          confidence: 'high',
        },
      ],
    };
  }

  /**
   * Merges visual field suggestions with code-detected fields
   * Visual suggestions fill gaps where code analysis missed content
   */
  private mergeFieldSuggestions(
    codeFields: BlockField[],
    visualSuggestions: FieldSuggestion[]
  ): BlockField[] {
    const merged = [...codeFields];
    
    for (const suggestion of visualSuggestions) {
      // Only add if not already detected by code
      const exists = merged.some(f => 
        f.name === suggestion.name || 
        f.label.toLowerCase().includes(suggestion.label.toLowerCase())
      );
      
      if (!exists && suggestion.confidence === 'high') {
        console.log('[DEBUG] Adding visual-suggested field:', suggestion.name);
        merged.push({
          name: suggestion.name,
          label: suggestion.label,
          component: suggestion.component,
          valueType: 'string',
          required: false,
          description: `Field detected from visual analysis`,
        });
      }
    }
    
    return merged;
  }
}