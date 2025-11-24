/**
 * Renderiza um componente em um container específico.
 * @param {string} selector - O seletor CSS do container onde o componente será renderizado.
 * @param {Function} renderFunction - A função que retorna o HTML do componente.
 * @param {number} count - Quantas vezes o componente será repetido (default: 1).
 */
export function renderComponent(selector, renderFunction, count = 1) {
  const container = document.querySelector(selector);
  if (!container) return; // se o container não existe, sai sem erro

  for (let i = 0; i < count; i++) {
    container.insertAdjacentHTML('beforeend', renderFunction());
  }
}
