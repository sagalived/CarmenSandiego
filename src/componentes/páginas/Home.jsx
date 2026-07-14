import React, { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import HologramAvatar from "@/componentes/holograma/HologramaAvatar";
import VoiceWaveform from "@/componentes/holograma/VoiceWaveForm";
import StatusPanel from "@/componentes/holograma/StatusPanel";
import MicButton from "@/componentes/holograma/MicButton";
import { getAssistantStatus } from "@/componentes/holograma/status";
import { generateCarmenAiReply } from "@/componentes/holograma/ai";
import { isImageRequest, searchImageForCarmen } from "@/componentes/holograma/image-search";
import { synthesizeCartesia } from "@/componentes/holograma/cartesia";
import {
  Bell,
  Check,
  Clock3,
  Download,
  Globe,
  Home as HomeIcon,
  MessageSquare,
  Pencil,
  Pin,
  Search,
  Settings,
  Shield,
  Star,
  Upload,
  BarChart3,
  FolderOpen,
  FileText,
  FileImage,
  FileJson
} from "lucide-react";

/**
 * @typedef {Object} ChatMessage
 * @property {"user"|"carmen"} role
 * @property {string} text
 */

/**
 * @typedef {Object} ImageBoardEntry
 * @property {string} id
 * @property {string} query
 * @property {string} title
 * @property {string} imageUrl
 * @property {string} pageUrl
 * @property {string} source
 * @property {string} question
 * @property {string} createdAt
 * @property {string} displayName
 * @property {boolean} favorite
 */

const navItems = [
  { label: "Painel", icon: HomeIcon, active: true },
  { label: "Arquivos", icon: FolderOpen, active: false },
  { label: "Análises", icon: BarChart3, active: false },
  { label: "Conversas", icon: MessageSquare, active: false },
  { label: "Configurações", icon: Settings, active: false },
  { label: "Segurança", icon: Shield, active: false },
  { label: "Histórico", icon: Clock3, active: false }
];

const exportFormats = [
  { value: "pdf", label: "PDF" },
  { value: "png", label: "PNG" },
  { value: "json", label: "JSON" }
];

function formatPanelTime(value) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function buildHistoryEntry(imageResult, question) {
  return {
    ...imageResult,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    question,
    createdAt: new Date().toISOString(),
    displayName: imageResult.query,
    favorite: false
  };
}

function sortHistoryEntries(entries) {
  return [...entries].sort((left, right) => {
    if (left.favorite !== right.favorite) {
      return left.favorite ? -1 : 1;
    }

    return right.createdAt.localeCompare(left.createdAt);
  });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function downloadTextFile(content, filename, type) {
  const blob = new Blob([content], { type });
  downloadBlob(blob, filename);
}

function getSourceLabel(source) {
  if (source === "ai-pollinations") {
    return "IA";
  }

  if (source === "wikimedia") {
    return "WEB";
  }

  return "LIVE";
}

export default function Home() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [chatHistory, setChatHistory] = useState(/** @type {ChatMessage[]} */ ([]));
  const [showChat, setShowChat] = useState(false);
  const [imageBoard, setImageBoard] = useState(/** @type {null | ImageBoardEntry} */ (null));
  const [imageHistory, setImageHistory] = useState(/** @type {ImageBoardEntry[]} */ ([]));
  const [selectedHistoryId, setSelectedHistoryId] = useState(/** @type {string | null} */ (null));
  const [imageLoadError, setImageLoadError] = useState(false);
  const [exportFormat, setExportFormat] = useState(/** @type {"pdf"|"png"|"json"} */ ("pdf"));
  const [exportBusy, setExportBusy] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportLabel, setExportLabel] = useState("Aguardando arquivo");
  const [editingHistoryId, setEditingHistoryId] = useState(/** @type {string | null} */ (null));
  const [renameDraft, setRenameDraft] = useState("");
  const recognitionRef = useRef(/** @type {any} */ (null));
  const audioRef = useRef(/** @type {HTMLAudioElement|null} */ (null));
  const previewCardRef = useRef(/** @type {HTMLDivElement | null} */ (null));

  const status = getAssistantStatus({ isSpeaking, isProcessing, isListening });

  const handleSelectHistory = useCallback((entry) => {
    setSelectedHistoryId(entry.id);
    setImageLoadError(false);
    setImageBoard(entry);
    setExportLabel(`Arquivo ${entry.query} pronto para exportação`);
    setExportProgress(100);
  }, []);

  const handleToggleFavorite = useCallback((entryId) => {
    setImageHistory((prev) => {
      const next = sortHistoryEntries(prev.map((item) => item.id === entryId ? { ...item, favorite: !item.favorite } : item));
      const selected = next.find((item) => item.id === selectedHistoryId);
      if (selected) {
        setImageBoard(selected);
      }
      return next;
    });
  }, [selectedHistoryId]);

  const handleStartRename = useCallback((entry) => {
    setEditingHistoryId(entry.id);
    setRenameDraft(entry.displayName);
  }, []);

  const handleSaveRename = useCallback((entryId) => {
    const nextName = renameDraft.trim();
    if (!nextName) {
      setEditingHistoryId(null);
      setRenameDraft("");
      return;
    }

    setImageHistory((prev) => prev.map((item) => item.id === entryId ? { ...item, displayName: nextName } : item));
    setImageBoard((prev) => prev && prev.id === entryId ? { ...prev, displayName: nextName } : prev);
    setEditingHistoryId(null);
    setRenameDraft("");
  }, [renameDraft]);

  const handleExportReport = useCallback(async () => {
    if (imageHistory.length === 0) {
      setExportLabel("Sem buscas para consolidar");
      return;
    }

    setExportBusy(true);
    setExportProgress(18);
    setExportLabel("Montando relatório consolidado");

    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      const lines = imageHistory.slice(0, 8);
      let cursorY = 52;

      pdf.setFillColor(12, 16, 24);
      pdf.rect(0, 0, 595, 842, "F");
      pdf.setTextColor(255, 91, 91);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(22);
      pdf.text("CARMEN AI · RELATORIO VISUAL", 36, cursorY);
      cursorY += 26;
      pdf.setTextColor(185, 197, 212);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);
      pdf.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, 36, cursorY);
      cursorY += 30;

      lines.forEach((item, index) => {
        if (cursorY > 740) {
          pdf.addPage();
          pdf.setFillColor(12, 16, 24);
          pdf.rect(0, 0, 595, 842, "F");
          cursorY = 52;
        }

        pdf.setDrawColor(255, 91, 91);
        pdf.roundedRect(36, cursorY - 18, 520, 78, 12, 12, "S");
        pdf.setTextColor(255, 91, 91);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(14);
        pdf.text(`${index + 1}. ${item.displayName}`, 52, cursorY + 2);
        pdf.setTextColor(185, 197, 212);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        pdf.text(`Origem: ${item.source}  |  Horario: ${formatPanelTime(item.createdAt)}  |  Favorito: ${item.favorite ? "sim" : "nao"}`, 52, cursorY + 22);
        pdf.text(`Pedido: ${item.question}`, 52, cursorY + 40, { maxWidth: 488 });
        cursorY += 96;
      });

      pdf.save("carmen-relatorio-consolidado.pdf");
      setExportProgress(100);
      setExportLabel("Relatório consolidado exportado");
    } catch (error) {
      console.error(error);
      setExportLabel("Falha ao exportar relatório");
    } finally {
      setExportBusy(false);
    }
  }, [imageHistory]);

  const handleExport = useCallback(async () => {
    if (!imageBoard) {
      setExportLabel("Nenhum arquivo selecionado");
      return;
    }

    setExportBusy(true);
    setExportProgress(12);
    setExportLabel(`Preparando ${exportFormat.toUpperCase()}`);

    try {
      if (exportFormat === "json") {
        const payload = {
          exportedAt: new Date().toISOString(),
          selected: imageBoard,
          history: imageHistory.slice(0, 8)
        };

        downloadTextFile(
          JSON.stringify(payload, null, 2),
          `carmen-${imageBoard.query.replace(/\s+/g, "-")}.json`,
          "application/json"
        );
        setExportProgress(100);
        setExportLabel("JSON exportado");
        return;
      }

      if (!previewCardRef.current) {
        throw new Error("Prévia indisponível para exportação");
      }

      const { default: html2canvas } = await import("html2canvas");
      setExportProgress(38);

      const canvas = await html2canvas(previewCardRef.current, {
        backgroundColor: "#0d1218",
        scale: 2,
        useCORS: true
      });

      setExportProgress(74);

      if (exportFormat === "png") {
        const blob = await new Promise((resolve, reject) => {
          canvas.toBlob((value) => {
            if (value) {
              resolve(value);
              return;
            }

            reject(new Error("Falha ao montar PNG"));
          }, "image/png");
        });

        downloadBlob(/** @type {Blob} */ (blob), `carmen-${imageBoard.query.replace(/\s+/g, "-")}.png`);
        setExportProgress(100);
        setExportLabel("PNG exportado");
        return;
      }

      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? "landscape" : "portrait",
        unit: "px",
        format: [canvas.width, canvas.height]
      });

      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save(`carmen-${imageBoard.query.replace(/\s+/g, "-")}.pdf`);
      setExportProgress(100);
      setExportLabel("PDF exportado");
    } catch (error) {
      console.error(error);
      setExportLabel("Falha ao exportar arquivo");
    } finally {
      setExportBusy(false);
    }
  }, [exportFormat, imageBoard, imageHistory]);

  const speak = useCallback(async (/** @type {string} */ text) => {
    setIsSpeaking(true);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    try {
      const blob = await synthesizeCartesia({ text });

      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
        setIsSpeaking(false);
      };

      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
        setIsSpeaking(false);
      };

      await audio.play();
      return;
    } catch (error) {
      console.warn("Cartesia falhou, sem fallback de voz local:", error);
      setIsSpeaking(false);
      return;
    }
  }, []);

  const processQuestion = useCallback(async (/** @type {string} */ question) => {
    setIsProcessing(true);
    setTranscript(question);
    const nextHistory = /** @type {ChatMessage[]} */ ([...chatHistory, { role: "user", text: question }]);
    setChatHistory(nextHistory);

    try {
      const aiResult = await generateCarmenAiReply({
        question,
        history: nextHistory.slice(-6)
      });
      const responseText = aiResult.reply;

      if (isImageRequest(question)) {
        try {
          const imageResult = await searchImageForCarmen({ question });
          const historyEntry = buildHistoryEntry(imageResult, question);

          setImageLoadError(false);
          setImageBoard(historyEntry);
          setSelectedHistoryId(historyEntry.id);
          setImageHistory((prev) => sortHistoryEntries([
            historyEntry,
            ...prev.filter((item) => item.query !== historyEntry.query).slice(0, 7)
          ]));
          setExportLabel(`Arquivo ${historyEntry.query} pronto para exportação`);
          setExportProgress(100);
        } catch (error) {
          console.warn("Busca de imagem falhou:", error);
        }
      }

      setResponse(responseText);
      setChatHistory((prev) => [...prev, { role: "carmen", text: responseText }]);
      setIsProcessing(false);
      await speak(responseText);
    } catch {
      setIsProcessing(false);
      setResponse("Boa noite, Jogador. Algo fugiu do meu radar por um instante. Tente de novo e eu retomo a trilha.");
    }
  }, [chatHistory, speak]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || /** @type {any} */ (window).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Seu navegador não suporta reconhecimento de voz.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognitionRef.current = recognition;

    recognition.onresult = (/** @type {any} */ event) => {
      const text = event.results[0][0].transcript;
      setIsListening(false);
      processQuestion(text);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognition.start();
    setIsListening(true);
  }, [isListening, processQuestion]);

  React.useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#06090d] text-white overflow-hidden relative">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(163,20,20,0.18),transparent_32%),radial-gradient(circle_at_70%_35%,rgba(14,165,233,0.12),transparent_22%),linear-gradient(180deg,#070b10_0%,#040608_100%)]" />
      <div
        className="fixed inset-0 opacity-[0.08] pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(rgba(40,62,78,0.45) 1px, transparent 1px), linear-gradient(90deg, rgba(40,62,78,0.35) 1px, transparent 1px)",
          backgroundSize: "72px 72px"
        }}
      />

      <div className="relative z-10 flex min-h-screen">
        <aside className="hidden xl:flex w-[118px] shrink-0 border-r border-[#16202a] bg-[#05070b]/90 backdrop-blur-xl flex-col justify-between">
          <div>
            <div className="relative h-[74px] flex items-center justify-center border-b border-[#16202a]">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-red-600/40 bg-red-950/30 shadow-[0_0_18px_rgba(220,38,38,0.22)] overflow-hidden">
                <img src="/carmen-holograma.png" alt="Carmen Logo" className="h-full w-full object-cover object-top opacity-90 mix-blend-screen saturate-150" />
              </div>
            </div>

            <nav className="px-3 py-6 space-y-2.5">
              {navItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className={`relative w-full rounded-[18px] border px-3 py-4 text-left transition-colors ${
                    item.active
                      ? "border-red-500/60 bg-red-950/30 text-red-300 shadow-[0_0_18px_rgba(220,38,38,0.16)]"
                      : "border-[#18222d] bg-[#090d12]/70 text-slate-500 hover:border-red-500/30 hover:text-slate-200"
                  }`}
                >
                  {item.active && <span className="absolute inset-y-2 left-0 w-[2px] rounded-full bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.65)]" />}
                  <item.icon className="mx-auto mb-2 h-5 w-5" />
                  <span className="carmen-label block text-[10px] font-semibold uppercase tracking-[0.16em]">{item.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="m-3 rounded-2xl border border-red-500/30 bg-[#0b0f15] px-4 py-5 text-left shadow-[0_0_20px_rgba(127,29,29,0.18)]">
            <p className="carmen-label text-[10px] uppercase tracking-[0.28em] text-red-400">Carmen AI v2.7.3</p>
            <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-slate-500">ID: CA-00942</p>
            <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-slate-500">Nível de acesso</p>
            <p className="mt-1 text-sm font-semibold uppercase tracking-[0.2em] text-red-300">Admin</p>
          </div>
        </aside>

        <div className="flex-1 px-4 py-4 md:px-6 xl:px-8">
          <header className="relative rounded-[22px] border border-[#16202a] bg-[#060a0f]/90 px-4 py-3 shadow-[0_18px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl md:px-5 md:py-4">
            <div className="pointer-events-none absolute inset-2 rounded-[18px] border border-red-500/8" />
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 md:gap-6">
                <div className="hidden h-12 w-24 items-center justify-center rounded-[18px] border border-red-500/30 bg-red-950/25 md:flex overflow-hidden">
                  <img src="/carmen-holograma.png" alt="Carmen Logo" className="h-[250%] w-full object-cover object-top opacity-80 mix-blend-screen saturate-150" style={{ objectPosition: "50% 15%" }} />
                </div>
                <div className="carmen-display flex items-center gap-3 text-[1.75rem] font-semibold uppercase tracking-[0.14em] md:text-[2rem] 2xl:text-[2.15rem]">
                  <span className="text-red-500">Carmen AI</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-200">Holograma</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowChat(!showChat)}
                  className="rounded-2xl border border-[#1a2430] bg-[#090d12] p-3 text-slate-400 transition-colors hover:border-red-500/40 hover:text-white"
                >
                  <MessageSquare className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  className="relative rounded-2xl border border-[#1a2430] bg-[#090d12] p-3 text-slate-400 transition-colors hover:border-red-500/40 hover:text-white"
                >
                  <Bell className="h-5 w-5" />
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {Math.min(chatHistory.length || 3, 9)}
                  </span>
                </button>
              </div>
            </div>
          </header>

          <main className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_390px] 2xl:grid-cols-[minmax(0,1.62fr)_420px]">
            <section className="relative rounded-[30px] border border-[#16202a] bg-[#070b10]/92 p-4 shadow-[0_25px_60px_rgba(0,0,0,0.42)] backdrop-blur-xl md:p-6">
              <div className="pointer-events-none absolute inset-3 rounded-[24px] border border-cyan-500/8" />
              <div className="grid gap-4">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_120px] 2xl:grid-cols-[minmax(0,1fr)_132px]">
                  <div className="relative rounded-[28px] border border-cyan-500/20 bg-[linear-gradient(180deg,rgba(8,18,27,0.98),rgba(5,10,15,0.98))] p-3 md:p-4 2xl:p-5 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.05),0_0_0_1px_rgba(127,29,29,0.08)]">
                    <div className="pointer-events-none absolute inset-3 rounded-[22px] border border-cyan-400/8" />
                    <div className="mb-4 flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.3em] text-slate-500">
                      <span className="rounded-full border border-red-500/20 bg-red-950/20 px-3 py-1 text-red-400">ID: Carmen_AI</span>
                      <span className="rounded-full border border-cyan-500/20 bg-cyan-950/20 px-3 py-1 text-cyan-300">Versão 2.7.3</span>
                    </div>

                    <div className="mx-auto max-w-[620px] 2xl:max-w-[680px]">
                      <HologramAvatar
                        isSpeaking={isSpeaking}
                        isListening={isListening}
                        status={status}
                      />
                    </div>

                    <div className="mt-4 flex items-center justify-center gap-6 px-4">
                      <div className="h-8 flex-1 max-w-[190px]">
                        <VoiceWaveform isActive={isSpeaking} color="red" />
                        <VoiceWaveform isActive={isListening} color="cyan" />
                      </div>
                      <div className="h-px flex-1 bg-[linear-gradient(90deg,transparent,rgba(239,68,68,0.6),transparent)]" />
                    </div>

                    <div className="mt-4 flex justify-center">
                      <MicButton
                        isListening={isListening}
                        isSpeaking={isSpeaking}
                        onToggle={toggleListening}
                        disabled={isProcessing}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-1">
                    <div className="rounded-[22px] border border-red-500/20 bg-[#0a0f15] p-4 shadow-[0_0_24px_rgba(127,29,29,0.12)]">
                      <p className="carmen-label text-[10px] uppercase tracking-[0.28em] text-slate-500">Status</p>
                      <p className="mt-4 text-lg font-semibold uppercase tracking-[0.18em] text-emerald-400">Online</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">Pronta para rastrear</p>
                    </div>
                    <div className="rounded-[22px] border border-red-500/20 bg-[#0a0f15] p-4 shadow-[0_0_24px_rgba(127,29,29,0.12)]">
                      <p className="carmen-label text-[10px] uppercase tracking-[0.28em] text-red-400">Protocolo</p>
                      <p className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">128-bit</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">Canal seguro ativo</p>
                    </div>
                    <div className="rounded-[22px] border border-red-500/20 bg-[#0a0f15] p-4 shadow-[0_0_24px_rgba(127,29,29,0.12)]">
                      <p className="carmen-label text-[10px] uppercase tracking-[0.28em] text-slate-500">Radar</p>
                      <div className="mt-4 grid grid-cols-6 gap-1">
                        {Array.from({ length: 18 }).map((_, index) => (
                          <div
                            key={index}
                            className="h-8 rounded-sm bg-[linear-gradient(180deg,rgba(16,185,129,0.8),rgba(16,185,129,0.06))]"
                            style={{ opacity: 0.25 + ((index % 6) + 1) / 8 }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {(response || isProcessing) && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="rounded-[24px] border border-red-500/20 bg-[#090d12]/90 px-5 py-4 shadow-[0_0_24px_rgba(127,29,29,0.14)]"
                    >
                      {isProcessing ? (
                        <div className="flex items-center gap-3 text-sm uppercase tracking-[0.22em] text-slate-400">
                          <div className="flex gap-1.5">
                            <div className="h-2 w-2 rounded-full bg-red-500 animate-bounce" />
                            <div className="h-2 w-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: "0.1s" }} />
                            <div className="h-2 w-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: "0.2s" }} />
                          </div>
                          Processando sinal do jogador
                        </div>
                      ) : (
                        <p className="text-sm leading-7 text-slate-200 md:text-base">
                          {response}
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="rounded-2xl border border-[#18222d] bg-[#090d12] px-4 py-3 text-xs uppercase tracking-[0.18em] text-slate-500">
                    {transcript && !isProcessing ? `Jogador: "${transcript}"` : "Aguardando comando de voz"}
                  </div>
                  <div className="rounded-2xl border border-[#18222d] bg-[#090d12] px-4 py-3 text-xs uppercase tracking-[0.18em] text-slate-500">
                    Fonte ativa: {imageBoard?.source || "painel local"}
                  </div>
                </div>

                <StatusPanel />
              </div>
            </section>

            <aside className="relative rounded-[30px] border-2 border-dashed border-red-500/40 bg-[#0a0d12]/95 p-5 md:p-6 shadow-[0_25px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl flex flex-col h-full">
              <div className="flex flex-col h-full">
                <div className="flex flex-col items-center justify-center gap-3 border-b border-red-500/20 pb-6 pt-2">
                  <Upload className="h-8 w-8 text-red-300" />
                  <h2 className="carmen-display text-[1.35rem] font-semibold uppercase tracking-[0.14em] text-red-300">Exportar arquivo</h2>
                </div>

                <div className="mt-5 space-y-5">
                  <div>
                    <div className="mb-4">
                      <p className="carmen-label text-xs uppercase tracking-[0.24em] text-slate-500 mb-3">Selecione o arquivo</p>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between rounded-xl border border-[#1b2530] bg-[#0d1218] p-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)]">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/20 text-red-400">
                              <FileText className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-200">relatorio_visual.pdf</p>
                              <p className="text-[10px] text-slate-500">2.4 MB</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => { setExportFormat("pdf"); setTimeout(handleExport, 0); }}
                            disabled={!imageBoard || exportBusy}
                            className="flex items-center gap-2 rounded-lg border border-red-500/30 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-red-200 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                          >
                            <Download className="h-3 w-3" />
                            Exportar
                          </button>
                        </div>
                        
                        <div className="flex items-center justify-between rounded-xl border border-[#1b2530] bg-[#0d1218] p-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)]">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                              <FileImage className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-200">saida_imagem.png</p>
                              <p className="text-[10px] text-slate-500">1.8 MB</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => { setExportFormat("png"); setTimeout(handleExport, 0); }}
                            disabled={!imageBoard || exportBusy}
                            className="flex items-center gap-2 rounded-lg border border-red-500/30 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-red-200 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                          >
                            <Download className="h-3 w-3" />
                            Exportar
                          </button>
                        </div>

                        <div className="flex items-center justify-between rounded-xl border border-[#1b2530] bg-[#0d1218] p-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)]">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/20 text-orange-400">
                              <FileJson className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-200">dados_brutos.json</p>
                              <p className="text-[10px] text-slate-500">3.1 MB</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => { setExportFormat("json"); setTimeout(handleExport, 0); }}
                            disabled={!imageBoard || exportBusy}
                            className="flex items-center gap-2 rounded-lg border border-red-500/30 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-red-200 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                          >
                            <Download className="h-3 w-3" />
                            Exportar
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 space-y-3">
                      {imageHistory.length === 0 && (
                        <div className="flex items-center gap-3 rounded-2xl border border-[#1b2530] bg-[#0d1218] px-4 py-4 text-slate-500 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.015)]">
                          <Search className="h-5 w-5 text-red-300" />
                          <div>
                            <p className="text-sm text-slate-300">Nenhuma busca visual registrada</p>
                            <p className="carmen-label text-xs uppercase tracking-[0.18em]">Use um pedido de imagem para alimentar o painel</p>
                          </div>
                        </div>
                      )}

                      {imageHistory.map((item) => (
                        <div
                          key={item.id}
                          className={`w-full rounded-2xl border px-4 py-3 transition-colors ${
                            selectedHistoryId === item.id
                              ? "border-red-500/45 bg-red-950/20 shadow-[0_0_24px_rgba(127,29,29,0.16)]"
                              : "border-[#1b2530] bg-[#0d1218] hover:border-red-500/25"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <button type="button" onClick={() => handleSelectHistory(item)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-950/30 text-red-300">
                                {item.source === "ai-pollinations" ? <Upload className="h-5 w-5" /> : <Globe className="h-5 w-5" />}
                              </div>
                              <div className="min-w-0">
                                {editingHistoryId === item.id ? (
                                  <div className="flex items-center gap-2">
                                    <input
                                      value={renameDraft}
                                      onChange={(event) => setRenameDraft(event.target.value)}
                                      className="w-full rounded-lg border border-red-500/30 bg-[#111821] px-2 py-1 text-sm text-slate-100 outline-none"
                                    />
                                    <button type="button" onClick={() => handleSaveRename(item.id)} className="text-emerald-300">
                                      <Check className="h-4 w-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <p className="truncate text-sm text-slate-200">{item.displayName}</p>
                                )}
                                <p className="carmen-label text-[11px] uppercase tracking-[0.16em] text-slate-500">
                                  {getSourceLabel(item.source)} • {formatPanelTime(item.createdAt)}
                                </p>
                              </div>
                            </button>
                            <div className="flex items-center gap-2">
                              <button type="button" onClick={() => handleToggleFavorite(item.id)} className={`${item.favorite ? "text-yellow-300" : "text-slate-500 hover:text-yellow-300"}`}>
                                <Star className="h-4 w-4" fill={item.favorite ? "currentColor" : "none"} />
                              </button>
                              <button type="button" onClick={() => handleStartRename(item)} className="text-slate-500 hover:text-slate-200">
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button type="button" onClick={() => handleSelectHistory(item)} className="text-red-300">
                                <Pin className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs uppercase tracking-[0.22em] text-slate-500">
                      <span>Progresso da exportação</span>
                      <span>{imageBoard ? `${exportBusy ? exportProgress : 100}%` : "0%"}</span>
                    </div>
                    <div className="mt-3 h-4 rounded-full border border-red-500/30 bg-[#12080a] p-[3px]">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,#ff7b7b,#ff4d57)] transition-all"
                        style={{ width: `${imageBoard ? (exportBusy ? exportProgress : 100) : 0}%` }}
                      />
                    </div>
                    <p className="mt-3 text-sm text-slate-300">
                      {imageBoard ? exportLabel : "Peça uma imagem para preencher o quadro com uma nova pista visual."}
                    </p>
                  </div>

                  <div>
                    <p className="carmen-label text-xs uppercase tracking-[0.24em] text-slate-500">Prévia do arquivo</p>
                    <div ref={previewCardRef} className="mt-3 rounded-[22px] border border-[#1b2530] bg-[#0d1218] p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)]">
                      <div className="aspect-[16/11] max-h-[250px] overflow-hidden rounded-2xl border border-red-500/20 bg-[linear-gradient(180deg,rgba(16,22,31,0.95),rgba(8,12,18,0.95))] sm:max-h-[280px]">
                        {imageBoard ? (
                          <img
                            src={imageBoard.imageUrl}
                            alt={imageBoard.title}
                            className="h-full w-full object-cover object-center"
                            referrerPolicy="no-referrer"
                            onError={() => setImageLoadError(true)}
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-500">
                            Diga: Carmen, mostre uma imagem de Paris ou faça uma imagem de um peixe de chapéu.
                          </div>
                        )}
                      </div>

                      {imageLoadError && (
                        <p className="mt-3 text-xs text-red-300">
                          A imagem não carregou nesta tentativa. Abra em Fonte ou faça uma nova consulta.
                        </p>
                      )}

                      <div className="mt-4 flex items-start justify-between gap-4">
                        <div>
                          <p className="carmen-display text-sm font-semibold uppercase tracking-[0.08em] text-red-200">
                            {imageBoard?.displayName || imageBoard?.title || "Sem referência visual"}
                          </p>
                          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                            Origem: {imageBoard?.source || "aguardando consulta"}
                          </p>
                          {imageBoard?.question && (
                            <p className="mt-2 text-xs text-slate-400">
                              Pedido: {imageBoard.question}
                            </p>
                          )}
                        </div>
                        {imageBoard?.pageUrl && (
                          <a
                            href={imageBoard.pageUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-red-300"
                          >
                            <Download className="h-4 w-4" />
                            Fonte
                          </a>
                        )}
                      </div>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </main>
        </div>
      </div>

      <AnimatePresence>
        {showChat && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-80 bg-[#070b10] border-l border-[#16202a] z-50 flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-[#16202a]">
              <h2 className="text-sm font-mono tracking-wider text-slate-400 uppercase">Histórico</h2>
              <button onClick={() => setShowChat(false)} className="text-gray-500 hover:text-white text-lg">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatHistory.length === 0 && (
                <p className="text-xs text-gray-600 text-center mt-8">Nenhuma conversa ainda...</p>
              )}
              {chatHistory.map((msg, index) => (
                <div key={index} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-lg px-3 py-2 text-xs ${
                    msg.role === "user"
                      ? "bg-[#111821] text-slate-300 border border-[#1b2530]"
                      : "bg-red-950/40 border border-red-900/30 text-red-200"
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
