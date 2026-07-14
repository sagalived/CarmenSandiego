import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isImageRequest, searchImageForCarmen } from './image-search';

describe('image-search helpers', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      query: 'paris',
      title: 'Paris at night',
      imageUrl: 'https://example.com/paris.jpg',
      pageUrl: 'https://example.com/page',
      source: 'wikimedia'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })));
  });

  it('detecta pedidos de imagem', () => {
    expect(isImageRequest('Carmen, mostra uma imagem de Paris')).toBe(true);
    expect(isImageRequest('Carmen, faca uma imagem de um peixe de chapeu')).toBe(true);
    expect(isImageRequest('Carmen, qual a capital da Franca?')).toBe(false);
  });

  it('chama endpoint de busca de imagem', async () => {
    const result = await searchImageForCarmen({ question: 'mostre uma foto de paris' });

    expect(result.imageUrl).toBe('https://example.com/paris.jpg');
    expect(fetch).toHaveBeenCalledWith('/api/ai/image-search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ question: 'mostre uma foto de paris' })
    });
  });
});
