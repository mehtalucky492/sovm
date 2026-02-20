import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

export default async function decorate(block) {
  // Load footer fragment
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : '/footer';
  const fragment = await loadFragment(footerPath);

  // Clear the block and append fresh footer content
  block.textContent = '';
  const footer = document.createElement('div');

  while (fragment.firstElementChild) {
    footer.append(fragment.firstElementChild);
  }

  // Append footer wrapper to DOM FIRST
  block.append(footer);

  // Get sections inside this footer block
  const sections = footer.querySelectorAll('.section');

  const classList = [
    'region-logo',
    'region-menu',
    'region-logo-otsuka',
    'region-prc-copyright',
  ];

  sections.forEach((section, index) => {
    if (classList[index]) {
      section.classList.add(classList[index]);
    }
  });

  // Assign classes to the 2 ULs inside region-menu
  const regionMenu = footer.querySelector('.region-menu .default-content-wrapper');
  if (regionMenu) {
    const uls = regionMenu.querySelectorAll('ul');

    if (uls[0]) {
      uls[0].classList.add('inline-menu');
    }
    if (uls[1]) {
      uls[1].classList.add('social-menu');
    }
  }

  // Create <div class="row">
  const row = document.createElement('div');
  row.classList.add('row');

  // Move sections & insert <hr> after section 3
  sections.forEach((section, index) => {
    row.append(section);
    if (index === 1) {
      const hr = document.createElement('hr');
      hr.classList.add('footer-divider');
      row.append(hr);
    }
  });

  // Create container wrapper
  const container = document.createElement('div');
  container.classList.add('container');

  // Put the row inside the container
  container.append(row);

  // Clear footer and insert container
  footer.innerHTML = '';
  footer.append(container);

  function wrapPictureWithLink(sectionSelector, href, ariaLabel) {
    const section = block.querySelector(sectionSelector);
    if (!section) return;

    const picture = section.querySelector('picture');
    if (!picture) return;

    // Prevent double wrapping
    if (picture.closest('a')) return;

    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.classList.add('footer-logo-link');

    if (ariaLabel) {
      anchor.setAttribute('aria-label', ariaLabel);
    }

    picture.replaceWith(anchor);
    anchor.appendChild(picture);
  }

  wrapPictureWithLink(
    '.region-logo',
    '/',
  );

  wrapPictureWithLink(
    '.region-logo-otsuka',
    'https://otsuka-us.com/',
    'Link (opens in a new window)',
  );
}
