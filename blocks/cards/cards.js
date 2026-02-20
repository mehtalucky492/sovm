import { createOptimizedPicture } from '../../scripts/aem.js';
import { renderBlock } from '../../scripts/faintly.js';
import { isUniversalEditorActive, acdl } from '../../scripts/scripts.js';
import { IMAGE_WIDTHS } from '../../scripts/constants.js';

const transformCardColumn = (context) => {
  const col = context.card;
  const picture = col.querySelector('picture');

  if (picture && col.children.length === 1) col.className = 'cards-card-image';
  else col.className = 'cards-card-body';

  // Only optimize pictures when not in Universal Editor
  if (picture && !isUniversalEditorActive()) {
    const img = picture.querySelector(':scope > img');
    picture.replaceWith(createOptimizedPicture(
      img.src,
      img.alt,
      false,
      [{ width: IMAGE_WIDTHS.DEFAULT }],
    ));
  }
  return col;
};

/**
 * Get AEM-specific attributes for a card element based on context
 * Used by the data-fly-attributes directive in the template
 * @param {Object} context - The rendering context
 * @returns {Object} The attributes object
 */
const cardRowAttributes = (context) => {
  if (isUniversalEditorActive()) {
    let rowIndex = 0;
    if (context.rowIndex !== undefined) {
      rowIndex = context.rowIndex;
    }

    // Get AEM resource path using optional chaining and rowIndex
    const cardPath = context.block?.children?.[rowIndex]?.dataset?.aueResource || '';
    if (!cardPath) return {};

    return {
      'data-aue-resource': cardPath,
      'data-aue-type': 'component',
      'data-aue-model': 'card',
      'data-aue-label': `Card ${rowIndex + 1}`,
    };
  }
  return {};
};

export default async function decorate(block) {
  await renderBlock(block, {
    transformCardColumn,
    cardRowAttributes,
  });

  // ACDL tracking for card clicks
  const cards = block.querySelectorAll('.cards-card');
  cards.forEach((card, index) => {
    const link = card.querySelector('a');
    const cardTitle = card.querySelector('h2, h3, h4, h5, h6, p')?.textContent?.trim() || `Card ${index + 1}`;

    if (link) {
      link.addEventListener('click', () => {
        acdl.pushEvent('componentClick', {
          component: {
            componentType: 'cards',
            componentTitle: cardTitle,
            componentPath: 'blocks/cards',
            cardIndex: index,
            linkText: link.textContent?.trim(),
            linkUrl: link.href,
          },
        });
      });
    }
  });

  // Push component loaded event
  acdl.push({
    component: {
      componentType: 'cards',
      componentTitle: 'cards',
      componentPath: 'blocks/cards',
      cardCount: cards.length,
    },
  });
}
