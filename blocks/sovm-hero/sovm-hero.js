const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function isDirectMediaUrl(u = '') {
  try {
    const url = new URL(u, window.location.origin);
    if (/youtube\.com|youtu\.be|vimeo\.com/i.test(url.hostname)) return false;
    const p = url.pathname.toLowerCase();
    return p.endsWith('.mp4') || p.endsWith('.webm') || p.endsWith('.ogg') || p.endsWith('.ogv') || p.endsWith('.m3u8');
  } catch {
    return false;
  }
}

function mimeFromUrl(u = '') {
  const lower = u.toLowerCase();
  if (lower.endsWith('.mp4')) return 'video/mp4';
  if (lower.endsWith('.webm')) return 'video/webm';
  if (lower.endsWith('.ogg') || lower.endsWith('.ogv')) return 'video/ogg';
  if (lower.endsWith('.m3u8')) return 'application/vnd.apple.mpegurl';
  return 'video/mp4';
}

function pickSource({ desktopUrl, mobileUrl }) {
  const isMobile = window.matchMedia('(max-width: 48em)').matches;
  if (isMobile && isDirectMediaUrl(mobileUrl)) return mobileUrl;
  if (isDirectMediaUrl(desktopUrl)) return desktopUrl;
  if (isDirectMediaUrl(mobileUrl)) return mobileUrl;
  return '';
}

function showManualPlayOverlay(wrapper, video) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'hero-video-play';
  Object.assign(btn.style, {
    position: 'absolute',
    zIndex: '2',
    inset: '0',
    margin: 'auto',
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    border: '0',
    background: 'rgba(0,0,0,.6)',
    color: '#fff',
    display: 'grid',
    placeItems: 'center',
    cursor: 'pointer',
  });
  btn.setAttribute('aria-label', 'Play background video');
  btn.innerHTML = '▶';
  const start = () => {
    btn.remove();
    video.controls = false;
    video.play?.().catch(() => {});
  };
  btn.addEventListener('click', start);
  wrapper.appendChild(btn);
}

function attachDiagnostics(video, sourceEl) {
  // eslint-disable-next-line no-console, no-restricted-globals
  const log = (...args) => { if (location.hostname === 'localhost') console.log('[sovm-hero]', ...args); };
  // eslint-disable-next-line no-restricted-globals, no-console
  const err = (...args) => { if (location.hostname === 'localhost') console.error('[sovm-hero]', ...args); };

  video.addEventListener('error', () => err('video.error', video.error));
  sourceEl.addEventListener('error', () => err('source.error for', sourceEl.src));
  video.addEventListener('stalled', () => log('stalled'));
  video.addEventListener('waiting', () => log('waiting'));
  video.addEventListener('suspend', () => log('suspend'));
  video.addEventListener('loadedmetadata', () => log('loadedmetadata', { readyState: video.readyState }));
  video.addEventListener('canplay', () => log('canplay', { readyState: video.readyState }));
  video.addEventListener('canplaythrough', () => log('canplaythrough', { readyState: video.readyState }));
  video.addEventListener('playing', () => log('playing', { currentTime: video.currentTime }));
}

function createVideoEl({ desktopUrl, mobileUrl, altText = '' }) {
  const video = document.createElement('video');
  video.className = 'hero-video';
  video.style.maxWidth = '100%';
  video.style.display = 'block';
  video.style.margin = '0 auto';

  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');
  video.setAttribute('muted', '');
  video.setAttribute('loop', '');
  video.setAttribute('preload', 'auto');

  video.playsInline = true;
  video.muted = true;
  video.defaultMuted = true;
  video.loop = true;

  if (!prefersReducedMotion.matches) {
    video.setAttribute('autoplay', '');
    video.autoplay = true;
  } else {
    video.removeAttribute('autoplay');
    video.autoplay = false;
    video.setAttribute('controls', '');
    video.controls = true;
  }

  if (altText) {
    video.setAttribute('aria-label', altText);
    video.setAttribute('title', altText);
  }

  const src = pickSource({ desktopUrl, mobileUrl });
  const sourceEl = document.createElement('source');
  sourceEl.src = src;
  sourceEl.type = mimeFromUrl(src);
  video.append(sourceEl);

  attachDiagnostics(video, sourceEl);

  const tryAutoplay = () => {
    const p = video.play?.();
    if (p && typeof p.then === 'function') {
      p.catch(() => {});
    }
  };

  if (!prefersReducedMotion.matches) {
    const eager = () => tryAutoplay();
    video.addEventListener('loadeddata', eager, { once: true });
    video.addEventListener('canplay', eager, { once: true });
    video.addEventListener('canplaythrough', eager, { once: true });
  }

  const mq = window.matchMedia('(max-width: 48em)');
  const maybeSwap = () => {
    const desired = pickSource({ desktopUrl, mobileUrl });
    if (!desired || desired === sourceEl.src) return;
    const { paused } = video;
    video.pause();
    sourceEl.src = desired;
    sourceEl.type = mimeFromUrl(desired);
    video.load();
    if (!paused && !prefersReducedMotion.matches) {
      const p = video.play?.();
      if (p && typeof p.then === 'function') p.catch(() => {});
    }
  };
  if (mq.addEventListener) mq.addEventListener('change', maybeSwap);
  else if (mq.addListener) mq.addListener(maybeSwap);
  window.addEventListener('orientationchange', maybeSwap);

  return video;
}

