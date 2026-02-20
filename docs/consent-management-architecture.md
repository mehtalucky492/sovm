# Consent Management Architecture

## Overview

This document describes the technical implementation of GDPR/privacy consent management in the Adobe EDS XWalk project, integrating both OtsukaPCM (custom consent system) and OneTrust (third-party cookie consent platform).

## System Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Page Load Sequence                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. scripts.js (immediate)                                  │
│     ├─ OneTrust modal observer setup                       │
│     └─ Button positioning fix (MutationObserver)           │
│                                                              │
│  2. Video block decoration (on DOM ready)                   │
│     ├─ Placeholder image displayed                         │
│     ├─ IntersectionObserver setup                          │
│     └─ Click handler registration                          │
│                                                              │
│  3. delayed.js (3 second delay)                             │
│     ├─ OtsukaPCM script load                               │
│     └─ consent-management-video.js initialization          │
│                                                              │
│  4. User interaction                                        │
│     ├─ Video placeholder click                             │
│     ├─ Wait for OtsukaPCM (max 3s)                         │
│     ├─ Consent modal display                               │
│     └─ Video embedding on approval                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## File Structure

### HTML Configuration

#### `/head.html` (11 lines)
**Purpose**: Page-level configuration and resource loading

**OneTrust SDK Initialization**:
```html
<script 
    src="https://cdn.cookielaw.org/scripttemplates/otSDKStub.js" 
    type="text/javascript" 
    charset="UTF-8" 
    data-domain-script="01919da4-28dd-7b41-874c-08e0990f0033-test"
></script>
```

**Critical Elements**:
- **Viewport Meta Tag**: `<meta name="viewport" content="width=device-width, initial-scale=1"/>` - Required for responsive design
- **OneTrust SDK**: Loaded from CDN with test domain script ID
- **Script Loading Order**:
  1. `aem.js` - Adobe EDS core framework
  2. `scripts.js` - Application bootstrap (immediate OneTrust fixes)
  3. `svgxuse.min.js` - SVG sprite polyfill
- **Stylesheet Loading**:
  1. `root.css` - CSS variables and design tokens
  2. `styles.css` - Global styles
  3. `site.css` - Site-specific styles
  4. `onetrust.css` - OneTrust customization and fixes

**Note**: The `data-domain-script` attribute connects to OneTrust's configuration dashboard. The `-test` suffix indicates test environment.

### JavaScript Files

#### `/scripts/scripts.js` (215 lines)
**Purpose**: Main application bootstrap and immediate initialization

**Key Functions**:
- `fixOneTrustButtons()` (lines 183-199): Moves Accept/Reject buttons from content to footer
- `observeOneTrust` (lines 201-207): MutationObserver watching for modal appearance
- Executes immediately on page load (not delayed)

**Critical Implementation**:
```javascript
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.id === 'onetrust-pc-sdk') {
        fixOneTrustButtons();
        observer.disconnect();
      }
    });
  });
});
```

#### `/scripts/consent-management.js` (103 lines)
**Purpose**: OneTrust integration and configuration

**Key Functions**:
- `oneTrustSettingsButtonFix()` (lines 72-92): Button repositioning with re-render handling
- Uses `prepend()` to move buttons to footer container
- MutationObserver watches for OneTrust re-renders
- Sets `display` style after moving to ensure visibility

**Design Pattern**:
```javascript
const acceptButton = content?.querySelector('#accept-recommended-btn-handler');
const footer = sdk?.querySelector('.ot-pc-footer');
if (acceptButton && footer) {
  footer.prepend(acceptButton);
  acceptButton.style.display = '';
}
```

#### `/scripts/consent-management-video.js` (624 lines)
**Purpose**: OtsukaPCM global object and video consent workflow

**Key Functions**:
- `OtsukaPCM.initVideoBlock(videoContainer, videoUrl, options)`: Primary initialization
- Creates consent overlay with branding and messaging
- Handles consent approval via CustomEvent
- Embeds video iframe on user consent

