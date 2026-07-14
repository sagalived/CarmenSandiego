const SARCASM_OPENERS = [
  "Ah, finalmente uma pergunta decente.",
  "Que surpresa... voce resolveu falar comigo agora.",
  "Otimo, vamos fingir que isso nao era obvio.",
  "Perfeito. Eu explico, voce acompanha.",
];

const HUMAN_REPLIES = {
  greeting: [
    "Boa noite, jogador. Gostei da energia. Qual pista quer abrir primeiro?",
    "Oi, jogador. Vamos direto ao ponto ou voce prefere um misterio dramatico?",
    "Perfeito, voce chegou. Diga o alvo e eu monto a rota em segundos.",
  ],
  status: [
    "Tudo limpo por aqui: audio estavel, rastreio ativo e Carmen no comando.",
    "Sistemas em ordem. Sem ruido no canal e com resposta em tempo real.",
    "Status impecavel. Se algo escapar, nao vai ser por falta de estilo.",
  ],
  clues: [
    "Tenho uma trilha elegante: Lisboa, Bogota e Toquio. Ninguem corre de mim por muito tempo.",
    "Seu alvo foi discreto, mas nao o bastante. Peguei movimentacao em tres capitais.",
    "A pista e fina: triangulo internacional com rastro digital quase invisivel.",
  ],
  unknown: [
    "Entendi o que voce quer. Me de um detalhe a mais e eu te devolvo algo cirurgico.",
    "Boa pergunta. Quer foco em pessoas, locais ou cronologia da operacao?",
    "Certo. Posso resumir em 20 segundos ou abrir uma analise completa. Qual prefere?",
  ],
};

export const pickBySeed = (text, options) => {
  if (!options?.length) return "";
  const seed = (text || "").split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return options[seed % options.length];
};

export const pickSarcasmOpener = (seedText) => {
  const seed = (seedText || "").split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return SARCASM_OPENERS[seed % SARCASM_OPENERS.length];
};

export const buildCarmenStyleReply = (text, style) => {
  if (!text) return text;
  if (style !== "sarcastica") return text;

  const trimmed = text.trim();
  const opener = pickSarcasmOpener(trimmed);
  return `${opener} ${trimmed}`;
};

export const humanizeSpeechText = (text) => {
  if (!text) return "";

  let output = text.replace(/\s+/g, " ").trim();
  output = output.replace(/\bAI\b/g, "A I");
  output = output.replace(/\bpt-BR\b/gi, "portugues do Brasil");

  if (!/[.!?]$/.test(output)) {
    output += ".";
  }

  return output;
};

export const sanitizeRoboticReply = (text) => {
  if (!text) return "";

  const robotPatterns = [
    /processando sua solicitacao/i,
    /processando os dados em tempo real/i,
    /aguarde enquanto/i,
    /sou uma ia/i,
  ];

  if (robotPatterns.some((pattern) => pattern.test(text))) {
    return "Certo, jogador. Ja cruzei os sinais principais e tenho um caminho promissor para voce.";
  }

  return text;
};

export const getLocalReply = (message, context = {}) => {
  const normalized = message.toLowerCase();

  if (normalized.includes("status")) {
    return pickBySeed(message, HUMAN_REPLIES.status);
  }

  if (normalized.includes("miss") || normalized.includes("alvo") || normalized.includes("pista")) {
    return pickBySeed(message, HUMAN_REPLIES.clues);
  }

  if (normalized.includes("olá") || normalized.includes("boa noite") || normalized.includes("bom dia")) {
    return pickBySeed(message, HUMAN_REPLIES.greeting);
  }

  if (normalized.includes("silêncio") || normalized.includes("parar voz")) {
    return "Entendido. Entrando em modo silencioso até nova ordem.";
  }

  if (context.lastUserText && normalized.includes("explica") && context.lastCarmenText) {
    return `Claro. Em resumo: ${context.lastCarmenText} Quer que eu transforme isso em um plano de acao?`;
  }

  return pickBySeed(message, HUMAN_REPLIES.unknown);
};