# Lottie Player Block

## Overview
The Lottie Player block enables embedding and displaying Lottie animations (JSON-based animations) in Adobe Edge Delivery Services pages. It uses the [@lottiefiles/lottie-player](https://www.npmjs.com/package/@lottiefiles/lottie-player) web component for rendering.

## Files
- `blocks/lottie-player/lottie-player.js` - Block decoration and initialization
- `blocks/lottie-player/lottie-player.css` - Styling and layout
- `blocks/lottie-player/_lottie-player.json` - Universal Editor model definition

## Universal Editor Fields

### Animation Source
- **Animation URL** (`animation`) - Direct URL to a Lottie JSON file
- **Lottie Animation** (`lottieSelect`) - Dropdown selector for pre-configured animations
  - Options: "The World Is Better" (`/lottie/the-world-is-better.json`)

### Playback Controls
- **Autoplay** (`autoplay`) - Auto-start animation on load (default: `true`)
- **Loop** (`loop`) - Continuously repeat animation (default: `true`)
- **Controls** (`controls`) - Show playback controls UI (default: `false`)
- **Speed** (`speed`) - Animation playback speed multiplier (default: `1`)

### Appearance
- **Background** (`background`) - Background color (default: `transparent`)
- **Width** (`width`) - Player width (e.g., `320px`, `100%`)
- **Height** (`height`) - Player height (e.g., `320px`)

### Accessibility
- **ARIA Label** (`ariaLabel`) - Screen reader description (default: `Animation`)

## Usage

### Source Priority
The block determines the animation source with the following priority:
1. **Lottie Animation** dropdown selection
2. **Animation URL** field (if dropdown is empty)
3. Block will not render if both are empty

### Default Configuration
```javascript
{
  autoplay: true,
  loop: true,
  controls: false,
  background: 'transparent',
  speed: 1,
  styleWidth: '400px',
  styleHeight: '400px',
  ariaLabel: 'Lottie Animation'
}
```

### Adding New Pre-configured Animations
1. Place Lottie JSON file in `/lottie/` directory
2. Add option to `lottieSelect` field in `_lottie-player.json`:
```json
{
  "name": "Your Animation Name",
  "value": "/lottie/your-animation.json"
}
```
3. Run `npm run build:json` to rebuild models

## Styling
The block uses centered flexbox layout:
```css
.block.lottie-player .lottie-player-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
}
```

Maximum width is constrained to 480px with responsive scaling.

## Technical Notes
- The LottieFiles player is loaded dynamically from CDN
- Only one CDN request is made regardless of multiple instances
- Uses ES module import for the web component
- Supports all standard Lottie animation features

## Example Animations
Current pre-configured animations:
- **The World Is Better** - Located at `/lottie/the-world-is-better.json`

## Dependencies
- [@lottiefiles/lottie-player](https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js) - Loaded from CDN
- `block-utils.js` - Utility functions (`isNullOrEmpty`, `truthy`)