**Loading**: Loaded by `delayed.js` after 3-second delay

#### `/blocks/video/video.js` (298 lines)
**Purpose**: Video block decoration with consent integration

**Critical Logic** (lines 266-297):
```javascript
const waitForOtsukaPCM = () => new Promise((resolve) => {
  const maxWaitTime = 3000; // Wait max 3 seconds
  const checkInterval = 100;
  const startTime = Date.now();
  
  const checkOtsukaPCM = () => {
    if (typeof OtsukaPCM !== 'undefined') {
      resolve(true);
    } else if (Date.now() - startTime >= maxWaitTime) {
      resolve(false);
    } else {
      setTimeout(checkOtsukaPCM, checkInterval);
    }
  };
  
  checkOtsukaPCM();
});
```

**IntersectionObserver Integration**:
- Detects when video placeholder enters viewport
- For YouTube/Vimeo: Waits for OtsukaPCM, then initializes consent flow
- For autoplay videos: Directly embeds video
- Fallback: Click handler if OtsukaPCM fails to load

### CSS Files

#### `/blocks/video/video.css` (104 lines)
**Purpose**: Video block styling

**Critical Fix** (lines 50-56):
```css
/* Hide iframe/video ONLY when following placeholder */
.video-placeholder + iframe,
.video-placeholder + video {
  position: absolute;
  top: 0;
  left: 0;
  display: none;
}
```

**Previous Issue**: Selector `.video-placeholder + *` was hiding consent overlay

#### `/styles/onetrust.css` (357 lines)
**Purpose**: OneTrust modal customization and UI fixes

**Button Visibility Fix** (lines 327-333):
```css
/* Show button in footer, hide in content area */
#onetrust-pc-sdk .ot-pc-footer #accept-recommended-btn-handler {
  visibility: visible !important;
}

#onetrust-pc-sdk #ot-pc-content #accept-recommended-btn-handler {
  visibility: hidden !important;
}
```

**Floating Button SVG Centering** (lines 335-357):
```css
/* stylelint-disable selector-class-pattern */
#ot-sdk-btn-floating .ot-floating-button__back,
#ot-sdk-btn-floating .ot-floating-button__front {
  display: flex;
  align-items: center;
  justify-content: center;
}

#ot-sdk-btn-floating svg {
  flex-shrink: 0;
  transform: translateY(2px); /* Final pixel-perfect adjustment */
}
/* stylelint-enable selector-class-pattern */
```

## Consent Flow Sequence

### Video Consent Flow

```
User Action                  System Response
───────────                  ───────────────

[Page loads]
    │
    ├─> scripts.js executes (immediate)
    │       └─> OneTrust observer active
    │
    ├─> Video block decorates
    │       ├─> Placeholder displayed
    │       ├─> IntersectionObserver setup
    │       └─> Click handler registered
    │
    └─> delayed.js executes (3s delay)
            └─> OtsukaPCM loads
                └─> consent-management-video.js ready

[User scrolls to video]
    │
    └─> IntersectionObserver triggers
            │
            ├─> Check video type (YouTube/Vimeo?)
            │       └─> Yes: Wait for OtsukaPCM
            │
            └─> OtsukaPCM ready?
                    └─> Yes: Initialize consent overlay

[User clicks placeholder]
    │
    └─> OtsukaPCM.initVideoBlock() called
            │
            ├─> Create consent overlay
            ├─> Add click handlers
            └─> Show consent modal
                    │
                    └─> Z-index: 10000 (over video)

[User approves consent]
    │
    └─> CustomEvent 'otsuka:video:consent:approved'
            │
            ├─> Store consent preference
            ├─> Remove overlay
            └─> Embed video iframe
                    │
                    └─> Autoplay starts
```

### OneTrust Cookie Consent Flow

