import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Send, TerminalSquare, Volume2 } from "lucide-react";
import HologramAvatar from "./HologramaAvatar";
import MicButton from "./MicButton";
import StatusPanel from "./StatusPanel";
import VoiceWaveform from "./VoiceWaveForm";
import {
  buildCarmenStyleReply,
  getLocalReply,
  humanizeSpeechText,
  sanitizeRoboticReply,
} from "./voicePersona";

const FALLBACK_API_URL = "https://carmen-glow-ai.base44.app";
const ELEVENLABS_TTS_URL = "https://api.elevenlabs.io/v1/text-to-speech";

const getSpeechSupport = () => {
  const recognition = typeof window !== "undefined"
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

  return {
    hasRecognition: Boolean(recognition),
    hasSynthesis: typeof window !== "undefined" && "speechSynthesis" in window,
    RecognitionClass: recognition,
  };
};

const getVoiceByPreference = (voices) => {
  if (!voices?.length) return null;

  const preferredLang = voices.filter((voice) => voice.lang?.toLowerCase().startsWith("pt"));
  if (!preferredLang.length) return voices[0];

  const ranked = preferredLang
    .map((voice) => {
      const name = voice.name.toLowerCase();
      let score = 0;

      if (name.includes("neural") || name.includes("online") || name.includes("natural")) score += 6;
      if (name.includes("google") || name.includes("microsoft") || name.includes("azure")) score += 4;
      if (name.includes("female") || name.includes("femin")) score += 3;
      if (name.includes("maria") || name.includes("francisca") || name.includes("camila") || name.includes("helena")) score += 3;
      if (!voice.localService) score += 2;

      return { voice, score };
    })
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.voice || preferredLang[0];
};

const parseApiReply = (payload) => {
  if (!payload) return "";
  if (typeof payload === "string") return payload;

  return (
    payload.reply ||
    payload.response ||
    payload.message ||
    payload.text ||
    payload?.data?.reply ||
    payload?.data?.message ||
    ""
  );
};

