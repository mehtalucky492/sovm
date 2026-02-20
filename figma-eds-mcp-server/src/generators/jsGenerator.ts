import { BlockAnalysis } from '../types.js';
import { BlockField } from '../interfaces.js';

export class JSGenerator {

  /**
   * Generate JavaScript for a block based on analysis
   */
  async generate(analysis: BlockAnalysis, measurements?: any): Promise<string> {
    const js = this.createJavaScript(analysis, measurements);
    return js;
  }

  /**
   * Convert string to PascalCase
   */
  private toPascalCase(str: string): string {
    return str.replace(/(?:^|-)([a-z])/g, (_, char) => char.toUpperCase());
  }

  private createJavaScript(analysis: BlockAnalysis, measurements?: any): string {
    const sections = [];

    // Imports
    sections.push(this.generateImports());

    // Helper functions
    sections.push(this.generateHelperFunctions(analysis));

    // Main decorate function
    sections.push(this.generateDecorateFunction(analysis, measurements));

    return sections.join('\n\n');
  }

  private generateImports(): string {
    return `import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';`;
  }

  private generateHelperFunctions(analysis: BlockAnalysis): string {
    const functions = [];

    // Only include configuration helper for simple blocks (not multi-item)
    if (analysis.blockType !== 'multi-item') {
      functions.push(`/**
 * Helper function to identify configuration values
 */
function isConfigurationValue(text) {
  const configValues = ['dark', 'light', 'centered', 'compact', 'large', 'small'];
  return configValues.includes(text.toLowerCase());
}`);
    }

    return functions.join('\n\n');
  }

  private generateDecorateFunction(analysis: BlockAnalysis, measurements?: any): string {
    if (analysis.blockType === 'multi-item') {
      // Choose generation pattern based on jsPattern in contentStructure
      const jsPattern = analysis.contentStructure.jsPattern || 'cards'; // Default to cards pattern
      if (jsPattern === 'carousel') {
        return this.generateCarouselPatternFunction(analysis, measurements);
      } else if (jsPattern === 'cards') {
        return this.generateCardsPatternFunction(analysis, measurements);
      } else {
        return this.generateDecoratedPatternFunction(analysis, measurements);
      }
    } else {
      return this.generateSingleItemDecorateFunction(analysis, measurements);
    }
  }