```
[OneTrust SDK loads]
    │
    └─> Modal appears in DOM
            │
            ├─> MutationObserver detects (scripts.js)
            │       └─> fixOneTrustButtons() executes
            │
            ├─> Accept button in #ot-pc-content
            │       └─> Moved to .ot-pc-footer via prepend()
            │
            └─> CSS applies
                    ├─> Hide button in content area
                    └─> Show button in footer

[User interaction]
    │
    └─> OneTrust re-renders modal?
            │
            └─> MutationObserver detects
                    └─> Re-apply button positioning
```

## Timing & Performance

### Load Sequence Optimization

**Problem**: OtsukaPCM loaded via delayed.js (3-second delay) caused consent modal failures when users clicked videos immediately.

**Solution**: Implemented wait logic with timeout:
- Maximum wait: 3000ms
- Check interval: 100ms
- Fallback: Direct click handler if OtsukaPCM unavailable

### FOUC Prevention

**Problem**: Accept All Cookies button briefly visible in wrong location before JavaScript moved it.

**Solution**: Dual approach
1. **CSS**: Hide button in content area, show only in footer
2. **JavaScript**: Moved OneTrust button positioning logic from `delayed.js` to `scripts.js` for immediate execution
   - `fixOneTrustButtons()` - Repositions Accept/Reject buttons to footer
   - `observeOneTrust` - MutationObserver that detects modal appearance
   - Executes on page load instead of waiting 3 seconds

## Key Design Decisions

### 1. MutationObserver for Dynamic DOM Changes

**Use Cases**:
- OneTrust modal appearance detection
- Button re-positioning after modal re-renders
- Handling third-party script DOM manipulation

**Pattern**:
```javascript
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.matches(targetSelector)) {
        applyFix();
        observer.disconnect(); // Clean up
      }
    });
  });
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});
```

### 3. CSS Specificity Over JavaScript Timing

**Principle**: Use CSS to prevent visual glitches, JavaScript for functionality

**Example**: Button visibility
```css
/* CSS handles visibility immediately on modal render */
#onetrust-pc-sdk #ot-pc-content #accept-recommended-btn-handler {
  visibility: hidden !important;
}
```
```javascript
// JavaScript handles repositioning
footer.prepend(acceptButton);
acceptButton.style.display = ''; // Reveal in new location
```

## Integration Points

### 1. OtsukaPCM → Video Block
- **Event**: `otsuka:video:consent:approved` (CustomEvent)
- **Payload**: `{ videoUrl, consentGiven: true }`
- **Handler**: Video block listens and embeds iframe

### 2. OneTrust → Global Page
- **SDK**: Loaded via external script tag
- **Initialization**: Auto-detects presence of `#onetrust-pc-sdk`
- **Configuration**: Managed via OneTrust dashboard (not in code)

### 3. Delayed Scripts → Consent Systems
- **File**: `/scripts/delayed.js`
- **Delay**: 3 seconds after page load
- **Loads**: OtsukaPCM, consent-management-video.js

## Error Handling

### OtsukaPCM Load Failure
```javascript
// Fallback if OtsukaPCM fails to load after 3 seconds
videoContainer.addEventListener('click', () => {
  window.open(videoUrl, '_blank');
});
```

### OneTrust Button Not Found
```javascript
// Silent fail - button may not exist on all modal views
const acceptButton = content?.querySelector('#accept-recommended-btn-handler');
if (acceptButton && footer) {
  // Only proceed if both elements exist
}
```

## Browser Compatibility

### CSS Features Used
- CSS Custom Properties (variables)
- Flexbox
- `transform: translateY()`
- `visibility` property

### JavaScript Features Used
- Promises (`new Promise()`)
- `async/await`
- MutationObserver API
- IntersectionObserver API
- CustomEvent API
- ES6 modules (`import/export`)

### Minimum Requirements
- Modern evergreen browsers (Chrome, Firefox, Safari, Edge)
- ES6 support required
- No IE11 support (uses modern APIs)

## Testing Considerations

