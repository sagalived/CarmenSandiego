export const DEFAULT_CARTESIA_VOICE_ID = '8d826d43-20ad-4c56-8d37-1048eccca1bf';
/**
 * @param {{ text: string, voiceId?: string }} params
 * @returns {Promise<Blob>}
 */
export async function synthesizeCartesia({ text, voiceId = DEFAULT_CARTESIA_VOICE_ID }) {
  const response = await fetch('/api/tts/cartesia', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ text, voiceId })
  });

  if (!response.ok) {
    throw new Error(`Cartesia request failed: ${response.status}`);
  }

  return response.blob();
}
