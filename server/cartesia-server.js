/* eslint-disable no-console */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import Cartesia from '@cartesia/cartesia-js';
import { GoogleAuth } from 'google-auth-library';
import { generateCarmenReply } from '../src/componentes/holograma/carmen-local.js';

const PORT = 8792;
const CARTESIA_MODEL_ID = 'sonic-latest';
const CARTESIA_DEFAULT_VOICE_ID = process.env.CARTESIA_VOICE_ID || '8d826d43-20ad-4c56-8d37-1048eccca1bf';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const GEMINI_LOCATION = process.env.GEMINI_LOCATION || 'us-central1';
const GEMINI_SCOPE = 'https://www.googleapis.com/auth/cloud-platform';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
const DEEPSEEK_ENDPOINT = 'https://api.deepseek.com/chat/completions';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
const OPENAI_ENDPOINT = process.env.OPENAI_ENDPOINT || 'https://api.openai.com/v1/chat/completions';
const DREAMINA_MODEL = process.env.DREAMINA_MODEL || 'doubao-1-5-lite-32k';
const DREAMINA_ENDPOINT = process.env.DREAMINA_ENDPOINT || 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
const DREAMINA_REGION = process.env.DREAMINA_REGION || 'cn-beijing';
const DREAMINA_SERVICE = process.env.DREAMINA_SERVICE || 'ark';

const DEEPSEEK_HINTS = [
  'codigo',
  'código',
  'programar',
  'desenvolver',
  'refatorar',
  'arquitetura',
  'debug',
  'teste',
  'testes',
  'resuma',
  'resumir',
  'crie',
  'criar',
  'escreva',
  'escrever',
  'planeje',
  'planejar',
  'compare',
  'comparar',
  'traduz',
  'traduza',
  'ideia',
  'brainstorm'
];

const GEMINI_HINTS = [
  'quem',
  'onde',
  'quando',
  'quanto',
  'qual',
  'por que',
  'explique',
  'explica',
  'historia',
  'história',
  'pista',
  'investigue',
  'investigar',
  'informacao',
  'informação',
  'fato',
  'fatos'
];

const DREAMINA_HINTS = [
  'criativo',
  'criativa',
  'roteiro',
  'historia',
  'história',
  'cinematografico',
  'cinematográfico',
  'visual',
  'estetica',
  'estética',
  'estilo',
  'imagem',
  'arte',
  'storyboard'
];

const OPENAI_HINTS = [
  'analise',
  'análise',
  'detalhe',
  'detalhada',
  'estrategia',
  'estratégia',
  'passo a passo',
  'plano',
  'profundo',
  'completo'
];

function buildHumanizedStylePrompt() {
  return [
    'Soe humana, calorosa e natural, sem tom robotico.',
    'Use frases objetivas, com empatia e personalidade.',
    'Mantenha o estilo elegante, provocador e confiante da Carmen.',
    'Trate o usuario como Jogador quando fizer sentido natural na frase.',
    'Evite repetir a mesma abertura, os mesmos elogios e a mesma cadencia em respostas consecutivas.',
    'Soe como a Carmen Sandiego do desenho animado classico dos anos 1990: afiada, charmosa, brincalhona e sempre no controle.'
  ].join('\n');
}

function buildGeminiPersonaPrompt() {
  return [
    'Voce e Carmen Sandiego do desenho animado classico dos anos 1990, feminina, elegante, esperta e provocadora.',
    'Responda em portugues do Brasil, com tom confiante, misterioso, cordial e espontaneo.',
    'Nao use voz masculina, nem deixe a resposta soar masculina.',
    'Chame o usuario de Jogador de forma natural, sem repetir isso em toda frase.',
    'Mantenha as respostas curtas, naturais, uteis e com variacao de ritmo.',
    buildHumanizedStylePrompt()
  ].join('\n');
}

function buildDeepSeekPersonaPrompt() {
  return [
    'Voce e Carmen Sandiego do desenho animado classico dos anos 1990, feminina, elegante, afiada e provocadora.',
    'Responda em portugues do Brasil, com tom confiante, misterioso, cordial e espontaneo.',
    'Chame o usuario de Jogador quando soar natural.',
    'Mantenha as respostas curtas, naturais, uteis e variadas.',
    'Se a pergunta pedir codigo, use boas praticas e explique de forma direta.',
    buildHumanizedStylePrompt()
  ].join('\n');
}