### Manual Testing Checklist

**Video Consent Flow**:
- [ ] Placeholder displays on page load
- [ ] Clicking placeholder shows consent overlay
- [ ] Overlay appears above video (z-index: 10000)
- [ ] Approving consent embeds and autoplays video
- [ ] Works when OtsukaPCM not yet loaded
- [ ] Works on slow connections (3-second wait)

**OneTrust Modal**:
- [ ] Accept All Cookies button in footer (not content)
- [ ] No FOUC (flash of unstyled content)
- [ ] Button visible immediately when modal opens
- [ ] Floating button SVG centered
- [ ] Button repositioning survives modal re-renders

**Edge Cases**:
- [ ] Multiple videos on same page
- [ ] Video above the fold (immediate viewport)
- [ ] Video below the fold (lazy loading)
- [ ] OtsukaPCM timeout scenario (>3 seconds)
- [ ] OneTrust disabled/blocked by user

## Performance Metrics

### Target Metrics
- **JavaScript Bundle**: consent-management-video.js ≤ 3KB (minified+gzipped)
- **CSS Overhead**: onetrust.css additions ≤ 1KB
- **OtsukaPCM Wait Time**: Max 3000ms
- **OneTrust Button Fix**: < 100ms after modal appears

### Loading Strategy
- **Critical Path**: scripts.js (immediate)
- **Deferred**: delayed.js (3s delay)
- **On-Demand**: Video embedding (user interaction)

## Security Considerations

### Content Security Policy (CSP)
Ensure CSP allows:
- YouTube/Vimeo iframe embedding
- OneTrust SDK (if hosted externally)
- Inline styles for dynamic positioning

### Data Privacy
- **Consent Storage**: OtsukaPCM handles localStorage/cookies
- **OneTrust**: Manages cookie consent preferences
- **No PII Collection**: Video URLs only, no user tracking

### Third-Party Scripts
- **OneTrust**: Vetted third-party provider
- **OtsukaPCM**: Custom implementation (auditable)
- **Video Embeds**: Only after explicit user consent

## Maintenance Guide

### Common Issues

**Issue**: Consent modal not showing
- **Check**: OtsukaPCM loaded (Console: `typeof OtsukaPCM`)
- **Check**: Video type (YouTube/Vimeo only trigger consent)
- **Check**: CSS not hiding overlay (`.video-placeholder + *` selector)

**Issue**: OneTrust button misaligned
- **Check**: `fixOneTrustButtons()` executing (Console logs)
- **Check**: MutationObserver active (scripts.js loaded)
- **Check**: CSS specificity (onetrust.css lines 327-333)

**Issue**: Video not autoplaying after consent
- **Check**: CustomEvent listener attached
- **Check**: Consent event payload includes `videoUrl`
- **Check**: Browser autoplay policy (requires muted videos)

### Code Quality

**Linting**:
```bash
npm run lint      # JavaScript (ESLint)
npm run lint:css  # CSS (Stylelint)
```

**Auto-fix**:
```bash
npm run lint:fix     # Fix JS issues
npm run lint:css -- --fix  # Fix CSS issues
```

### Stylelint Exceptions
```css
/* stylelint-disable selector-class-pattern */
/* OneTrust uses BEM with double underscores (third-party) */
.ot-floating-button__back { }
/* stylelint-enable selector-class-pattern */
```

## References

### Internal Documentation
- [Adobe EDS XWalk Documentation](../.github/copilot-instructions.md)
- [Video Block Implementation](../blocks/video/video.js)
- [OneTrust Customization](../styles/onetrust.css)

### External Resources
- [OneTrust Developer Documentation](https://developer.onetrust.com/)
- [IntersectionObserver API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)
- [MutationObserver API](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver)
- [GDPR Compliance Guidelines](https://gdpr.eu/)

---

**Document Version**: 1.0  
**Last Updated**: January 21, 2026  
**Maintained By**: Development Team
