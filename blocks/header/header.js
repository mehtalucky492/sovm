import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';
import { acdl } from '../../scripts/scripts.js';

// media query match that indicates desktop width
const isDesktop = window.matchMedia('(min-width: 768px)');

function updateHeaderHeight() {
  const navWrapper = document.querySelector('.nav-wrapper');
  if (!navWrapper) return;

  document.documentElement.style.setProperty(
    '--header-height',
    `${navWrapper.offsetHeight}px`,
  );
}

function toggleAllNavSections(sections, expanded = false) {
  sections
    .querySelectorAll('.nav-sections .default-content-wrapper > ul > li')
    .forEach((section) => {
      section.setAttribute('aria-expanded', expanded);
    });
}
function closeOnEscape(e) {
  if (e.code === 'Escape') {
    const nav = document.getElementById('nav');
    const navSections = nav.querySelector('.nav-sections');
    const navSectionExpanded = navSections.querySelector(
      '[aria-expanded="true"]',
    );

    if (navSectionExpanded && isDesktop.matches) {
      toggleAllNavSections(navSections);
      navSectionExpanded.focus();
    } else if (!isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleMenu(nav, navSections);
      nav.querySelector('button').focus();
    }
  }
}

function closeOnFocusLost(e) {
  const nav = e.currentTarget;
  if (!nav.contains(e.relatedTarget)) {
    const navSections = nav.querySelector('.nav-sections');
    const navSectionExpanded = navSections.querySelector(
      '[aria-expanded="true"]',
    );

    if (navSectionExpanded && isDesktop.matches) {
      toggleAllNavSections(navSections, false);
    } else if (!isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleMenu(nav, navSections, false);
    }
  }
}

function openOnKeydown(e) {
  const focused = document.activeElement;
  if (
    focused?.className === 'nav-drop'
    && (e.code === 'Enter' || e.code === 'Space')
  ) {
    const expanded = focused.getAttribute('aria-expanded') === 'true';
    toggleAllNavSections(focused.closest('.nav-sections'));
    focused.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  }
}

function focusNavSection() {
  document.activeElement.addEventListener('keydown', openOnKeydown);
}

function toggleMenu(nav, navSections, forceExpanded = null) {
  const expanded = forceExpanded !== null ? !forceExpanded : nav.getAttribute('aria-expanded') === 'true';

  const header = nav.closest('header');
  header?.classList.toggle('nav-open', !expanded && !isDesktop.matches);

  const button = nav.querySelector('.nav-hamburger button');

  document.body.style.overflowY = expanded || isDesktop.matches ? '' : 'hidden';

  nav.setAttribute('aria-expanded', expanded ? 'false' : 'true');

  toggleAllNavSections(
    navSections,
    expanded || isDesktop.matches ? 'false' : 'true',
  );

  button.setAttribute(
    'aria-label',
    expanded ? 'Open navigation' : 'Close navigation',
  );

  const navDrops = navSections.querySelectorAll('.nav-drop');

  if (isDesktop.matches) {
    navDrops.forEach((drop) => {
      if (!drop.hasAttribute('tabindex')) {
        drop.setAttribute('tabindex', '0');
        drop.addEventListener('focus', focusNavSection);
      }
    });
  } else {
    navDrops.forEach((drop) => {
      drop.removeAttribute('tabindex');
      drop.removeEventListener('focus', focusNavSection);
    });
  }

  if (!expanded || isDesktop.matches) {
    window.addEventListener('keydown', closeOnEscape);
    nav.addEventListener('focusout', closeOnFocusLost);
  } else {
    window.removeEventListener('keydown', closeOnEscape);
    nav.removeEventListener('focusout', closeOnFocusLost);
  }
}

function markActiveNavItem(nav) {
  const currentPath = window.location.pathname.replace(/\/$/, '') || '/';

  nav.querySelectorAll('.nav-sections a[href]').forEach((link) => {
    const href = link.getAttribute('href');
    if (!href || href === '#') return;

    const linkPath = new URL(href, window.location.origin).pathname.replace(/\/$/, '');

    if (linkPath === currentPath) {
      link.classList.add('is-active');

      const li = link.closest('li');
      li?.classList.add('is-active');

      // If inside dropdown, also mark parent nav-drop
      const parentDrop = link.closest('.nav-drop');
      parentDrop?.classList.add('is-active');
    }
  });
}

