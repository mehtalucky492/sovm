import { moveInstrumentation } from '../../scripts/scripts.js';

export default function decorate(block) {
  const [row] = block.children;
  const cell = row?.firstElementChild;

  if (!cell) return;

  const heading = cell.querySelector('h1, h2, h3, h4, h5, h6');

  if (heading) {
    moveInstrumentation(cell, heading);
    block.textContent = '';
    block.appendChild(heading);
  }
}