export default function CarmenHologramaConsole({
  apiBaseUrl = FALLBACK_API_URL,
  apiEndpointPath = "",
  elevenLabsApiKey = "",
  elevenLabsVoiceId = "EXAVITQu4vr4xnSDxMaL",
  ttsEngineDefault = "elevenlabs",
  title = "CARMEN AI • HOLOGRAMA",
}) {
  const normalizedElevenLabsApiKey = elevenLabsApiKey.trim();

  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [status, setStatus] = useState("ATIVA");
  const [lastUserText, setLastUserText] = useState("Aguardando comando");
  const [lastCarmenText, setLastCarmenText] = useState("Pronta para a missão.");
  const [draft, setDraft] = useState("");
  const [logs, setLogs] = useState([]);
  const [voicePreset, setVoicePreset] = useState("sarcastica");
  const [voiceRate, setVoiceRate] = useState(0.9);
  const [voicePitch, setVoicePitch] = useState(1.08);
  const [ttsEngine, setTtsEngine] = useState(ttsEngineDefault);

  const support = useMemo(getSpeechSupport, []);
  const recognitionRef = useRef(null);
  const selectedVoiceRef = useRef(null);
  const audioRef = useRef(null);
  const audioUrlRef = useRef("");

  const addLog = useCallback((speaker, text) => {
    const entry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      speaker,
      text,
      time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    };

    setLogs((prev) => [...prev.slice(-13), entry]);
  }, []);

  const stopSpeech = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }

    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = "";
    }

    if (support.hasSynthesis) {
      window.speechSynthesis.cancel();
    }

    setIsSpeaking(false);
    setStatus("ATIVA");
  }, [support.hasSynthesis]);

  const speakWebSpeech = useCallback(
    (text) => {
      if (!support.hasSynthesis || !text) return;

      stopSpeech();

      const utterance = new SpeechSynthesisUtterance(humanizeSpeechText(text));
      utterance.lang = "pt-BR";
      utterance.rate = voiceRate;
      utterance.pitch = voicePitch;
      utterance.volume = 1;

      if (selectedVoiceRef.current) {
        utterance.voice = selectedVoiceRef.current;
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
        setStatus("RESPONDENDO");
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        setStatus("ATIVA");
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        setStatus("ATIVA");
      };

      window.speechSynthesis.speak(utterance);
    },
    [stopSpeech, support.hasSynthesis, voicePitch, voiceRate]
  );

  const speakElevenLabs = useCallback(
    async (text) => {
      if (!text || !normalizedElevenLabsApiKey || !elevenLabsVoiceId) {
        throw new Error("ElevenLabs nao configurado");
      }

      stopSpeech();
      setStatus("RESPONDENDO");

      const response = await fetch(
        `${ELEVENLABS_TTS_URL}/${elevenLabsVoiceId}/stream?output_format=mp3_44100_128`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "xi-api-key": normalizedElevenLabsApiKey,
          },
          body: JSON.stringify({
            text: humanizeSpeechText(text),
            model_id: "eleven_multilingual_v2",
            voice_settings: {
              stability: 0.35,
              similarity_boost: 0.85,
              style: 0.6,
              use_speaker_boost: true,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Falha no TTS neural");
      }

      const audioBlob = await response.blob();
      const url = URL.createObjectURL(audioBlob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audioUrlRef.current = url;

      audio.onplay = () => {
        setIsSpeaking(true);
      };

      audio.onended = () => {
        setIsSpeaking(false);
        setStatus("ATIVA");
        if (audioUrlRef.current) {
          URL.revokeObjectURL(audioUrlRef.current);
          audioUrlRef.current = "";
        }
      };

      audio.onerror = () => {
        setIsSpeaking(false);
        setStatus("ATIVA");
      };

      await audio.play();
    },
    [elevenLabsVoiceId, normalizedElevenLabsApiKey, stopSpeech]
  );

  const speak = useCallback(
    async (text) => {
      if (!text) return;

      if (ttsEngine === "elevenlabs") {
        if (!normalizedElevenLabsApiKey) {
          addLog("SISTEMA", "Chave ElevenLabs ausente. Voltando para Web Speech local.");
          speakWebSpeech(text);
          return;
        }

        try {
          await speakElevenLabs(text);
          return;
        } catch {
          addLog("SISTEMA", "Falha no TTS neural. Usando Web Speech como fallback.");
          speakWebSpeech(text);
          return;
        }
      }

      speakWebSpeech(text);
    },
    [addLog, normalizedElevenLabsApiKey, speakElevenLabs, speakWebSpeech, ttsEngine]
  );

  const fetchReply = useCallback(
    async (message) => {
      const cleanBase = (apiBaseUrl || FALLBACK_API_URL).replace(/\/$/, "");
      const customPath = apiEndpointPath.trim().replace(/^\/+/, "");
      const endpoints = customPath
        ? [`${cleanBase}/${customPath}`]
        : [`${cleanBase}/api/chat`, `${cleanBase}/functions/chat`, `${cleanBase}/chat`];

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message,
              locale: "pt-BR",
              persona: "carmen_hologram",
              style: "humano, natural, confiante, sarcastico elegante, chame o usuario de jogador",
              avoid: ["respostas roboticas", "estou processando dados", "sou uma IA"],
              conversation: {
                lastUser: lastUserText,
                lastAssistant: lastCarmenText,
              },
            }),
          });

          if (!response.ok) continue;

          const data = await response.json();
          const parsed = parseApiReply(data);
          if (parsed) return sanitizeRoboticReply(parsed);
        } catch {
          // Tenta o proximo endpoint.
        }
      }

      return getLocalReply(message, { lastUserText, lastCarmenText });
    },
    [apiBaseUrl, apiEndpointPath, lastCarmenText, lastUserText]
  );

  const processCommand = useCallback(
    async (rawText) => {
      const message = rawText.trim();
      if (!message) return;

      const normalized = message.toLowerCase();

      setLastUserText(message);
      addLog("VOCE", message);

      if (normalized.includes("limpar console")) {
        setLogs([]);
        setLastCarmenText("Console limpo. Seguimos discretos.");
        addLog("CARMEN", "Console limpo. Seguimos discretos.");
        speak("Console limpo. Seguimos discretos.");
        return;
      }

      if (normalized.includes("parar voz") || normalized.includes("silêncio") || normalized.includes("silencio")) {
        stopSpeech();
        setLastCarmenText("Canal de voz pausado.");
        addLog("CARMEN", "Canal de voz pausado.");
        return;
      }

      setStatus("ANALISANDO");
      const reply = await fetchReply(message);
      const styledReply = buildCarmenStyleReply(reply, voicePreset);
      setLastCarmenText(styledReply);
      addLog("CARMEN", styledReply);
      speak(styledReply);
    },
    [addLog, fetchReply, speak, stopSpeech, voicePreset]
  );

  const toggleListening = useCallback(() => {
    if (!support.hasRecognition || !recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      return;
    }

    recognitionRef.current.start();
  }, [isListening, support.hasRecognition]);

  const submitDraft = useCallback(
    (event) => {
      event.preventDefault();
      const text = draft.trim();
      if (!text) return;

      setDraft("");
      processCommand(text);
    },
    [draft, processCommand]
  );

  useEffect(() => {
    if (!support.hasSynthesis) return;

    const loadVoices = () => {
      selectedVoiceRef.current = getVoiceByPreference(window.speechSynthesis.getVoices());
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [support.hasSynthesis]);

  useEffect(() => {
    if (!support.hasRecognition || !support.RecognitionClass) return;

    const recognition = new support.RecognitionClass();
    recognition.lang = "pt-BR";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let finalTranscript = "";

    recognition.onstart = () => {
      finalTranscript = "";
      setStatus("OUVINDO");
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let interim = "";

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += `${text} `;
        } else {
          interim += text;
        }
      }

      const preview = `${finalTranscript}${interim}`.trim();
      if (preview) {
        setLastUserText(preview);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      setStatus("ATIVA");
    };

    recognition.onend = () => {
      setIsListening(false);
      setStatus((current) => (current === "RESPONDENDO" ? current : "ATIVA"));

      const spokenText = finalTranscript.trim();
      if (spokenText) {
        processCommand(spokenText);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [processCommand, support.RecognitionClass, support.hasRecognition]);

  useEffect(() => {
    if (!support.hasRecognition) {
      addLog(
        "SISTEMA",
        "Seu navegador nao suporta reconhecimento de voz. Use Chrome, Edge ou Safari atualizados."
      );
    }
  }, [addLog, support.hasRecognition]);

  const statusItems = useMemo(
    () => [
      { label: "SISTEMA", value: "Ativo" },
      { label: "VOZ PT", value: support.hasSynthesis ? voicePreset : "Neural" },
      { label: "TTS", value: ttsEngine === "elevenlabs" ? "Neural" : "Local" },
      { label: "MIC", value: support.hasRecognition ? "Pronto" : "Indisp." },
      { label: "STATUS", value: status },
    ],
    [status, support.hasRecognition, support.hasSynthesis, ttsEngine, voicePreset]
  );

  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, [stopSpeech]);

  useEffect(() => {
    if (voicePreset === "sarcastica") {
      setVoiceRate(0.9);
      setVoicePitch(1.03);
      return;
    }

    if (voicePreset === "sensual") {
      setVoiceRate(0.9);
      setVoicePitch(1.08);
      return;
    }

    if (voicePreset === "firme") {
      setVoiceRate(0.96);
      setVoicePitch(0.98);
      return;
    }

    setVoiceRate(0.88);
    setVoicePitch(1.16);
  }, [voicePreset]);

  return (
    <section
      className="relative min-h-screen w-full overflow-hidden bg-black text-gray-100"
      style={{
        backgroundImage:
          "radial-gradient(circle at 50% 35%, rgba(185, 28, 28, 0.28), transparent 55%), radial-gradient(circle at 65% 40%, rgba(6, 182, 212, 0.15), transparent 45%), linear-gradient(180deg, #020204 0%, #030305 45%, #020204 100%)",
      }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-30" style={{
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
      }} />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center px-4 pb-12 pt-6 md:px-8 md:pt-8">
        <header className="mb-6 flex w-full items-center justify-between border-b border-white/10 pb-3">
          <p className="font-mono text-xs tracking-[0.5em] text-gray-300">
            {title}
          </p>
          <span className="rounded-full border border-cyan-400/40 bg-cyan-500/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.25em] text-cyan-200">
            Canal seguro
          </span>
        </header>

        <div className="mb-6 mt-2 flex w-full items-center justify-center">
          <HologramAvatar isSpeaking={isSpeaking} isListening={isListening} status={status} />
        </div>

        <motion.p
          key={lastCarmenText}
          initial={{ opacity: 0.2, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-2 max-w-4xl text-center text-xl italic text-gray-200 md:text-3xl"
        >
          "{lastCarmenText}"
        </motion.p>

        <p className="mb-5 font-mono text-sm tracking-[0.24em] text-gray-500 md:text-base">
          VOCE: "{lastUserText}"
        </p>

        <div className="mb-5 w-full max-w-xl rounded-xl border border-white/10 bg-black/40 px-4 py-3 backdrop-blur-sm">
          <VoiceWaveform isActive={isSpeaking || isListening} color={isListening ? "cyan" : "red"} />
        </div>

        <div className="mb-6">
          <MicButton
            isListening={isListening}
            isSpeaking={isSpeaking}
            disabled={!support.hasRecognition}
            onToggle={toggleListening}
          />
        </div>

        <div className="mb-6 w-full">
          <StatusPanel items={statusItems} />
        </div>

        <div className="grid w-full max-w-5xl grid-cols-1 gap-4 md:grid-cols-[1.2fr_1fr]">
          <div className="rounded-xl border border-white/10 bg-black/60 p-4 backdrop-blur-md">
            <div className="mb-3 flex items-center gap-2">
              <TerminalSquare className="h-4 w-4 text-cyan-300" />
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-cyan-200">
                Console de voz
              </p>
            </div>
            <div className="h-52 space-y-2 overflow-y-auto pr-1">
              {logs.length === 0 && (
                <p className="font-mono text-xs text-gray-500">Sem registros no momento.</p>
              )}
              {logs.map((entry) => (
                <div key={entry.id} className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2">
                  <p className="mb-1 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">
                    <span>{entry.speaker}</span>
                    <span>{entry.time}</span>
                  </p>
                  <p className="text-sm text-gray-200">{entry.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-red-500/20 bg-red-950/10 p-4 backdrop-blur-md">
            <div className="mb-3 flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-red-300" />
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-red-200">
                Comandos rapidos
              </p>
            </div>

            <ul className="mb-4 space-y-2 text-sm text-gray-300">
              <li>• "Status" para diagnostico instantaneo.</li>
              <li>• "Limpar console" para apagar registros.</li>
              <li>• "Parar voz" para silenciar respostas.</li>
            </ul>

            <div className="mb-4 rounded-md border border-white/10 bg-black/40 p-3">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-gray-400">Motor de voz</p>
              <div className="mb-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setTtsEngine("elevenlabs")}
                  className={`rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] transition ${
                    ttsEngine === "elevenlabs"
                      ? "border-red-300 bg-red-400/20 text-red-100"
                      : "border-white/15 bg-white/5 text-gray-300 hover:border-red-300/40"
                  }`}
                >
                  Neural
                </button>
                <button
                  type="button"
                  onClick={() => setTtsEngine("webspeech")}
                  className={`rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] transition ${
                    ttsEngine === "webspeech"
                      ? "border-cyan-300 bg-cyan-400/20 text-cyan-100"
                      : "border-white/15 bg-white/5 text-gray-300 hover:border-cyan-300/40"
                  }`}
                >
                  Local
                </button>
              </div>

              {ttsEngine === "elevenlabs" && !normalizedElevenLabsApiKey && (
                <p className="mb-3 rounded border border-amber-400/30 bg-amber-500/10 px-2 py-1 text-xs text-amber-200">
                  Configure VITE_ELEVENLABS_API_KEY para ativar voz neural.
                </p>
              )}

              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-gray-400">Tom da voz</p>
              <div className="mb-3 flex flex-wrap gap-2">
                {[
                  { id: "sarcastica", label: "Sarcastica" },
                  { id: "sensual", label: "Sensual" },
                  { id: "firme", label: "Firme" },
                  { id: "suave", label: "Suave" },
                ].map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setVoicePreset(preset.id)}
                    className={`rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] transition ${
                      voicePreset === preset.id
                        ? "border-cyan-300 bg-cyan-400/20 text-cyan-100"
                        : "border-white/15 bg-white/5 text-gray-300 hover:border-cyan-300/40"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.16em] text-gray-400">
                Velocidade ({voiceRate.toFixed(2)})
              </label>
              <input
                type="range"
                min="0.75"
                max="1.15"
                step="0.01"
                value={voiceRate}
                onChange={(event) => setVoiceRate(Number(event.target.value))}
                className="mb-3 w-full accent-cyan-400"
              />

              <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.16em] text-gray-400">
                Tom ({voicePitch.toFixed(2)})
              </label>
              <input
                type="range"
                min="0.85"
                max="1.25"
                step="0.01"
                value={voicePitch}
                onChange={(event) => setVoicePitch(Number(event.target.value))}
                className="w-full accent-red-400"
              />
            </div>

            <form onSubmit={submitDraft} className="space-y-2">
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Digite um comando para Carmen..."
                className="w-full rounded-md border border-white/15 bg-black/60 px-3 py-2 text-sm text-gray-100 outline-none transition focus:border-cyan-400/60"
              />
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-cyan-400/40 bg-cyan-500/10 px-3 py-2 font-mono text-xs uppercase tracking-[0.18em] text-cyan-100 transition hover:bg-cyan-500/20"
              >
                <Send className="h-3.5 w-3.5" />
                Enviar comando
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}