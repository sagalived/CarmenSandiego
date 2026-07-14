import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateCarmenAiReply } from './ai';

describe('generateCarmenAiReply', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ reply: 'Resposta unificada', source: 'deepseek' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })));
  });

  it('chama o endpoint unificado de IA', async () => {
    const result = await generateCarmenAiReply({
      question: 'Crie um plano',
      history: [{ role: 'user', text: 'Boa noite' }]
    });

    expect(result).toEqual({
      reply: 'Resposta unificada',
      source: 'deepseek'
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith('/api/ai/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        question: 'Crie um plano',
        history: [{ role: 'user', text: 'Boa noite' }]
      })
    });
  });
});
