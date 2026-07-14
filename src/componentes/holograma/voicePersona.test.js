import { describe, expect, it } from "vitest";
import {
  buildCarmenStyleReply,
  getLocalReply,
  humanizeSpeechText,
  pickBySeed,
  sanitizeRoboticReply,
} from "./voicePersona";

describe("voicePersona", () => {
  it("normaliza texto para fala com pontuacao final", () => {
    expect(humanizeSpeechText("  ola   mundo  ")).toBe("ola mundo.");
    expect(humanizeSpeechText("texto com AI e pt-BR")).toBe("texto com A I e portugues do Brasil.");
  });

  it("aplica estilo sarcastico quando configurado", () => {
    const response = buildCarmenStyleReply("Vamos com calma", "sarcastica");
    expect(response).toContain("Vamos com calma");
    expect(response).not.toBe("Vamos com calma");
  });

  it("nao altera texto quando estilo nao e sarcastico", () => {
    expect(buildCarmenStyleReply("Resposta direta", "firme")).toBe("Resposta direta");
  });

  it("remove padroes roboticos", () => {
    const robotic = "Estou processando os dados em tempo real para voce";
    expect(sanitizeRoboticReply(robotic)).toContain("jogador");
  });

  it("mantem resposta normal quando nao ha padrao robotico", () => {
    const human = "Encontrei duas pistas concretas para seguir";
    expect(sanitizeRoboticReply(human)).toBe(human);
  });

  it("retorna respostas de status quando pergunta por status", () => {
    const reply = getLocalReply("me passe o status");
    expect(reply.toLowerCase()).toMatch(/status|sistemas|audio|canal/);
  });

  it("usa contexto para explicacao", () => {
    const reply = getLocalReply("explica melhor", {
      lastUserText: "detalhe",
      lastCarmenText: "O alvo trocou de rota",
    });
    expect(reply).toContain("O alvo trocou de rota");
  });

  it("pickBySeed e deterministico", () => {
    const options = ["a", "b", "c"];
    expect(pickBySeed("abc", options)).toBe(pickBySeed("abc", options));
  });
});