  /**
   * Generate decorated pattern for multi-item blocks (filters rows, uses decorateItem)
   * Best for blocks with richtext/bullet lists
   */
  private generateDecoratedPatternFunction(analysis: BlockAnalysis, measurements?: any): string {
    const blockName = analysis.blockName;
    const containerFields = analysis.contentStructure.containerFields;
    const itemFields = analysis.contentStructure.itemFields || [];
    
    // Get Figma image dimensions for breakpoints
    const imageHeight = measurements?.imageHeight ? parseInt(measurements.imageHeight) : null;
    
    // Generate container field detection logic
    const containerFieldsCode = containerFields.map(field => {
      if (field.component === 'reference') {
        return `    // Handle container ${field.name} - single cell with image
    if (cells.length === 1 && img && img.src && !container${this.toPascalCase(field.name)}) {
      container${this.toPascalCase(field.name)} = createOptimizedPicture(img.src, img.alt || '', false, [{ width: '${imageHeight || 750}' }]);
      container${this.toPascalCase(field.name)}.className = '${field.name}';
      row.remove();
      return;
    }`;
      } else {
        const maxLength = field.maxLength || 200;
        return `    // Handle container ${field.name} - single cell with text, no image/link
    if (cells.length === 1 && firstCellText && !img && !link && !container${this.toPascalCase(field.name)}
        && firstCellText.length < ${maxLength}) { // Match model maxLength
      container${this.toPascalCase(field.name)} = firstCellText;
      row.remove();
      return;
    }`;
      }
    }).join('\n\n');

    // Generate container variables
    const containerVars = containerFields.map(field => 
      `  let container${this.toPascalCase(field.name)} = ${field.component === 'reference' ? 'null' : "''"};\n`
    ).join('');

    // Generate container structure building
    const buildContainerCode = containerFields.length > 0 ? `
  // Build container structure
  if (${containerFields.map(field => `container${this.toPascalCase(field.name)}`).join(' || ')}) {
    const containerElement = document.createElement('div');
    containerElement.className = 'container-content';

${containerFields.map(field => {
  if (field.component === 'reference') {
    return `    if (container${this.toPascalCase(field.name)}) {
      containerElement.appendChild(container${this.toPascalCase(field.name)});
    }`;
  } else {
    return `    if (container${this.toPascalCase(field.name)}) {
      const ${field.name}Element = document.createElement('${field.name === 'heading' ? 'h2' : 'p'}');
      ${field.name}Element.className = '${field.name}';
      ${field.name}Element.textContent = container${this.toPascalCase(field.name)};
      containerElement.appendChild(${field.name}Element);
    }`;
  }
}).join('\n\n')}

    block.appendChild(containerElement);
  }` : '';

    return `/**
 * Decorates a ${blockName} item
 * @param {Element} item The item element from Universal Editor
 */
function decorateItem(item) {
  const cells = [...item.children];
  if (cells.length < ${Math.max(2, itemFields.length)}) return;

${itemFields.map((field, index) => `  const ${field.name}Cell = cells[${index}];`).join('\n')}

${itemFields.map(field => {
  if (field.component === 'text') {
    return `  // Extract ${field.name}
  const ${field.name}Text = ${field.name}Cell.textContent.trim();`;
  } else if (field.component === 'richtext') {
    return `  // Extract ${field.name} content
  const ${field.name}Element = ${field.name}Cell.querySelector('ul, ol') || ${field.name}Cell;
  const ${field.name}Items = [];
  
  if (${field.name}Element.tagName === 'UL' || ${field.name}Element.tagName === 'OL') {
    const liElements = ${field.name}Element.querySelectorAll('li');
    liElements.forEach((li) => {
      const itemText = li.textContent.trim();
      if (itemText) ${field.name}Items.push(itemText);
    });
  } else {
    const textContent = ${field.name}Element.textContent.trim();
    if (textContent.includes('•')) {
      const bulletItems = textContent.split('•').map((bulletItem) => bulletItem.trim()).filter((bulletItem) => bulletItem);
      ${field.name}Items.push(...bulletItems);
    } else if (textContent.includes('\\n')) {
      const lineItems = textContent.split('\\n').map((lineItem) => lineItem.trim()).filter((lineItem) => lineItem);
      ${field.name}Items.push(...lineItems);
    } else if (textContent) {
      ${field.name}Items.push(textContent);
    }
  }`;
  } else if (field.component === 'reference') {
    return `  // Extract ${field.name}
  const ${field.name}Img = ${field.name}Cell.querySelector('img');
  let ${field.name}Picture = null;
  if (${field.name}Img && ${field.name}Img.src) {
    ${field.name}Picture = createOptimizedPicture(${field.name}Img.src, ${field.name}Img.alt || '', false, [{ width: '${imageHeight || 750}' }]);
  }`;
  } else {
    return `  // Extract ${field.name}
  const ${field.name}Content = ${field.name}Cell.innerHTML.trim();`;
  }
}).join('\n\n')}

  // Create the decorated structure
  item.innerHTML = '';
  item.className = '${blockName}-item';

${itemFields.map((field, index) => {
  if (field.component === 'text') {
    const elementTag = field.name === 'heading' ? 'h3' : field.name === 'subheading' ? 'h4' : 'p';
    return `  // Create ${field.name} element (with empty state placeholder)
  const ${field.name}Element = document.createElement('${elementTag}');
  ${field.name}Element.className = '${field.name}';
  if (${field.name}Text) {
    ${field.name}Element.textContent = ${field.name}Text;
  } else {
    ${field.name}Element.setAttribute('data-placeholder', 'Add ${field.label || field.name}...');
  }
  moveInstrumentation(${field.name}Cell, ${field.name}Element);
  item.appendChild(${field.name}Element);`;
  } else if (field.component === 'richtext') {
    return `  // Create ${field.name} list
  if (${field.name}Items.length > 0) {
    const ${field.name}Container = document.createElement('ul');
    ${field.name}Container.className = '${field.name}';

    ${field.name}Items.forEach((itemText) => {
      const listItem = document.createElement('li');
      listItem.textContent = itemText;
      ${field.name}Container.appendChild(listItem);
    });

    // Preserve UE instrumentation on ${field.name}
    moveInstrumentation(${field.name}Cell, ${field.name}Container);
    item.appendChild(${field.name}Container);
  }`;
  } else if (field.component === 'reference') {
    return `  // Add ${field.name} image (with empty state placeholder)
  if (${field.name}Picture) {
    ${field.name}Picture.className = '${field.name}';
    moveInstrumentation(${field.name}Cell, ${field.name}Picture);
    item.appendChild(${field.name}Picture);
  } else {
    const ${field.name}Placeholder = document.createElement('div');
    ${field.name}Placeholder.className = '${field.name}';
    ${field.name}Placeholder.setAttribute('data-placeholder', 'Add ${field.label || field.name}...');
    moveInstrumentation(${field.name}Cell, ${field.name}Placeholder);
    item.appendChild(${field.name}Placeholder);
  }`;
  } else {
    return `  // Add ${field.name} content
  if (${field.name}Content) {
    const ${field.name}Element = document.createElement('div');
    ${field.name}Element.className = '${field.name}';
    ${field.name}Element.innerHTML = ${field.name}Content;
    
    // Preserve UE instrumentation on ${field.name}
    moveInstrumentation(${field.name}Cell, ${field.name}Element);
    item.appendChild(${field.name}Element);
  }`;
  }
}).join('\n\n')}
}

/**
 * Decorates the ${blockName} block
 * @param {Element} block The ${blockName} block element
 */
export default function decorate(block) {
  const rows = [...block.children];
${containerVars}  const items = [];

  // First pass: identify container fields and items
  rows.forEach((row) => {
    const cells = [...row.children];
    if (!cells.length) return;

    const firstCell = cells[0];
    const firstCellText = firstCell.textContent.trim();
    const img = firstCell.querySelector('img');
    const link = firstCell.querySelector('a');

    // Handle configuration values (variants)
    if (isConfigurationValue(firstCellText)) {
      block.classList.add(firstCellText.toLowerCase());
      row.remove();
      return;
    }

${containerFieldsCode}

    // Handle CTA/button links - single cell with link
    if (cells.length === 1 && link) {
      // Skip CTAs for now - not in current model
      row.remove();
      return;
    }

    // Handle items - ${itemFields.length} cells: ${itemFields.map(f => f.name).join(' + ')}
    if (cells.length === ${itemFields.length}) {
      // This is a ${blockName}-item - keep it for UE editing
      // Even if empty, we want to show it with placeholders
      items.push(row);
      return;
    }

    // Handle empty or invalid rows
    if (cells.length === 1 && !firstCellText && !img && !link) {
      // Empty row - remove
      row.remove();
      return;
    }

    // Remove unrecognized rows
    row.remove();
  });
${buildContainerCode}

  // Create items container
  if (items.length > 0) {
    const itemsContainer = document.createElement('div');
    itemsContainer.className = '${blockName}-container';

    // Decorate each item and move to container
    items.forEach((item) => {
      decorateItem(item);
      itemsContainer.appendChild(item);
    });

    block.appendChild(itemsContainer);
  } else {
    // Add empty state for Universal Editor
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.setAttribute('data-placeholder', 'Add ${blockName} items...');
    block.appendChild(emptyState);
  }
}`;
  }

