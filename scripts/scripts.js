import {
  loadHeader,
  loadFooter,
  decorateButtons,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForFirstImage,
  loadSection,
  loadSections,
  loadCSS,
  getMetadata,
} from './aem.js';
import {
  initMartech,
  martechEager,
  martechLazy,
  martechDelayed,
// eslint-disable-next-line import/no-relative-packages
} from '../plugins/martech/src/index.js';
import createAcdlHelper from './acdl-helper.js';

export const acdl = createAcdlHelper({ debug: false });

// Page load event + base state
acdl.pushState({
  page: {
    name: document.title,
    url: window.location.href,
    path: window.location.pathname,
    language: document.documentElement.lang || 'en',
  },
});

acdl.pushEvent('pageLoad');

/**
 * Cache for site-wide settings fetched from homepage
 */
let siteSettingsCache = null;

/**
 * Homepage path for site-wide settings
 */
const HOMEPAGE_PATH = '/live-content/';

/**
 * Gets OneTrust domain script ID, first checking current page, then fetching from homepage.
 * @returns {Promise<string>} The OneTrust domain script ID, or empty string if not configured
 */
async function getOneTrustDomainScript() {
  // First, check if current page has the metadata
  const currentPageId = getMetadata('onetrust-domain-script');
  if (currentPageId) {
    return currentPageId;
  }

  // If we're on the homepage, no ID was found
  if (
    window.location.pathname === HOMEPAGE_PATH
    || window.location.pathname === `${HOMEPAGE_PATH}index.html`
  ) {
    return '';
  }

  // Return cached value if available
  if (siteSettingsCache !== null) {
    return siteSettingsCache;
  }

  // Fetch homepage and extract the OneTrust ID
  try {
    const resp = await fetch(HOMEPAGE_PATH);
    if (resp.ok) {
      const html = await resp.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const homepageId = doc.querySelector('meta[name="onetrust-domain-script"]')?.content || '';
      siteSettingsCache = homepageId;
      return homepageId;
    }
  } catch (e) {
    // Silent fail - OneTrust will not load if homepage fetch fails
  }

  siteSettingsCache = '';
  return '';
}

/**
 * Loads OneTrust consent management script dynamically.
 * @param {string} domainScriptId The OneTrust domain script ID
 */
function loadOneTrust(domainScriptId) {
  if (!domainScriptId) {
    return;
  }

  // Check if OneTrust is already loaded
  if (document.querySelector('script[src*="otSDKStub.js"]')) {
    return;
  }

  const script = document.createElement('script');
  script.src = 'https://cdn.cookielaw.org/scripttemplates/otSDKStub.js';
  script.type = 'text/javascript';
  script.charset = 'UTF-8';
  script.setAttribute('data-domain-script', domainScriptId);
  script.async = true;
  document.head.appendChild(script);
}

/**
 * Detects if Universal Editor is active
 * @returns {boolean} true if UE is active
 */
export function isUniversalEditorActive() {
  return (
    window.universalEditorActive
    || window.UniversalEditorEmbedded
    || (window.frames
      && window.frames[0]
      && window.frames[0].window
      && window.frames[0].window.UniversalEditorEmbedded)
    || document.body.classList.contains('ue-active')
    || document.documentElement.classList.contains('ue-active')
    || document.body.classList.contains('aue-active')
    || document.documentElement.classList.contains('aue-active')
    || window.location.pathname.includes('/editor.html/')
    || window.location.search.includes('editor=1')
    || !!document.querySelector('[data-aue-resource]')
  );
}

/**
 * Moves all the attributes from a given elmenet to another given element.
 * @param {Element} from the element to copy attributes from
 * @param {Element} to the element to copy attributes to
 */
export function moveAttributes(from, to, attributes) {
  if (!attributes) {
    // eslint-disable-next-line no-param-reassign
    attributes = [...from.attributes].map(({ nodeName }) => nodeName);
  }
  attributes.forEach((attr) => {
    const value = from.getAttribute(attr);
    if (value) {
      to.setAttribute(attr, value);
      from.removeAttribute(attr);
    }
  });
}

/**
 * Move instrumentation attributes from a given element to another given element.
 * @param {Element} from the element to copy attributes from
 * @param {Element} to the element to copy attributes to
 */
