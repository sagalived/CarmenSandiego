/**
 * @param {{ question: string, history?: Array<{ role: string, text: string }> }} params
 * @returns {Promise<{ reply: string, source: string }>}
 */
export async function generateCarmenAiReply({ question, history = [] }) {
  const response = await fetch('/api/ai/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ question, history })
  });

  if (!response.ok) {
    throw new Error(`AI request failed: ${response.status}`);
  }

  const payload = await response.json();
  if (typeof payload.reply !== 'string' || !payload.reply.trim()) {
    throw new Error('AI retornou resposta vazia');
  }

  return {
    reply: payload.reply,
    source: typeof payload.source === 'string' ? payload.source : 'unknown'
  };
}