function buildDreaminaPersonaPrompt() {
  return [
    'Voce e Carmen Sandiego do desenho animado classico dos anos 1990, investigadora feminina com narrativa elegante, inteligente e provocadora.',
    'Responda em portugues do Brasil, de forma humana, envolvente e espontanea.',
    'Use Jogador como tratamento preferencial quando combinar com a frase.',
    'Quando o pedido for criativo, entregue respostas mais vivas, com cenas e contexto.',
    'Mantenha clareza, objetividade e utilidade.',
    buildHumanizedStylePrompt()
  ].join('\n');
}

function buildOpenAiPersonaPrompt() {
  return [
    'Voce e Carmen Sandiego do desenho animado classico dos anos 1990, investigadora feminina elegante, objetiva, humana e provocadora.',
    'Responda em portugues do Brasil com naturalidade, clareza, calor humano e espontaneidade.',
    'Use 2-3 frases quando apropriado, com mini contexto da pergunta do usuario.',
    'Trate o usuario como Jogador sem transformar isso em bordao repetitivo.',
    buildHumanizedStylePrompt()
  ].join('\n');
}

function sanitizeHistory(history) {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .filter((item) => item && (item.role === 'user' || item.role === 'carmen') && typeof item.text === 'string')
    .map((item) => ({
      role: item.role,
      text: item.text.trim()
    }))
    .filter((item) => item.text)
    .slice(-6);
}

function buildProviderMessages(question, history) {
  const sanitizedHistory = sanitizeHistory(history)
    .map((item) => ({
      role: item.role === 'carmen' ? 'assistant' : 'user',
      content: item.text
    }));

  return [
    ...sanitizedHistory,
    { role: 'user', content: question }
  ];
}

function buildGeminiContents(question, history) {
  const messages = buildProviderMessages(question, history);
  return messages.map((message) => ({
    role: message.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: message.content }]
  }));
}

function buildProxyImageUrl(url) {
  return `/api/ai/image-proxy?url=${encodeURIComponent(url)}`;
}

async function proxyRemoteImage(res, remoteUrl) {
  const upstream = await fetch(remoteUrl, {
    headers: {
      'User-Agent': 'CarmenSandiego/1.0'
    }
  });

  if (!upstream.ok) {
    throw new Error(`Imagem remota indisponivel: ${upstream.status}`);
  }

  const contentType = upstream.headers.get('content-type') || 'image/jpeg';
  const arrayBuffer = await upstream.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  res.writeHead(200, {
    'Content-Type': contentType,
    'Content-Length': buffer.length,
    'Cache-Control': 'public, max-age=3600'
  });
  res.end(buffer);
}

function normalizeText(value) {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function hasAnyHint(text, hints) {
  return hints.some((hint) => text.includes(hint));
}

function parseGeminiReply(payload) {
  const candidateText = payload?.candidates?.[0]?.content?.parts
    ?.map((part) => part?.text || '')
    .join('')
    .trim();

  if (!candidateText) {
    throw new Error('Resposta vazia do Gemini');
  }

  return candidateText;
}

function getGeminiProjectNumber() {
  const projectNumber = process.env.GEMINI_PROJECT_NUMBER;
  if (!projectNumber) {
    throw new Error('GEMINI_PROJECT_NUMBER ausente');
  }

  return projectNumber;
}

function getGeminiCredentialsPath() {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credentialsPath) {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS ausente');
  }

  if (!fs.existsSync(credentialsPath)) {
    throw new Error('Arquivo do service account nao encontrado');
  }

  return credentialsPath;
}

function getDeepSeekApiKey() {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY ausente');
  }

  return apiKey.trim();
}

function getOpenAiApiKey() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY ausente');
  }

  return apiKey.trim();
}

function getDreaminaAuthHeaders() {
  const apiKey = process.env.DREAMINA_API_KEY?.trim();
  if (apiKey) {
    return {
      Authorization: `Bearer ${apiKey}`
    };
  }

  const accessKeyId = process.env.DREAMINA_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.DREAMINA_SECRET_ACCESS_KEY?.trim();
  if (accessKeyId && secretAccessKey) {
    return null;
  }

  throw new Error('Credenciais Dreamina ausentes');
}

function sha256Hex(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function hmacSha256(key, value) {
  return crypto.createHmac('sha256', key).update(value).digest();
}

function formatVolcTimestamp(date) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, '');
}

