# Adobe Client Data Layer (ACDL) Integration Guide

This guide explains how to integrate Adobe Client Data Layer tracking into your EDS blocks.

## Overview

The Adobe Client Data Layer (ACDL) provides a standardized way to collect and expose website data for analytics and personalization tools. This project uses a helper wrapper (`acdl-helper.js`) that provides a stable API whether the full ACDL library is loaded or just the queue exists.

## Setup

The ACDL helper is already configured in `scripts/scripts.js` and exported for use in blocks:

```javascript
import { acdl } from '../../scripts/scripts.js';
```

## Basic Usage

### 1. Import ACDL in Your Block

```javascript
import { acdl } from '../../scripts/scripts.js';

export default function decorate(block) {
  // Your block code here
}
```

### 2. Push Component Loaded Event

Every block should register itself when loaded:

```javascript
acdl.push({
  component: {
    componentType: 'your-block-name',
    componentPath: 'blocks/your-block-name',
    // Add any relevant metadata
  },
});
```

### 3. Track User Interactions

Use `pushEvent` for user-triggered actions:

```javascript
element.addEventListener('click', () => {
  acdl.pushEvent('componentClick', {
    component: {
      componentType: 'your-block-name',
      componentPath: 'blocks/your-block-name',
      linkText: element.textContent?.trim(),
      linkUrl: element.href,
    },
  });
});
```

## API Reference

### `acdl.push(data)`

Pushes data to the data layer state. Use for component registration and state updates.

```javascript
acdl.push({
  component: {
    componentType: 'cards',
    componentPath: 'blocks/cards',
    cardCount: 5,
  },
});
```

### `acdl.pushEvent(eventName, data)`

Pushes an event with associated data. Use for user interactions.

```javascript
acdl.pushEvent('componentClick', {
  component: {
    componentType: 'button',
    linkText: 'Learn More',
    linkUrl: '/about',
  },
});
```

### `acdl.pushState(stateObj)`

Merges state into the data layer (alias for push with state semantics).

### `acdl.getState(path?)`

Returns the current data layer state (or a specific path within it).

## Standard Event Names

| Event Name | Use Case |
|------------|----------|
| `componentClick` | Button clicks, link clicks, card clicks |
| `carouselSlideChange` | Carousel navigation |
| `flipCardInteraction` | Flip card flip actions |
| `mediaPlay` | Audio/video playback started |
| `mediaPause` | Audio/video paused |
| `mediaComplete` | Audio/video finished |
| `formSubmit` | Form submissions |
| `accordionToggle` | Accordion open/close |
| `tabChange` | Tab navigation |
| `modalOpen` | Modal opened |
| `modalClose` | Modal closed |

## Standard Component Data Structure

```javascript
{
  component: {
    componentType: 'block-name',        // Required: block identifier
    componentPath: 'blocks/block-name', // Required: block path
    componentTitle: 'Title',            // Optional: human-readable title
    
    // For clickable elements
    linkText: 'Button Text',
    linkUrl: 'https://example.com',
    
    // For lists/collections
    cardCount: 5,
    slideCount: 3,
    itemIndex: 0,
    
    // For media
    mediaType: 'audio',
    mediaSrc: '/media/file.mp3',
    currentTime: 45.5,
    
    // For variants
    variant: 'primary',
    
    // Custom properties as needed
    navigationMethod: 'next',
    action: 'flip-to-back',
  }
}
```

## Complete Block Examples

### Simple Block (Lottie Player)

```javascript
import { acdl } from '../../scripts/scripts.js';

export default async function decorate(block) {
  // ... block decoration logic ...

  // Push component loaded event
  acdl.push({
    component: {
      componentType: 'lottie-player',
      componentPath: 'blocks/lottie-player',
      animationSrc: src,
    },
  });
}
```

### Interactive Block (Cards)

```javascript
import { acdl } from '../../scripts/scripts.js';

export default async function decorate(block) {
  // ... block decoration logic ...

  // Track card clicks
  const cards = block.querySelectorAll('.cards-card');
  cards.forEach((card, index) => {
    const link = card.querySelector('a');
    const cardTitle = card.querySelector('h2, h3, h4')?.textContent?.trim() || `Card ${index + 1}`;

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
      componentPath: 'blocks/cards',
      cardCount: cards.length,
    },
  });
}
```

### Media Block (Audio)

```javascript
import { acdl } from '../../scripts/scripts.js';

export default function decorate(block) {
  // ... create audio element ...

  audioElement.addEventListener('play', () => {
    acdl.pushEvent('mediaPlay', {
      component: {
        componentType: 'audio',
        componentPath: 'blocks/audio',
        mediaType: 'audio',
        mediaSrc: audioElement.currentSrc,
      },
    });
  });

  audioElement.addEventListener('pause', () => {
    acdl.pushEvent('mediaPause', {
      component: {
        componentType: 'audio',
        componentPath: 'blocks/audio',
        mediaType: 'audio',
        mediaSrc: audioElement.currentSrc,
        currentTime: audioElement.currentTime,
      },
    });
  });

  audioElement.addEventListener('ended', () => {
    acdl.pushEvent('mediaComplete', {
      component: {
        componentType: 'audio',
        componentPath: 'blocks/audio',
        mediaType: 'audio',
        mediaSrc: audioElement.currentSrc,
      },
    });
  });

  acdl.push({
    component: {
      componentType: 'audio',
      componentPath: 'blocks/audio',
    },
  });
}
```

## Debugging

Enable debug mode to see ACDL operations in the console:

```javascript
// In scripts/scripts.js, change:
export const acdl = createAcdlHelper({ debug: true });
```

You can also inspect the data layer directly in the browser console:

```javascript
// View current state
window.adobeDataLayer.getState();

// Listen to all events
window.adobeDataLayer.addEventListener('adobeDataLayer:change', (event) => {
  console.log('Data layer changed:', event);
});
```

## Vendor Library

The Adobe Client Data Layer library is located in `scripts/vendor/`:
- `adobe-client-data-layer.min.js`
- `adobe-client-data-layer.min.js.map`

To update to the latest version, run:
```bash
npm update @adobe/adobe-client-data-layer
```

The `postinstall` script will automatically sync the files to the vendor folder.

## Best Practices

1. **Always register components** - Push component data when block loads
2. **Use consistent event names** - Follow the standard event naming conventions
3. **Include component identifiers** - Always include `componentType` and `componentPath`
4. **Track meaningful interactions** - Focus on user actions that provide analytics value
5. **Avoid tracking sensitive data** - Never include PII or sensitive information
6. **Test with debug mode** - Verify events are firing correctly during development
