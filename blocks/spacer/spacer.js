export default async function decorate(block) {
  const rows = [...block.children];

  rows.forEach((row) => {
    const cell = row.children[0];
    const textContent = cell.textContent.trim().toLowerCase();

    // Apply height class based on configuration value
    const validSizes = ['s-20', 'm-54', 'l-70', 'xl-100', 'xxl-120', 'xxxl-140'];
    if (validSizes.includes(textContent)) {
      block.classList.add(textContent);
    }
    row.remove();
  });
}