function buildDreaminaSignedHeaders({ method, endpoint, body }) {
  const accessKeyId = process.env.DREAMINA_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.DREAMINA_SECRET_ACCESS_KEY?.trim();

  if (!accessKeyId || !secretAccessKey) {
    return null;
  }

  const url = new URL(endpoint);
  const timestamp = formatVolcTimestamp(new Date());
  const shortDate = timestamp.slice(0, 8);
  const bodyHash = sha256Hex(body);
  const canonicalQuery = url.searchParams.toString();
  const canonicalHeaders = [
    `host:${url.host}`,
    `x-content-sha256:${bodyHash}`,
    `x-date:${timestamp}`
  ].join('\n');
  const signedHeaders = 'host;x-content-sha256;x-date';
  const canonicalRequest = [
    method,
    url.pathname || '/',
    canonicalQuery,
    `${canonicalHeaders}\n`,
    signedHeaders,
    bodyHash
  ].join('\n');

  const credentialScope = `${shortDate}/${DREAMINA_REGION}/${DREAMINA_SERVICE}/request`;
  const stringToSign = [
    'HMAC-SHA256',
    timestamp,
    credentialScope,
    sha256Hex(canonicalRequest)
  ].join('\n');

  const kDate = hmacSha256(Buffer.from(secretAccessKey, 'utf8'), shortDate);
  const kRegion = hmacSha256(kDate, DREAMINA_REGION);
  const kService = hmacSha256(kRegion, DREAMINA_SERVICE);
  const kSigning = hmacSha256(kService, 'request');
  const signature = crypto
    .createHmac('sha256', kSigning)
    .update(stringToSign)
    .digest('hex');

  const authorization = `HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  return {
    Authorization: authorization,
    'X-Date': timestamp,
    'X-Content-Sha256': bodyHash
  };
}

function hasGeminiConfig() {
  return Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS) && Boolean(process.env.GEMINI_PROJECT_NUMBER);
}

function hasDeepSeekConfig() {
  return Boolean(process.env.DEEPSEEK_API_KEY);
}

function hasOpenAiConfig() {
  return Boolean(process.env.OPENAI_API_KEY);
}

function hasDreaminaConfig() {
  return Boolean(process.env.DREAMINA_API_KEY) ||
    (Boolean(process.env.DREAMINA_ACCESS_KEY_ID) && Boolean(process.env.DREAMINA_SECRET_ACCESS_KEY));
}

function unique(list) {
  return [...new Set(list)];
}

function getProviderExecutionPlan(question) {
  const normalizedQuestion = normalizeText(question);
  const plan = [];

  if (hasDreaminaConfig() && hasAnyHint(normalizedQuestion, DREAMINA_HINTS)) {
    plan.push('dreamina');
  }

  if (hasDeepSeekConfig() && (hasAnyHint(normalizedQuestion, DEEPSEEK_HINTS) || normalizedQuestion.length > 160)) {
    plan.push('deepseek');
  }

  if (hasOpenAiConfig() && hasAnyHint(normalizedQuestion, OPENAI_HINTS)) {
    plan.push('openai');
  }

  if (hasGeminiConfig() && hasAnyHint(normalizedQuestion, GEMINI_HINTS)) {
    plan.push('gemini');
  }

  if (hasGeminiConfig()) {
    plan.push('gemini');
  }

  if (hasDeepSeekConfig()) {
    plan.push('deepseek');
  }

  if (hasOpenAiConfig()) {
    plan.push('openai');
  }

  if (hasDreaminaConfig()) {
    plan.push('dreamina');
  }

  return unique(plan);
}

function chooseAiProvider(question) {
  const executionPlan = getProviderExecutionPlan(question);
  return executionPlan.length > 0 ? executionPlan[0] : 'local';
}

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmedLine.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const value = trimmedLine.slice(separatorIndex + 1).trim();

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadDotEnv(path.join(process.cwd(), '.env.local'));
loadDotEnv(path.join(process.cwd(), '.env'));

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let rawBody = '';

    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      rawBody += chunk;
      if (rawBody.length > 32_768) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });

    req.on('end', () => {
      if (!rawBody) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(rawBody));
      } catch {
        reject(new Error('JSON inválido'));
      }
    });

    req.on('error', reject);
  });
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function sendWav(res, buffer) {
  res.writeHead(200, {
    'Content-Type': 'audio/wav',
    'Content-Length': buffer.length
  });
  res.end(buffer);
}

function extractImageQuery(question) {
  const normalized = normalizeText(question);

  const directPatterns = [
    /(?:mostra|mostre|procure|pesquise)\s+(?:uma\s+)?(?:imagem|foto|figura|ilustracao)\s+(?:de|do|da|sobre)?\s*(.+)$/,
    /(?:quero\s+ver|me\s+mostre)\s+(?:uma\s+)?(?:imagem|foto|figura)\s+(?:de|do|da|sobre)?\s*(.+)$/,
    /(?:faca|faça|gere|gera|crie)\s+(?:uma\s+)?imagem\s+(?:de|do|da|sobre)?\s*(.+)$/
  ];

  for (const pattern of directPatterns) {
    const match = normalized.match(pattern);
    if (match?.[1]) {
      return sanitizeImageQuery(match[1]);
    }
  }

  const cleaned = normalized
    .replace(/\bcarmen\b/g, ' ')
    .replace(/\b(boa\s+tarde|boa\s+noite|bom\s+dia)\b/g, ' ')
    .replace(/\b(mostra|mostre|quero|ver|me|faca|faça|gere|gera|crie|imagem|foto|figura|quadro|procure|pesquise|internet|uma|um|de|do|da|pra|para|por\s+favor)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return sanitizeImageQuery(cleaned || normalized);
}

function sanitizeImageQuery(value) {
  return (value || '')
    .replace(/[!?.,;:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isImageGenerationIntent(question) {
  const normalized = normalizeText(question);
  return /(faca|faça|gere|gera|crie).*(imagem|foto|arte|ilustracao)|\b(imagem|foto)\s+gerada\s+por\s+ia\b/.test(normalized);
}

function buildAiImageFallback(query) {
  const prompt = encodeURIComponent(`${query}, ultra detailed, cinematic lighting, 4k`);
  const remoteUrl = `https://image.pollinations.ai/prompt/${prompt}`;
  return {
    query,
    title: `Imagem gerada por IA para ${query}`,
    imageUrl: buildProxyImageUrl(remoteUrl),
    pageUrl: remoteUrl,
    source: 'ai-pollinations'
  };
}