export function moveInstrumentation(from, to) {
  moveAttributes(
    from,
    to,
    [...from.attributes]
      .map(({ nodeName }) => nodeName)
      .filter(
        (attr) => attr.startsWith('data-aue-') || attr.startsWith('data-richtext-'),
      ),
  );
}

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks() {
  try {
    // TODO: add auto block, if needed
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  // hopefully forward compatible button decoration
  decorateButtons(main);
  decorateIcons(main);
  buildAutoBlocks(main);
  decorateSections(main);
  decorateBlocks(main);
}

/**
 * Apply page-level styles from metadata to main element.
 * Reads the 'style' meta tag and adds the class to main.
 * @param {Element} main The main element
 */
function decoratePageStyle(main) {
  const style = getMetadata('style');
  if (style && main) {
    style.split(',').forEach((s) => {
      main.classList.add(s.trim());
    });
  }
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  // Hook in your consent check to determine if personalization can run.
  const isConsentGiven = false; /* your consent logic here */
  const launchScript = `https://assets.adobedtm.com/3f0d2e2dbd42/077351c76c7c/launch-${getMetadata('launch-id')}.min.js`;

  const martechLoadedPromise = initMartech(
    // 1. WebSDK Configuration
    // Docs: https://experienceleague.adobe.com/en/docs/experience-platform/web-sdk/commands/configure/overview#configure-js
    {
      datastreamId: getMetadata('datastream-id'),
      orgId: getMetadata('org-id'),
      // The `debugEnabled` flag is automatically set to true on localhost and .page URLs.
      // The `defaultConsent` is automatically set to "pending".
      onBeforeEventSend: (payload) => {
        // set custom Analytics params
        // see doc at https://experienceleague.adobe.com/en/docs/analytics/implementation/aep-edge/data-var-mapping
        // eslint-disable-next-line no-underscore-dangle
        payload.data.__adobe.analytics ||= {};
        // This callback allows you to modify the payload before it's sent.
        // Return false to prevent the event from being sent.
      },
      edgeConfigOverrides: {
        // Optional datastream overrides for different environments.
      },
    },
    // 2. Library Configuration
    {
      // target isn't being used as of now, but reserved for future use.
      personalization: isConsentGiven,
      launchUrls: [launchScript],
      // See the API Reference for all available options.
    },
  );

  document.documentElement.lang = 'en';
  decorateTemplateAndTheme();
  // addLaunch();

  getOneTrustDomainScript().then((onetrustId) => {
    loadOneTrust(onetrustId);
  });

  const main = doc.querySelector('main');
  if (main) {
    decoratePageStyle(main);
    decorateMain(main);
    document.body.classList.add('appear');
    await Promise.all([
      martechLoadedPromise.then(martechEager),
      loadSection(main.querySelector('.section'), waitForFirstImage),
    ]);
  }

  try {
    /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }
}

function autolinkModals(doc) {
  doc.addEventListener('click', async (e) => {
    const origin = e.target.closest('a');
    if (origin && origin.href && origin.href.includes('/modals/')) {
      e.preventDefault();
      const { openModal } = await import(
        `${window.hlx.codeBasePath}/blocks/modal/modal.js`
      );
      openModal(origin.href);
    }
  });
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  autolinkModals(doc);

  const main = doc.querySelector('main');
  await loadSections(main);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  loadHeader(doc.querySelector('header'));
  loadFooter(doc.querySelector('footer'));
  await martechLazy();

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => {
    martechDelayed();
    import('./delayed.js');
  }, 3000);
  // load anything that can be postponed to the latest here
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

/**
 * Custom functions
 */
export function getProps(block, config) {
  return Array.from(block.children).map((el, index) => {
    if (config?.picture) {
      return el.innerHTML.includes('picture')
        ? el.querySelector('picture')
        : el.innerText.trim();
    }
    if (config?.index && config?.index.includes(index)) {
      return el;
    }
    return el.innerHTML.includes('picture')
      ? el.querySelector('img').src.trim()
      : el.innerText.trim();
  });
}

// OneTrust button fix - run immediately when modal opens, not waiting for delayed.js
const fixOneTrustButtons = () => {
  const acceptBtn = document.getElementById('accept-recommended-btn-handler');
  const rejectBtn = document.getElementsByClassName(
    'ot-pc-refuse-all-handler',
  )[0];
  const container = document.getElementsByClassName('ot-btn-container')[0];

  if (
    acceptBtn
    && rejectBtn
    && container
    && acceptBtn.parentElement !== container
  ) {
    container.prepend(acceptBtn, rejectBtn);
    acceptBtn.style.display = '';
    rejectBtn.style.display = '';
  }
};

// Watch for OneTrust modal to appear
const observeOneTrust = new MutationObserver(() => {
  const modal = document.getElementById('onetrust-pc-sdk');
  if (modal && modal.style.display !== 'none') {
    fixOneTrustButtons();
  }
});

if (document.body) {
  observeOneTrust.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style'],
  });
}

loadPage();
