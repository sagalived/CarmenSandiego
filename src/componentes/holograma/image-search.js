/**
 * @param {string} text
 * @returns {boolean}
 */
export function isImageRequest(text) {
  const normalized = (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  return /(imagem|foto|figura|quadro|mostra|mostre|quero ver|pesquise imagem|procure imagem|ilustracao|desenho|faca uma imagem|faça uma imagem|gere uma imagem|crie uma imagem)/.test(normalized);
}

/**
 * @param {{ question: string }} params
 * @returns {Promise<{query: string, title: string, imageUrl: string, pageUrl: string, source: string}>}
 */
export async function searchImageForCarmen({ question }) {
  const response = await fetch('/api/ai/image-search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ question })
  });

  if (!response.ok) {
    throw new Error(`Image search failed: ${response.status}`);
  }

  const payload = await response.json();
  if (typeof payload.imageUrl !== 'string' || !payload.imageUrl) {
    throw new Error('Busca de imagem sem URL');
  }

  return payload;
}