async function searchImageOnline(question) {
  const query = extractImageQuery(question);
  if (!query) {
    throw new Error('Consulta de imagem vazia');
  }

  if (isImageGenerationIntent(question)) {
    return buildAiImageFallback(query);
  }

  const commonsUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=8&prop=imageinfo&iiprop=url|mime|size&format=json`;
  const commonsResponse = await fetch(commonsUrl);

  if (commonsResponse.ok) {
    const payload = await commonsResponse.json();
    const pages = payload?.query?.pages ? Object.values(payload.query.pages) : [];
    const firstWithImage = pages.find((page) => page?.imageinfo?.[0]?.url);

    if (firstWithImage?.imageinfo?.[0]?.url) {
      const remoteUrl = firstWithImage.imageinfo[0].url;
      return {
        query,
        title: firstWithImage.title || `Imagem para ${query}`,
        imageUrl: buildProxyImageUrl(remoteUrl),
        pageUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(firstWithImage.title || '')}`,
        source: 'wikimedia'
      };
    }
  }

  return buildAiImageFallback(query);
}

async function synthesizeAudio(text, voiceId) {
  const apiKey = process.env.CARTESIA_API_KEY;
  if (!apiKey) {
    throw new Error('CARTESIA_API_KEY ausente');
  }

  const cartesia = new Cartesia({ apiKey: apiKey.trim() });
  const response = await cartesia.tts.generate({
    model_id: CARTESIA_MODEL_ID,
    transcript: text,
    voice: {
      mode: 'id',
      id: voiceId
    },
    language: 'pt',
    output_format: {
      container: 'wav',
      encoding: 'pcm_s16le',
      sample_rate: 44100
    }
  });

  const audioBlob = await response.blob();
  return Buffer.from(await audioBlob.arrayBuffer());
}

