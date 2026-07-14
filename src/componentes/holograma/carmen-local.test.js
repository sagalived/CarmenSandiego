import { describe, expect, it } from 'vitest';
import { generateCarmenReply } from './carmen-local';

describe('generateCarmenReply', () => {
  it('responde saudacao', () => {
    const result = generateCarmenReply('Ola, Carmen!');
    expect(result).toContain('Jogador');
  });

  it('responde perguntas sobre identidade', () => {
    const result = generateCarmenReply('Quem e voce?');
    expect(result).toContain('Carmen Sandiego');
  });

  it('retorna fallback para mensagem nao mapeada', () => {
    const result = generateCarmenReply('frase sem palavra-chave conhecida');
    expect(result).toContain('Jogador');
    expect(result).toContain('frase sem palavra-chave conhecida');
  });

  it('responde pergunta de horario com valor de hora', () => {
    const result = generateCarmenReply('Carmen, que horas sao?');
    expect(result).toContain('Agora sao');
  });
});
