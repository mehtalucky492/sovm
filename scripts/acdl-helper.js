/* /scripts/acdl-helper.js
 *
 * Helper around adobe-client-data-layer.min.js
 * - Works if the library is loaded OR if only the pre-load queue exists
 * - Provides a stable API for EDS projects
 */

const DEFAULTS = {
  layerName: 'adobeDataLayer',
  debug: false,
  readyTimeoutMs: 5000,
  pollIntervalMs: 25,
};

// Detect whether the ACDL API is present (not just an Array queue)
function hasAcdlApi(layer) {
  return !!(layer && typeof layer.getState === 'function' && typeof layer.addEventListener === 'function');
}

function ensureLayer(layerName) {
  // Before the library loads, adobeDataLayer is typically an Array queue.
  // The library will consume this queue and upgrade it to an API-enabled object.
  window[layerName] = window[layerName] || [];
  return window[layerName];
}

function createLogger(debug) {
  return (...args) => {
    // eslint-disable-next-line no-console
    if (debug) console.log('[ACDL]', ...args);
  };
}

function sleep(ms) {
  return new Promise((r) => {
    setTimeout(r, ms);
  });
}

async function waitForApi(layerName, { readyTimeoutMs, pollIntervalMs }, log) {
  const start = Date.now();
  while (Date.now() - start < readyTimeoutMs) {
    const layer = window[layerName];
    if (hasAcdlApi(layer)) return layer;
    // eslint-disable-next-line no-await-in-loop
    await sleep(pollIntervalMs);
  }
  log(`Timed out waiting for ${layerName} API; continuing with queue-only mode.`);
  return ensureLayer(layerName);
}

function normalizeEventName(name) {
  return String(name || '').trim();
}

export default function createAcdlHelper(options = {}) {
  const cfg = { ...DEFAULTS, ...options };
  const log = createLogger(cfg.debug);

  // Ensure the layer exists immediately
  ensureLayer(cfg.layerName);

  // Public API always returns the "current" layer reference
  const getLayer = () => ensureLayer(cfg.layerName);

  // Push helpers
  function push(payload) {
    const l = getLayer();
    l.push(payload);
    log('push', payload);
    return payload;
  }

  // Common patterns:
  // - push state (merged into ACDL state)
  // - push event (event-driven)
  function pushState(stateObj = {}) {
    // In ACDL, "state" is just pushing an object that becomes part of state
    return push(stateObj);
  }

  function pushEvent(eventName, data = {}) {
    const evt = normalizeEventName(eventName);
    if (!evt) throw new Error('pushEvent requires a non-empty eventName');

    return push({
      event: evt,
      ...data,
    });
  }

  // Event listeners (only available after library upgrades the layer)
  async function on(eventName, callback, opts = {}) {
    const evt = normalizeEventName(eventName);
    if (!evt) throw new Error('on requires a non-empty eventName');
    if (typeof callback !== 'function') throw new Error('on requires a callback(fn)');

    const apiLayer = await waitForApi(cfg.layerName, cfg, log);
    if (!hasAcdlApi(apiLayer)) {
      log(`Listener NOT registered; API not available (queue-only mode). Event: ${evt}`);
      return () => {};
    }

    apiLayer.addEventListener(evt, callback, opts);
    log('addEventListener', evt, opts);

    // Return an unsubscribe function
    return () => {
      try {
        apiLayer.removeEventListener(evt, callback, opts);
        log('removeEventListener', evt);
      } catch (e) {
        log('removeEventListener failed', e);
      }
    };
  }

  async function once(eventName, callback, opts = {}) {
    const off = await on(eventName, (...args) => {
      off();
      callback(...args);
    }, opts);
    return off;
  }

  async function getState(path) {
    const apiLayer = await waitForApi(cfg.layerName, cfg, log);
    if (!hasAcdlApi(apiLayer)) return undefined;

    // getState() supports no args (full state) and may support path.
    // We handle both: if path passed, try; else full state.
    try {
      return typeof path === 'undefined' ? apiLayer.getState() : apiLayer.getState(path);
    } catch (e) {
      log('getState error', e);
      return apiLayer.getState();
    }
  }

  // Convenience: standardized component events
  function componentImpression(component = {}) {
    return pushEvent('componentImpression', { component });
  }

  function componentClick(component = {}) {
    return pushEvent('componentClick', { component });
  }

  return {
    cfg,
    getLayer,

    // push
    push,
    pushState,
    pushEvent,

    // listeners / state
    on,
    once,
    getState,

    // conventions
    componentImpression,
    componentClick,
  };
}