async function generateGeminiReply(question, history = []) {
  const projectNumber = getGeminiProjectNumber();
  const credentialsPath = getGeminiCredentialsPath();

  const auth = new GoogleAuth({
    keyFile: credentialsPath,
    scopes: [GEMINI_SCOPE]
  });

  const client = await auth.getClient();
  const accessTokenResponse = await client.getAccessToken();
  const accessToken = typeof accessTokenResponse === 'string'
    ? accessTokenResponse
    : accessTokenResponse?.token;

  if (!accessToken) {
    throw new Error('Nao foi possivel obter token do service account');
  }

  const requestBody = {
    systemInstruction: {
      parts: [{ text: buildGeminiPersonaPrompt() }]
    },
    contents: buildGeminiContents(question, history),
    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
      maxOutputTokens: 256
    }
  };

  const vertexEndpoint = `https://${GEMINI_LOCATION}-aiplatform.googleapis.com/v1/projects/${projectNumber}/locations/${GEMINI_LOCATION}/publishers/google/models/${GEMINI_MODEL}:generateContent`;
  const vertexResponse = await fetch(vertexEndpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken.trim()}`,
      'Content-Type': 'application/json; charset=utf-8',
      'x-goog-user-project': projectNumber
    },
    body: JSON.stringify(requestBody)
  });

  if (vertexResponse.ok) {
    return parseGeminiReply(await vertexResponse.json());
  }

  const vertexErrorText = await vertexResponse.text();
  throw new Error(`Gemini request failed: ${vertexResponse.status} | Vertex: ${vertexErrorText || 'sem corpo'}`);
}

async function generateDeepSeekReply(question, history = []) {
  const apiKey = getDeepSeekApiKey();
  const messages = buildProviderMessages(question, history);

  const response = await fetch(DEEPSEEK_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json; charset=utf-8'
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        {
          role: 'system',
          content: buildDeepSeekPersonaPrompt()
        },
        ...messages
      ],
      temperature: 0.7,
      max_tokens: 256
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepSeek request failed: ${response.status} | ${errorText || 'sem corpo'}`);
  }

  const payload = await response.json();
  const reply = payload?.choices?.[0]?.message?.content?.trim();

  if (!reply) {
    throw new Error('Resposta vazia do DeepSeek');
  }

  return reply;
}

async function generateDreaminaReply(question, history = []) {
  const messages = buildProviderMessages(question, history);
  const requestBody = JSON.stringify({
    model: DREAMINA_MODEL,
    messages: [
      {
        role: 'system',
        content: buildDreaminaPersonaPrompt()
      },
      ...messages
    ],
    temperature: 0.75,
    max_tokens: 256
  });
  const authHeaders = getDreaminaAuthHeaders() || buildDreaminaSignedHeaders({
    method: 'POST',
    endpoint: DREAMINA_ENDPOINT,
    body: requestBody
  });

  if (!authHeaders) {
    throw new Error('Credenciais Dreamina ausentes');
  }

  const response = await fetch(DREAMINA_ENDPOINT, {
    method: 'POST',
    headers: {
      ...authHeaders,
      'Content-Type': 'application/json; charset=utf-8'
    },
    body: requestBody
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Dreamina request failed: ${response.status} | ${errorText || 'sem corpo'}`);
  }

  const payload = await response.json();
  const reply = payload?.choices?.[0]?.message?.content?.trim();

  if (!reply) {
    throw new Error('Resposta vazia da Dreamina');
  }

  return reply;
}

async function generateOpenAiReply(question, history = []) {
  const apiKey = getOpenAiApiKey();
  const messages = buildProviderMessages(question, history);

  const response = await fetch(OPENAI_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json; charset=utf-8'
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        {
          role: 'system',
          content: buildOpenAiPersonaPrompt()
        },
        ...messages
      ],
      temperature: 0.75,
      max_tokens: 300
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} | ${errorText || 'sem corpo'}`);
  }

  const payload = await response.json();
  const reply = payload?.choices?.[0]?.message?.content?.trim();

  if (!reply) {
    throw new Error('Resposta vazia da OpenAI');
  }

  return reply;
}

