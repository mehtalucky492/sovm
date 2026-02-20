function extractReferenceUrl(html) {
  if (!html) return '';

  const temp = document.createElement('div');
  temp.innerHTML = html;

  const a = temp.querySelector('a');
  if (a) return a.getAttribute('href');

  const img = temp.querySelector('img');
  if (img) return img.getAttribute('src');

  return html.replace(/<[^>]*>/g, '').trim();
}

function cleanText(value) {
  return value.replace(/<[^>]*>/g, '').trim();
}

function mapRowsToObject(rows) {
  const [
    background,
    image,
    alt,
    title,
    text,
    ctatext,
    ctalink,
    svgpath,
    svgtext,
    isLogo,
  ] = rows;

  return {
    background: cleanText(background?.[0] || ''),
    image: image?.[0] || '',
    alt: cleanText(alt?.[0] || ''),
    title: cleanText(title?.[0] || ''),
    text: cleanText(text?.[0] || ''),
    ctatext: cleanText(ctatext?.[0] || ''),
    ctalink: ctalink?.[0] || '',
    svgpath: svgpath?.[0] || '',
    svgtext: cleanText(svgtext?.[0] || ''),
    isLogo: cleanText(isLogo?.[0] || 'no') === 'yes',
  };
}

export default function decorate(block) {
  const section = block.closest('.section');
  const rows = [...block.children].map((row) => [...row.children].map((c) => c.innerHTML.trim()));

  const data = mapRowsToObject(rows);

  const wrapper = document.createElement('div');
  wrapper.className = 'sovm-cards-wrapper';

  if (data.background) {
    wrapper.classList.add(data.background);
  }

  const isGrid3 = section?.classList.contains('grid-3');

  if (isGrid3) {
    wrapper.classList.add('grid-3');
  } else {
    wrapper.classList.add('no-grid');
  }

  const card = document.createElement('div');
  card.className = 'sovm-card';

  // ----- IMAGE -----
  if (data.image) {
    const imgSrc = extractReferenceUrl(data.image);

    const imageWrapper = document.createElement('div');
    imageWrapper.className = 'sovm-card-image';

    // applying logo class for grid
    if (isGrid3 && data.isLogo) {
      imageWrapper.classList.add('is-logo');
    }

    imageWrapper.innerHTML = `
      <picture>
        <source srcset="${imgSrc}" type="image/webp">
        <img src="${imgSrc}" alt="${data.alt || ''}">
      </picture>
    `;

    card.append(imageWrapper);
  }

  // ----- CONTENT -----
  const content = document.createElement('div');
  content.className = 'sovm-card-content';

  if (data.title) {
    const h3 = document.createElement('h3');
    h3.textContent = data.title;
    content.append(h3);
  }

  if (data.text) {
    const p = document.createElement('p');
    p.textContent = data.text;
    content.append(p);
  }

  // ----- CTA BUTTON -----
  if (data.ctatext) {
    const btn = document.createElement('a');
    btn.className = 'sovm-btn';

    btn.href = data.ctalink
      ? extractReferenceUrl(data.ctalink)
      : '#';

    if (data.svgpath && data.svgtext) {
      const svg = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'svg',
      );
      svg.classList.add('icon');

      const use = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'use',
      );

      const iconPath = extractReferenceUrl(data.svgpath);

      use.setAttributeNS(
        'http://www.w3.org/1999/xlink',
        'xlink:href',
        `${iconPath}#${data.svgtext}`,
      );

      svg.append(use);
      btn.append(svg);
    }

    const span = document.createElement('span');
    span.textContent = data.ctatext;
    btn.append(span);

    content.append(btn);
  }

  card.append(content);
  wrapper.append(card);

  block.replaceChildren(wrapper);
}
