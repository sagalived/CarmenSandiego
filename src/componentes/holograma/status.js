export function getAssistantStatus({ isSpeaking, isProcessing, isListening }) {
  if (isSpeaking) return 'falando';
  if (isProcessing) return 'pensando';
  if (isListening) return 'ouvindo';
  return 'pronta';
}