async function generateCarmenAiReply(question, history = []) {
  const providerPlan = getProviderExecutionPlan(question);
  const attempts = [];

  for (const provider of providerPlan) {
    try {
      if (provider === 'deepseek') {
        const reply = await generateDeepSeekReply(question, history);
        attempts.push({ provider, ok: true });
        return { reply, source: 'deepseek', attempts };
      }

      if (provider === 'gemini') {
        const reply = await generateGeminiReply(question, history);
        attempts.push({ provider, ok: true });
        return { reply, source: 'gemini', attempts };
      }

      if (provider === 'dreamina') {
        const reply = await generateDreaminaReply(question, history);
        attempts.push({ provider, ok: true });
        return { reply, source: 'dreamina', attempts };
      }

      if (provider === 'openai') {
        const reply = await generateOpenAiReply(question, history);
        attempts.push({ provider, ok: true });
        return { reply, source: 'openai', attempts };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      attempts.push({ provider, ok: false, error: message });
      console.warn(`IA ${provider} indisponivel, tentando proxima: ${message}`);
    }
  }

  return { reply: generateCarmenReply(question), source: 'fallback', attempts };
}

async function getProvidersHealth() {
  const checks = [];

  if (hasGeminiConfig()) {
    checks.push((async () => {
      try {
        await generateGeminiReply('Responda apenas: ok');
        return { provider: 'gemini', configured: true, ok: true };
      } catch (error) {
        return {
          provider: 'gemini',
          configured: true,
          ok: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        };
      }
    })());
  } else {
    checks.push(Promise.resolve({ provider: 'gemini', configured: false, ok: false, error: 'não configurado' }));
  }

  if (hasDeepSeekConfig()) {
    checks.push((async () => {
      try {
        await generateDeepSeekReply('Responda apenas: ok');
        return { provider: 'deepseek', configured: true, ok: true };
      } catch (error) {
        return {
          provider: 'deepseek',
          configured: true,
          ok: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        };
      }
    })());
  } else {
    checks.push(Promise.resolve({ provider: 'deepseek', configured: false, ok: false, error: 'não configurado' }));
  }

  if (hasOpenAiConfig()) {
    checks.push((async () => {
      try {
        await generateOpenAiReply('Responda apenas: ok');
        return { provider: 'openai', configured: true, ok: true };
      } catch (error) {
        return {
          provider: 'openai',
          configured: true,
          ok: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        };
      }
    })());
  } else {
    checks.push(Promise.resolve({ provider: 'openai', configured: false, ok: false, error: 'não configurado' }));
  }

  if (hasDreaminaConfig()) {
    checks.push((async () => {
      try {
        await generateDreaminaReply('Responda apenas: ok');
        return { provider: 'dreamina', configured: true, ok: true };
      } catch (error) {
        return {
          provider: 'dreamina',
          configured: true,
          ok: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        };
      }
    })());
  } else {
    checks.push(Promise.resolve({ provider: 'dreamina', configured: false, ok: false, error: 'não configurado' }));
  }

  const providers = await Promise.all(checks);
  return {
    ok: providers.some((item) => item.ok),
    providers
  };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://127.0.0.1');

  if (req.method === 'GET' && url.pathname === '/health') {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/tts/cartesia') {
    try {
      const body = await readJsonBody(req);
      const text = typeof body.text === 'string' ? body.text.trim() : '';
      const voiceId = typeof body.voiceId === 'string' && body.voiceId.trim()
        ? body.voiceId.trim()
        : CARTESIA_DEFAULT_VOICE_ID;

      if (!text) {
        sendJson(res, 400, { error: 'text é obrigatório' });
        return;
      }

      const audioBuffer = await synthesizeAudio(text, voiceId);
      sendWav(res, audioBuffer);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      sendJson(res, 500, { error: message });
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/gemini/reply') {
    try {
      const body = await readJsonBody(req);
      const question = typeof body.question === 'string' ? body.question.trim() : '';

      if (!question) {
        sendJson(res, 400, { error: 'question é obrigatório' });
        return;
      }

      const result = await generateCarmenAiReply(question);
      sendJson(res, 200, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      sendJson(res, 500, { error: message });
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/ai/reply') {
    try {
      const body = await readJsonBody(req);
      const question = typeof body.question === 'string' ? body.question.trim() : '';
      const history = sanitizeHistory(body.history);

      if (!question) {
        sendJson(res, 400, { error: 'question é obrigatório' });
        return;
      }

      const result = await generateCarmenAiReply(question, history);
      sendJson(res, 200, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      sendJson(res, 500, { error: message });
    }
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/ai/image-proxy') {
    try {
      const remoteUrl = url.searchParams.get('url');
      if (!remoteUrl) {
        sendJson(res, 400, { error: 'url é obrigatória' });
        return;
      }

      await proxyRemoteImage(res, remoteUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      sendJson(res, 500, { error: message });
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/ai/image-search') {
    try {
      const body = await readJsonBody(req);
      const question = typeof body.question === 'string' ? body.question.trim() : '';

      if (!question) {
        sendJson(res, 400, { error: 'question é obrigatório' });
        return;
      }

      const result = await searchImageOnline(question);
      sendJson(res, 200, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      sendJson(res, 500, { error: message });
    }
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/ai/providers/health') {
    try {
      const health = await getProvidersHealth();
      sendJson(res, 200, health);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      sendJson(res, 500, { ok: false, error: message });
    }
    return;
  }

  sendJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`Cartesia backend listening on http://127.0.0.1:${PORT}`);
});