  /**
   * Generate cards pattern for multi-item blocks (ul/li, every row becomes an item)
   * Best for simple card structures without richtext fields
   * Matches the pattern used in blocks/cards/cards.js
   */
  private generateCardsPatternFunction(analysis: BlockAnalysis, measurements?: any): string {
    const blockName = analysis.blockName;
    const containerFields = analysis.contentStructure.containerFields;
    const itemFields = analysis.contentStructure.itemFields || [];
    
    // Get Figma image dimensions for breakpoints
    const imageHeight = measurements?.imageHeight ? parseInt(measurements.imageHeight) : null;

    // Generate extractCardData function
    const extractDataFields = itemFields.map((field, index) => {
      if (field.component === 'reference') {
        return `  if (cells[${index}]) {
    const img = cells[${index}].querySelector('img');
    if (img && img.src) {
      cardData.${field.name} = img;
      cardData.${field.name}Alt = img.alt || '';
    }
  }`;
      } else {
        return `  if (cells[${index}]) {
    const ${field.name}Content = cells[${index}].innerHTML.trim();
    if (${field.name}Content) {
      cardData.${field.name} = ${field.name}Content;
    }
  }`;
      }
    }).join('\n  \n');

    // Generate createCardElement function content
    const cardElementFields = itemFields.map((field) => {
      if (field.component === 'reference') {
        return `  // Create ${field.name} container
  const ${field.name}Container = document.createElement('div');
  ${field.name}Container.className = '${blockName.replace(/-/g, '-')}-${field.name}';

  if (cardData.${field.name}) {
    // Create optimized picture element
    // Use imageHeight from Figma, or 48px for small icons (≤50px), or 750px default
    const imageWidth = ${imageHeight && parseInt(String(imageHeight)) <= 50 ? "'48'" : `'${imageHeight || 750}'`};
    const optimizedPic = createOptimizedPicture(
      cardData.${field.name}.src,
      cardData.${field.name}Alt || cardData.heading || '${field.label || field.name}',
      false,
      [{ width: imageWidth }]
    );
    ${field.name}Container.appendChild(optimizedPic);
  }`;
      } else if (field.component === 'text') {
        const elementTag = field.name === 'heading' ? 'h4' : field.name === 'subheading' ? 'h5' : 'p';
        return `  // Create ${field.name} element
  const ${field.name}Element = document.createElement('${elementTag}');
  if (cardData.${field.name}) {
    ${field.name}Element.innerHTML = cardData.${field.name};
  }`;
      } else {
        return `  // Create ${field.name} element
  const ${field.name}Element = document.createElement('div');
  if (cardData.${field.name}) {
    ${field.name}Element.innerHTML = cardData.${field.name};
  }`;
      }
    }).join('\n\n');

    // Organize fields into image/icon and text containers
    const imageFields = itemFields.filter(f => f.component === 'reference');
    const textFields = itemFields.filter(f => f.component !== 'reference');

    const appendImageFields = imageFields.map(field => 
      `  if (${field.name}Container && cardData.${field.name}) {
    cardContainer.appendChild(${field.name}Container);
  }`
    ).join('\n');

    const appendTextFields = textFields.map(field => 
      `  if (${field.name}Element && cardData.${field.name}) {
    textContainer.appendChild(${field.name}Element);
  }`
    ).join('\n');

    return `// Extract card data from a table row - follows model field order
function extractCardData(element, row) {
  const cardData = {
${itemFields.map(field => {
      // Don't auto-add Alt field if it already exists as a separate field
      const hasExplicitAltField = itemFields.some(f => f.name === `${field.name}Alt`);
      return `    ${field.name}: ${field.component === 'reference' ? 'null' : "''"},${field.component === 'reference' && !hasExplicitAltField ? `\n    ${field.name}Alt: '',` : ''}`;
    }).join('\n')}
  };

  const cells = [...row.children];

  // Process cells in order to match JSON model field sequence
  // Model order: ${itemFields.map(f => f.name).join(', ')}
${extractDataFields}

  return cardData;
}

// Create a card element
function createCardElement(cardData, index, originalRow = null) {
  const cardContainer = document.createElement('div');
  cardContainer.className = '${blockName.replace(/-/g, '-')}-card';

  // Move Universal Editor instrumentation to preserve editing capabilities
  if (originalRow) {
    moveInstrumentation(originalRow, cardContainer);
  }

${cardElementFields}

${textFields.length > 0 ? `  // Create text container
  const textContainer = document.createElement('div');
  textContainer.className = '${blockName.replace(/-/g, '-')}-card-text';

${appendTextFields}

${appendImageFields}
  cardContainer.appendChild(textContainer);` : appendImageFields}

  return cardContainer;
}

/**
 * Decorates the ${blockName} block
 * @param {Element} block The ${blockName} block element
 */
export default async function decorate(block) {
  const rows = [...block.children];
  const container = document.createElement('div');
  container.className = '${blockName}-container';
${containerFields.length > 0 ? `
  // Container field variables
${containerFields.map(field => `  let container${this.toPascalCase(field.name)} = ${field.component === 'reference' ? 'null' : "''"};`).join('\n')}

  // Extract container fields first
  rows.forEach((row) => {
    const cells = [...row.children];
    const firstCell = cells[0];
    const firstCellText = firstCell?.textContent?.trim();
    const img = firstCell?.querySelector('img');
    const link = firstCell?.querySelector('a');

${containerFields.map(field => {
  const maxLength = field.maxLength || 200;
  const pascalName = this.toPascalCase(field.name);
  
  if (field.component === 'reference') {
    return `    // Handle container ${field.name} - single cell with image
    if (cells.length === 1 && img && img.src && !container${pascalName}) {
      container${pascalName} = createOptimizedPicture(img.src, img.alt || '', false, [{ width: '750' }]);
      container${pascalName}.className = '${field.name}';
      row.remove();
      return;
    }`;
  } else {
    return `    // Handle container ${field.name} - single cell with text, no image/link
    if (cells.length === 1 && firstCellText && !img && !link && !container${pascalName}
        && firstCellText.length < ${maxLength}) {
      container${pascalName} = firstCellText;
      row.remove();
      return;
    }`;
  }
}).join('\n\n')}
  });

  // Build container header structure
  if (${containerFields.map(f => `container${this.toPascalCase(f.name)}`).join(' || ')}) {
    const containerElement = document.createElement('div');
    containerElement.className = '${blockName}-header';

${containerFields.map(field => {
  const pascalName = this.toPascalCase(field.name);
  if (field.component === 'reference') {
    return `    if (container${pascalName}) {
      containerElement.appendChild(container${pascalName});
    }`;
  } else {
    return `    if (container${pascalName}) {
      const ${field.name}Element = document.createElement('${field.name === 'heading' ? 'h2' : 'p'}');
      ${field.name}Element.className = '${field.name}';
      ${field.name}Element.textContent = container${pascalName};
      containerElement.appendChild(${field.name}Element);
    }`;
  }
}).join('\n\n')}

    container.appendChild(containerElement);
  }
` : ''}
  // Create content container
  const content = document.createElement('div');
  content.className = '${blockName}-content';

  // Process remaining rows as child items (skip removed container rows)
  rows.forEach((row, index) => {
    // Skip rows that were removed during container extraction
    if (!row.parentElement) return;
    
    const itemData = extractCardData(row, row);
    const itemElement = createCardElement(itemData, index, row);
    content.appendChild(itemElement);
  });

  container.appendChild(content);
  
  // Clear original content and add the new container
  block.innerHTML = '';
  block.appendChild(container);
}`;
  }