/**
 * Header decorator
 */
export default async function decorate(block) {
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';

  const fragment = await loadFragment(navPath);
  if (!fragment) return;

  block.textContent = '';

  const nav = document.createElement('nav');
  nav.id = 'nav';

  while (fragment.firstElementChild) {
    nav.append(fragment.firstElementChild);
  }

  const fragmentContainer = nav.querySelector('.fragment-container');

  ['brand', 'sections', 'tools'].forEach((cls, i) => {
    const section = nav.children[i];
    if (section) section.classList.add(`nav-${cls}`);
  });

  const navBrand = nav.querySelector('.nav-brand');
  const brandLink = navBrand?.querySelector('.button');
  if (brandLink) {
    brandLink.className = '';
    brandLink
      .closest('.button-container')
      ?.classList.remove('button-container');
  }

  const navSections = nav.querySelector('.nav-sections');
  if (navSections) {
    const uls = navSections.querySelectorAll(
      ':scope .default-content-wrapper > ul',
    );

    if (uls[0]) uls[0].classList.add('inline-menu');
    if (uls[1]) uls[1].classList.add('social-icons');
    navSections
      .querySelectorAll(':scope .default-content-wrapper > ul > li')
      .forEach((navSection) => {
        if (navSection.querySelector('ul')) {
          navSection.classList.add('nav-drop');
        }

        navSection.addEventListener('click', () => {
          if (isDesktop.matches) {
            const expanded = navSection.getAttribute('aria-expanded') === 'true';
            toggleAllNavSections(navSections);
            navSection.setAttribute(
              'aria-expanded',
              expanded ? 'false' : 'true',
            );
            acdl.pushEvent('componentClick', {
              component: {
                componentType: 'header',
                componentTitle: 'nav-section',
                componentPath: 'header:nav-section',
                action: expanded ? 'close' : 'open',
              },
            });
          }
        });
      });
  }

  const hamburger = document.createElement('div');
  hamburger.className = 'nav-hamburger';
  hamburger.innerHTML = `
    <button type="button" aria-controls="nav" aria-label="Open navigation">
      <span class="nav-hamburger-icon"></span>
    </button>
  `;
  hamburger.addEventListener('click', () => {
    const expanded = nav.getAttribute('aria-expanded') === 'true';
    toggleMenu(nav, navSections);

    requestAnimationFrame(updateHeaderHeight);

    acdl.pushEvent('componentClick', {
      component: {
        componentType: 'header',
        componentTitle: 'hamburger',
        componentPath: 'header:hamburger',
        action: expanded ? 'close' : 'open',
      },
    });
  });

  nav.prepend(hamburger);

  nav.setAttribute('aria-expanded', 'false');
  toggleMenu(nav, navSections, isDesktop.matches);
  isDesktop.addEventListener('change', () => toggleMenu(nav, navSections, isDesktop.matches));

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';

  if (fragmentContainer) {
    navWrapper.append(fragmentContainer);
  }

  navWrapper.append(nav);
  markActiveNavItem(nav);

  nav.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (!a) return;

    const text = a.textContent.trim();
    const { href } = a;

    acdl.pushEvent('componentClick', {
      component: {
        componentType: 'header',
        componentTitle: 'nav-link',
        componentPath: 'header:nav-link',
        linkText: text,
        linkUrl: href,
      },
    });
  });

  block.append(navWrapper);
  requestAnimationFrame(updateHeaderHeight);
  window.addEventListener('resize', updateHeaderHeight);

  // wrapping picture with anchor element
  const picture = block.querySelector('.default-content-wrapper picture');

  if (picture) {
    const logoanchor = document.createElement('a');
    logoanchor.href = '/';
    logoanchor.classList.add('header-logo-link');

    picture.replaceWith(logoanchor);
    logoanchor.appendChild(picture);
  }
  // prevent scroll to top for nav item get involved
  nav.querySelectorAll('.nav-drop > .button-container > a[href="#"]').forEach((trigger) => {
    trigger.addEventListener('click', (e) => {
    // Prevent scroll-to-top
      e.preventDefault();
    });
  });

  acdl.push({
    component: {
      componentType: 'header',
      componentTitle: 'global-header',
      componentPath: 'blocks/header',
    },
  });
}
