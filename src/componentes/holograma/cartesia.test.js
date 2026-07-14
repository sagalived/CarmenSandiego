import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CARTESIA_VOICE_ID, synthesizeCartesia } from './cartesia';

describe('cartesia client', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new Blob(['audio']), { status: 200 })));
  });

  it('usa a voz padrao da Carmen', () => {
    expect(DEFAULT_CARTESIA_VOICE_ID).toBe('8d826d43-20ad-4c56-8d37-1048eccca1bf');
  });

  it('chama o endpoint local do backend com texto e voz', async () => {
    await synthesizeCartesia({ text: 'teste' });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith('/api/tts/cartesia', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: 'teste',
        voiceId: DEFAULT_CARTESIA_VOICE_ID
      })
    });
  });
});