  /**
   * Generate carousel pattern function (ul/li with navigation and active slide management)
   * Based on the carousel block pattern from the codebase
   */
  private generateCarouselPatternFunction(analysis: BlockAnalysis, measurements?: any): string {
    const blockName = analysis.blockName;
    const itemFields = analysis.contentStructure.itemFields || [];

    // Find image, text, and link fields
    const imageField = itemFields.find(f => f.component === 'reference');
    const textFields = itemFields.filter(f => f.component === 'text' || f.component === 'richtext');
    const linkField = itemFields.find(f => f.name.toLowerCase().includes('url') || f.name.toLowerCase().includes('link'));

    return `// Update active slide styling and accessibility
function updateActiveSlide(slide) {
  const block = slide.closest('.${blockName}');
  const slideIndex = parseInt(slide.dataset.slideIndex, 10);
  block.dataset.activeSlide = slideIndex;

  const slides = block.querySelectorAll('.${blockName}-slide');

  slides.forEach((aSlide, idx) => {
    if (idx === slideIndex) {
      aSlide.classList.add('active');
      aSlide.setAttribute('aria-hidden', 'false');
    } else {
      aSlide.classList.remove('active');
      aSlide.setAttribute('aria-hidden', 'true');
    }

    aSlide.querySelectorAll('a').forEach((link) => {
      if (idx !== slideIndex) {
        link.setAttribute('tabindex', '-1');
      } else {
        link.removeAttribute('tabindex');
      }
    });
  });
}

export function showSlide(block, slideIndex = 0) {
  const slides = block.querySelectorAll('.${blockName}-slide');
  if (!slides.length) return;

  let realSlideIndex = slideIndex < 0 ? slides.length - 1 : slideIndex;
  if (slideIndex >= slides.length) realSlideIndex = 0;
  const activeSlide = slides[realSlideIndex];

  if (!activeSlide) return;

  updateActiveSlide(activeSlide);

  const slidesContainer = block.querySelector('.${blockName}-slides');
  if (!slidesContainer) return;

  const containerWidth = slidesContainer.clientWidth;
  const slideWidth = activeSlide.offsetWidth;
  const scrollLeft = activeSlide.offsetLeft - (containerWidth / 2) + (slideWidth / 2);

  slidesContainer.scrollTo({
    top: 0,
    left: Math.max(0, scrollLeft),
    behavior: 'smooth',
  });
}

function bindEvents(block) {
  const prevButton = block.querySelector('.slide-prev');
  const nextButton = block.querySelector('.slide-next');

  if (prevButton) {
    prevButton.addEventListener('click', () => {
      showSlide(block, parseInt(block.dataset.activeSlide, 10) - 1);
    });
  }

  if (nextButton) {
    nextButton.addEventListener('click', () => {
      showSlide(block, parseInt(block.dataset.activeSlide, 10) + 1);
    });
  }

  block.querySelectorAll('.${blockName}-slide').forEach((slide, index) => {
    slide.addEventListener('click', () => {
      showSlide(block, index);
    });
  });

  const slideObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
        updateActiveSlide(entry.target);
      }
    });
  }, {
    threshold: 0.5,
    rootMargin: '0px -25% 0px -25%',
  });

  block.querySelectorAll('.${blockName}-slide').forEach((slide) => {
    slideObserver.observe(slide);
  });
}

function createSlide(row, slideIndex, carouselId) {
  const slide = document.createElement('li');
  slide.dataset.slideIndex = slideIndex;
  slide.setAttribute('id', \`\${carouselId}-slide-\${slideIndex}\`);
  slide.classList.add('${blockName}-slide');

  if (slideIndex === 0) {
    slide.classList.add('active');
  }

  const cells = [...row.children];

  // Extract slide data from cells
${imageField ? `  // Image field
  if (cells[0]) {
    const imageContainer = document.createElement('div');
    imageContainer.className = '${blockName}-slide-image';
    const img = cells[0].querySelector('img');
    if (img && img.src) {
      const optimizedPic = createOptimizedPicture(img.src, img.alt || '', false, [{ width: '600' }]);
      imageContainer.appendChild(optimizedPic);
    }
    slide.appendChild(imageContainer);
  }
` : ''}
${textFields.length > 0 || linkField ? `  // Content field
  if (cells[1]) {
    const contentContainer = document.createElement('div');
    contentContainer.className = '${blockName}-slide-content';
    
    ${linkField ? `// Check for link field
    let linkUrl = null;
    if (cells[${itemFields.findIndex(f => f === linkField)}]) {
      const linkCell = cells[${itemFields.findIndex(f => f === linkField)}];
      const linkContent = linkCell.textContent.trim();
      const anchorElement = linkCell.querySelector('a');
      linkUrl = anchorElement ? anchorElement.href : linkContent;
    }
    
    if (linkUrl) {
      const link = document.createElement('a');
      link.href = linkUrl;
      while (cells[1].firstChild) {
        link.appendChild(cells[1].firstChild);
      }
      contentContainer.appendChild(link);
    } else {
      while (cells[1].firstChild) {
        contentContainer.appendChild(cells[1].firstChild);
      }
    }` : `while (cells[1].firstChild) {
      contentContainer.appendChild(cells[1].firstChild);
    }`}
    
    slide.appendChild(contentContainer);
  }
` : ''}
  return slide;
}

let carouselId = 0;

/**
 * Decorates the ${blockName} block
 * @param {Element} block The ${blockName} block element
 */
export default async function decorate(block) {
  carouselId += 1;
  const blockId = \`${blockName}-\${carouselId}\`;
  block.setAttribute('id', blockId);
  
  const rows = [...block.children];
  
  if (rows.length === 0) {
    return;
  }

  const isSingleSlide = rows.length < 2;

  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', 'Carousel');

  const container = document.createElement('div');
  container.classList.add('${blockName}-slides-container');

  const slidesWrapper = document.createElement('ul');
  slidesWrapper.classList.add('${blockName}-slides');

  if (!isSingleSlide) {
    const slideNavButtons = document.createElement('div');
    slideNavButtons.classList.add('${blockName}-navigation-buttons');
    slideNavButtons.innerHTML = \`
      <button type="button" class="slide-prev" aria-label="Previous Slide"></button>
      <button type="button" class="slide-next" aria-label="Next Slide"></button>
    \`;
    container.append(slideNavButtons);
  }

  rows.forEach((row, idx) => {
    const slide = createSlide(row, idx, blockId);
    moveInstrumentation(row, slide);
    slidesWrapper.append(slide);
    row.remove();
  });

  container.append(slidesWrapper);
  block.prepend(container);

  block.dataset.activeSlide = '0';

  if (!isSingleSlide) {
    bindEvents(block);
  }
}`;
  }

