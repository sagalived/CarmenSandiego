import { describe, expect, it } from 'vitest';
import { getAssistantStatus } from './status';

describe('getAssistantStatus', () => {
  it('retorna falando quando esta falando', () => {
    expect(getAssistantStatus({ isSpeaking: true, isProcessing: true, isListening: true })).toBe('falando');
  });

  it('retorna pensando quando nao esta falando e esta processando', () => {
    expect(getAssistantStatus({ isSpeaking: false, isProcessing: true, isListening: true })).toBe('pensando');
  });

  it('retorna ouvindo quando nao esta falando/processando e esta ouvindo', () => {
    expect(getAssistantStatus({ isSpeaking: false, isProcessing: false, isListening: true })).toBe('ouvindo');
  });

  it('retorna pronta quando nenhum estado ativo', () => {
    expect(getAssistantStatus({ isSpeaking: false, isProcessing: false, isListening: false })).toBe('pronta');
  });
});
