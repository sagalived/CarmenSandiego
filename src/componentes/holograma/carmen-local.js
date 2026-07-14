const FALLBACK_RESPONSES = [
  'Boa noite, Jogador. Meu radar captou sua mensagem. Diga o proximo destino e eu preparo a rota.',
  'Estou ouvindo, Jogador. Me passe a pista certa e eu abro o mapa.',
  'Entendi, Jogador. Vamos seguir essa trilha com calma e precisão.'
];

const KNOWLEDGE_BASE = [
  {
    keywords: ['oi', 'ola', 'olá', 'bom dia', 'boa tarde', 'boa noite'],
    responses: [
      'Boa noite, Jogador. Sempre elegante, sempre alerta. Que pista voce trouxe para mim?',
      'Ola, Jogador. Eu ja estava de olho no mapa esperando sua proxima jogada.',
      'Prazer em te ver por aqui, Jogador. Vamos abrir essa investigacao com estilo.'
    ]
  },
  {
    keywords: ['quem e voce', 'quem é voce', 'quem e você', 'quem é você', 'carmen'],
    responses: [
      'Sou Carmen Sandiego, Jogador. Apareco quando uma boa pista merece alguem a altura.',
      'Carmen Sandiego, Jogador. Investigadora, estrategista e uma companhia melhor do que a maioria dos mapas.',
      'Sou Carmen Sandiego. Se ha um enigma no tabuleiro, eu costumo chegar antes da resposta.'
    ]
  },
  {
    keywords: ['ajuda', 'como funciona', 'o que voce faz', 'o que você faz'],
    responses: [
      'Fale comigo, Jogador. Eu respondo com contexto, estrategia e um pouco de provocacao quando necessario.',
      'Use a voz ou me entregue uma pergunta direta, Jogador. Eu cuido do resto com classe e rapidez.'
    ]
  },
  {
    keywords: ['brasil', 'rio', 'sao paulo', 'são paulo'],
    responses: [
      'Brasil confirmado no mapa, Jogador. Podemos abrir a rota pelo Rio e subir o nivel em Sao Paulo.',
      'Boa escolha, Jogador. Brasil sempre rende pistas interessantes entre o litoral e a selva urbana.'
    ]
  },
  {
    keywords: ['franca', 'frança', 'paris', 'europa'],
    responses: [
      'Paris sempre rende uma boa perseguicao, Jogador. Arte, historia e segredos em cada esquina.',
      'Franca no radar, Jogador. Em Paris, ate o silencio parece esconder uma pista.'
    ]
  }
];

function normalizeText(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function formatLocalTime(now = new Date()) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(now);
}

function buildQuestionAwareFallback(question) {
  const trimmed = (question || '').trim();
  if (!trimmed) {
    return FALLBACK_RESPONSES[0];
  }

  const variants = [
    `Certo, Jogador. Sobre "${trimmed}", minha leitura inicial e: vamos dividir isso em etapas e fechar um plano pratico agora.`,
    `Interessante, Jogador. Em "${trimmed}", eu vejo uma pista promissora. Quer que eu comece pelo panorama geral ou pelo ponto mais critico?`,
    `Boa jogada, Jogador. Se o tema e "${trimmed}", posso te entregar uma resposta direta ou uma estrategia mais refinada.`
  ];

  return chooseVariant(trimmed, variants);
}

function chooseVariant(seed, values) {
  const normalized = normalizeText(seed || 'carmen');
  let sum = 0;
  for (const char of normalized) {
    sum += char.charCodeAt(0);
  }

  return values[sum % values.length];
}

export function generateCarmenReply(question) {
  const normalized = normalizeText(question || '');

  if (/(que horas|horas|hora agora|horario|horário)/.test(normalized)) {
    return `Boa noite, Jogador. Agora sao ${formatLocalTime()}. Relogio alinhado, vantagem nossa.`;
  }

  if (/(data de hoje|que dia e hoje|que dia e|dia de hoje)/.test(normalized)) {
    const today = new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(new Date());
    return `Jogador, hoje e ${today}. Data confirmada no meu painel de operacoes.`;
  }

  for (const entry of KNOWLEDGE_BASE) {
    if (entry.keywords.some((keyword) => normalized.includes(keyword))) {
      return chooseVariant(question, entry.responses);
    }
  }

  return buildQuestionAwareFallback(question);
}