  private generateSingleItemDecorateFunction(analysis: BlockAnalysis, measurements?: any): string {
    const blockName = analysis.blockName;
    const containerFields = analysis.contentStructure.containerFields;
    
    // Get Figma image dimensions for breakpoints
    const imageHeight = measurements?.imageHeight ? parseInt(measurements.imageHeight) : null;

    // Generate container field detection logic
    const containerFieldsCode = containerFields.map(field => {
      if (field.component === 'reference') {
        return `    // Handle ${field.name} - single cell with image
    if (cells.length === 1 && img && img.src) {
      const optimizedPic = createOptimizedPicture(img.src, img.alt || '', false, [{ width: '${imageHeight || 750}' }]);
      optimizedPic.className = '${field.name}';
      moveInstrumentation(row, optimizedPic);
      block.appendChild(optimizedPic);
      row.remove();
      return;
    }`;
      } else {
        const maxLength = field.maxLength || 500;
        const elementTag = field.name === 'heading' ? 'h1' : field.name === 'subheading' ? 'h2' : 'p';
        return `    // Handle ${field.name} - single cell with text
    if (cells.length === 1 && firstCellText && !img && !link && firstCellText.length < ${maxLength}) {
      const ${field.name}Element = document.createElement('${elementTag}');
      ${field.name}Element.className = '${field.name}';
      ${field.name}Element.textContent = firstCellText;
      moveInstrumentation(row, ${field.name}Element);
      block.appendChild(${field.name}Element);
      row.remove();
      return;
    }`;
      }
    }).join('\n\n');

    return `/**
 * Decorates the ${blockName} block
 * @param {Element} block The ${blockName} block element
 */
export default function decorate(block) {
  const rows = [...block.children];

  // Process each row by content type
  rows.forEach((row) => {
    const cells = [...row.children];
    if (!cells.length) return;

    const firstCell = cells[0];
    const firstCellText = firstCell.textContent.trim();
    const img = firstCell.querySelector('img');
    const link = firstCell.querySelector('a');
    
    // Handle configuration values (variants)
    if (isConfigurationValue(firstCellText)) {
      block.classList.add(firstCellText.toLowerCase());
      row.remove();
      return;
    }

${containerFieldsCode}

    // Handle button/CTA content
    if (cells.length === 1 && link) {
      const button = document.createElement('div');
      button.className = 'button-container';
      const linkElement = link.cloneNode(true) as Element;
      button.appendChild(linkElement);
      moveInstrumentation(row, button);
      block.appendChild(button);
      row.remove();
      return;
    }

    // Handle generic text content (fallback)
    if (cells.length === 1 && firstCellText) {
      const content = document.createElement('div');
      content.className = 'content';
      content.innerHTML = firstCell.innerHTML;
      moveInstrumentation(row, content);
      block.appendChild(content);
      row.remove();
      return;
    }

    // Remove empty or unrecognized rows
    row.remove();
  });

  // Add empty state if no content was processed
  if (!block.children.length) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.setAttribute('data-placeholder', 'Add ${blockName} content...');
    block.appendChild(emptyState);
  }
}`;
  }
}