function extractFromRows(rows) {
  const urlRegex = /(https?:\/\/[^\s]+)/i;
  const values = { desktopUrl: '', mobileUrl: '', altText: '' };
  const urlRows = new Set();

  rows.forEach((row) => {
    const cells = Array.from(row.children);
    const cell = cells[0] || row;
    const a = cell.querySelector('a');
    const text = (cell.textContent || '').trim();

    if (a && a.href) {
      if (!values.desktopUrl) { values.desktopUrl = a.href.trim(); urlRows.add(row); return; }
      if (!values.mobileUrl) { values.mobileUrl = a.href.trim(); urlRows.add(row); return; }
    }

    const m = text.match(urlRegex);
    if (m) {
      if (!values.desktopUrl) { values.desktopUrl = m[1].trim(); urlRows.add(row); return; }
      if (!values.mobileUrl) { values.mobileUrl = m[1].trim(); urlRows.add(row); return; }
    }

    if (!m && !values.altText) {
      const lower = text.toLowerCase();
      if (lower.includes('alt') || lower.includes('description')) {
        const idx = text.indexOf(':');
        values.altText = idx >= 0 ? text.slice(idx + 1).trim() : (text || '').trim();
      }
    }
  });

  return { ...values, rowsToExclude: Array.from(urlRows) };
}

function buildOverlayFromRows(rows, rowsToExclude = []) {
  const overlay = document.createElement('div');
  overlay.className = 'cmp-text';
  const frag = document.createDocumentFragment();
  rows.forEach((row) => {
    if (!rowsToExclude.includes(row)) {
      frag.append(row.cloneNode(true));
    }
  });
  overlay.append(frag);
  return overlay;
}

export default async function decorate(block) {
  block.classList.add('hero');

  const originalRows = Array.from(block.children);
  const {
    desktopUrl, mobileUrl, altText, rowsToExclude,
  } = extractFromRows(originalRows);
  const overlay = buildOverlayFromRows(originalRows, rowsToExclude);

  block.textContent = '';
  block.dataset.embedLoaded = 'false';
  if (overlay.childNodes.length) block.append(overlay);

  const hasAnyDirect = isDirectMediaUrl(desktopUrl) || isDirectMediaUrl(mobileUrl);
  if (!hasAnyDirect) return;

  const player = document.createElement('div');
  player.className = 'hero-player';
  block.append(player);

  const start = () => {
    const video = createVideoEl({ desktopUrl, mobileUrl, altText });
    const wrapper = document.createElement('div');
    wrapper.className = 'hero-video-background';
    Object.assign(wrapper.style, {
      left: '0', width: '100%', height: '0', position: 'relative', paddingBottom: '56.25%',
    });
    Object.assign(video.style, {
      position: 'absolute', top: '0', left: '0', width: '100%', height: '100%', objectFit: 'cover',
    });

    wrapper.appendChild(video);
    player.append(wrapper);

    const markLoaded = () => {
      block.dataset.embedLoaded = 'true';
      video.removeEventListener('loadeddata', markLoaded);
      video.removeEventListener('canplay', markLoaded);
      video.removeEventListener('canplaythrough', markLoaded);
    };
    video.addEventListener('loadeddata', markLoaded);
    video.addEventListener('canplay', markLoaded);
    video.addEventListener('canplaythrough', markLoaded);

    setTimeout(() => {
      if (video.paused || video.currentTime === 0) showManualPlayOverlay(wrapper, video);
    }, 1200);
  };

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        observer.disconnect();
        start();
      }
    },
    { rootMargin: '200px' },
  );
  observer.observe(block);
}
