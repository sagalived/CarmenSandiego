import React, { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import HologramAvatar from "@/componentes/holograma/HologramaAvatar";
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
  const matrixCanvasRef = useRef(/** @type {HTMLCanvasElement | null} */ (null));
  const petalsCanvasRef = useRef(/** @type {HTMLCanvasElement | null} */ (null));

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

  React.useEffect(() => {
    const matrixCanvas = matrixCanvasRef.current;
    const petalsCanvas = petalsCanvasRef.current;
    if (!matrixCanvas || !petalsCanvas) {
      return undefined;
    }

    const mCtx = matrixCanvas.getContext("2d");
    const pCtx = petalsCanvas.getContext("2d");
    if (!mCtx || !pCtx) {
      return undefined;
    }

    const chars = "01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン".split("");
    const fontSize = 14;
    let mW = 0;
    let mH = 0;
    let pW = 0;
    let pH = 0;
    /** @type {number[]} */
    let drops = [];
    /** @type {number[]} */
    let speeds = [];
    /** @type {number | null} */
    let animationFrame = null;

    class Petal {
      constructor() {
        this.reset(true);
      }

      reset(initial = false) {
        this.size = 6 + Math.random() * 14;
        if (initial) {
          this.x = Math.random() * pW;
          this.y = Math.random() * pH;
        } else {
          this.x = Math.random() * pW;
          this.y = -30;
        }
        this.fallSpeed = 0.3 + Math.random() * 0.8;
        this.swingSpeed = 0.002 + Math.random() * 0.008;
        this.swingOffset = Math.random() * Math.PI * 2;
        this.angle = Math.random() * Math.PI * 2;
        this.rotation = (Math.random() - 0.5) * 0.03;
        this.opacity = 0.28 + Math.random() * 0.4;
      }

      update() {
        this.y += this.fallSpeed;
        this.x += Math.sin(Date.now() * this.swingSpeed + this.swingOffset) * 0.6;
        this.angle += this.rotation;
        if (this.y > pH + 24) {
          this.reset();
        }
      }

      draw(ctx) {
        const s = this.size;
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.shadowBlur = 12;
        ctx.shadowColor = "rgba(255, 60, 160, 0.35)";
        ctx.fillStyle = "rgba(255, 70, 170, 0.72)";
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.bezierCurveTo(s * 0.8, -s * 0.5, s * 0.9, s * 0.4, s * 0.25, s * 1.0);
        ctx.bezierCurveTo(0, s * 1.2, -s * 0.25, s * 1.0, -s * 0.9, s * 0.4);
        ctx.bezierCurveTo(-s * 0.8, -s * 0.5, 0, -s, 0, -s);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }

    class Dust {
      constructor() {
        this.x = Math.random() * pW;
        this.y = Math.random() * pH;
        this.vx = (Math.random() - 0.5) * 0.18;
        this.vy = -0.02 - Math.random() * 0.08;
        this.r = 0.6 + Math.random() * 1.2;
        this.opacity = 0.03 + Math.random() * 0.08;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.y < -10) {
          this.y = pH + 10;
          this.x = Math.random() * pW;
        }
        if (this.x < -10) this.x = pW + 10;
        if (this.x > pW + 10) this.x = -10;
      }

      draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.shadowBlur = 8;
        ctx.shadowColor = "rgba(0,255,180,0.2)";
        ctx.fillStyle = "rgba(80,255,210,0.45)";
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    /** @type {Petal[]} */
    let petals = [];
    /** @type {Dust[]} */
    let dust = [];

    const resizeAll = () => {
      mW = matrixCanvas.width = window.innerWidth;
      mH = matrixCanvas.height = window.innerHeight;
      pW = petalsCanvas.width = window.innerWidth;
      pH = petalsCanvas.height = window.innerHeight;

      const columns = Math.floor(mW / fontSize);
      drops = Array.from({ length: columns }, () => Math.random() * -100);
      speeds = Array.from({ length: columns }, () => 0.12 + Math.random() * 0.23);
      petals = Array.from({ length: Math.min(110, Math.floor((pW * pH) / 12000)) }, () => new Petal());
      dust = Array.from({ length: 40 }, () => new Dust());
    };

    const drawMatrix = () => {
      mCtx.fillStyle = "rgba(0,0,0,0.08)";
      mCtx.fillRect(0, 0, mW, mH);
      mCtx.font = `${fontSize}px 'Courier New', monospace`;

      for (let i = 0; i < drops.length; i += 1) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;
        mCtx.shadowBlur = 12;
        mCtx.shadowColor = "rgba(0,255,180,0.2)";
        mCtx.fillStyle = Math.random() > 0.95
          ? "rgba(180,255,230,0.9)"
          : `rgba(0,255,180,${0.15 + Math.random() * 0.35})`;
        mCtx.fillText(char, x, y);
        mCtx.shadowBlur = 0;
        drops[i] += speeds[i];
        if (y > mH && Math.random() > 0.975) {
          drops[i] = 0;
          speeds[i] = 0.12 + Math.random() * 0.23;
        }
      }
    };

    const render = () => {
      drawMatrix();
      pCtx.clearRect(0, 0, pW, pH);

      dust.forEach((d) => {
        d.update();
        d.draw(pCtx);
      });

      petals.sort((a, b) => a.size - b.size);
      petals.forEach((p) => {
        p.update();
        p.draw(pCtx);
      });

      pCtx.fillStyle = `rgba(0,255,180,${Math.sin(Date.now() * 0.0005) * 0.002 + 0.004})`;
      pCtx.fillRect(0, 0, pW, pH);

      animationFrame = window.requestAnimationFrame(render);
    };

    resizeAll();
    window.addEventListener("resize", resizeAll);
    animationFrame = window.requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", resizeAll);
      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame);
      }
    };
  }, []);

  return (
    <div className="relative min-h-screen w-screen max-w-full overflow-x-hidden bg-black text-white">
      <canvas ref={matrixCanvasRef} className="fixed inset-0 z-0 h-screen w-screen" aria-hidden="true" />
      <canvas ref={petalsCanvasRef} className="pointer-events-none fixed inset-0 z-[1] h-screen w-screen" aria-hidden="true" />
      <div className="pointer-events-none fixed inset-0 z-[2] bg-[radial-gradient(circle_at_center,rgba(0,0,0,0),rgba(0,0,0,0.32))]" />

      <div className="relative z-10 flex min-h-screen">
        <aside className="sticky top-2 self-start z-30 flex h-[calc(100vh-16px)] w-[220px] shrink-0 ml-1.5">
          <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[16px] border border-cyan-200/45 bg-[#03111a] p-2 shadow-[0_0_0_1px_rgba(125,211,252,0.16),0_18px_28px_rgba(0,0,0,0.72),inset_0_1px_0_rgba(207,250,254,0.18)]">
            <div className="mb-2 flex items-center justify-center">
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-md border border-red-500/45 bg-red-950/35 shadow-[0_0_16px_rgba(239,68,68,0.22)]">
                <img src="/carmen-holograma.png" alt="Carmen Logo" className="h-full w-full object-cover object-top opacity-90 mix-blend-screen saturate-150" />
              </div>
            </div>

            <nav className="space-y-1.5">
              {navItems.map((item) => (
                <motion.button
                  key={item.label}
                  type="button"
                  whileHover={item.active
                    ? { y: -2, scale: 1.02, boxShadow: "inset 0 1px 0 rgba(209,250,229,0.62), inset 0 -2px 0 rgba(0,0,0,0.56), 0 0 26px rgba(52,211,153,0.55), 0 0 34px rgba(248,113,113,0.4)" }
                    : { y: -2, scale: 1.02, boxShadow: "inset 0 1px 0 rgba(224,242,254,0.62), inset 0 -2px 0 rgba(0,0,0,0.62), 0 0 20px rgba(34,211,238,0.34)" }}
                  whileTap={{ y: 1, scale: 0.985 }}
                  transition={{ type: "spring", stiffness: 320, damping: 18, mass: 0.62 }}
                  className="group relative flex h-[46px] w-full items-center gap-2.5 overflow-hidden rounded-[14px] border px-3.5 py-2 text-left font-mono text-[12px] uppercase tracking-[0.08em]"
                  style={item.active
                    ? {
                        borderColor: "rgba(110, 255, 190, 0.9)",
                        background: "linear-gradient(180deg, rgba(52,132,94,1), rgba(26,76,57,1))",
                        boxShadow: "inset 0 1px 0 rgba(209,250,229,0.55), inset 0 -2px 0 rgba(0,0,0,0.56), 0 0 20px rgba(52,211,153,0.45), 0 0 26px rgba(248,113,113,0.35)"
                      }
                    : {
                        borderColor: "rgba(120, 225, 255, 0.82)",
                        background: "linear-gradient(180deg, rgba(36,104,132,1), rgba(18,56,75,1))",
                        boxShadow: "inset 0 1px 0 rgba(224,242,254,0.52), inset 0 -2px 0 rgba(0,0,0,0.62), 0 3px 8px rgba(0,0,0,0.45)"
                      }}
                >
                  <span className="pointer-events-none absolute inset-0 rounded-[14px] border border-white/15" />
                  <span className="pointer-events-none absolute left-[1px] right-[1px] top-[1px] h-[38%] rounded-t-[13px] bg-[linear-gradient(180deg,rgba(255,255,255,0.24),transparent)] transition-opacity duration-220 group-hover:opacity-100" />
                  {item.active && <span className="pointer-events-none absolute inset-y-1 left-0 w-[2px] rounded-full bg-emerald-200 shadow-[0_0_12px_rgba(110,231,183,0.95)]" />}
                  {item.active && <span className="pointer-events-none absolute right-0 top-0 h-5 w-5 bg-[radial-gradient(circle_at_top_right,rgba(248,113,113,0.85),transparent_62%)]" />}
                  <span className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-active:opacity-100" style={{ boxShadow: item.active ? "inset 0 0 18px rgba(110,255,190,0.2)" : "inset 0 0 18px rgba(120,225,255,0.24)" }} />
                  <item.icon className={`h-4.5 w-4.5 ${item.active ? "text-emerald-50" : "text-cyan-50"}`} />
                  <span className={`flex-1 font-semibold ${item.active ? "bg-[linear-gradient(90deg,#dcfce7,#fecaca)] bg-clip-text text-transparent" : "text-cyan-50"}`}>
                    {item.label}
                  </span>
                </motion.button>
              ))}
            </nav>

            <div className="mx-1 mb-2 mt-2 h-px bg-[linear-gradient(90deg,transparent,rgba(125,211,252,0.32),transparent)]" />

            <div className="relative mt-auto rounded-[8px] border border-red-500/35 bg-[#09070c] px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_2px_8px_rgba(0,0,0,0.45)]">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-red-400">
                Carmen AI <span className="font-normal text-red-100/58">v2.7.3</span>
              </p>
              <div className="mt-1.5 flex items-center justify-between font-mono text-[9px] tracking-[0.08em]">
                <span className="text-red-100/50">ID</span>
                <span className="font-medium text-red-100/85">CA-00942</span>
              </div>
              <div className="mt-1.5 border-t border-red-400/10 pt-1.5">
                <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.08em]">
                  <span className="text-red-100/50">Nível de acesso</span>
                  <span className="text-[10px] font-bold text-red-400">Admin</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex-1 px-4 py-4 md:px-6 xl:px-8">
          <header className="relative rounded-[22px] border border-red-500/18 bg-[#060a0f]/90 px-4 py-3 shadow-[0_18px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl md:px-5 md:py-4">
            <div className="pointer-events-none absolute inset-2 rounded-[18px] border border-red-500/8" />
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 md:gap-6">
                <div className="hidden h-12 w-24 items-center justify-center rounded-[18px] border border-red-500/30 bg-red-950/25 md:flex overflow-hidden">
                  <img src="/carmen-holograma.png" alt="Carmen Logo" className="h-[250%] w-full object-cover object-top opacity-80 mix-blend-screen saturate-150" style={{ objectPosition: "50% 15%" }} />
                </div>
                <div className="carmen-display flex items-center gap-2 whitespace-nowrap text-[1.45rem] font-semibold uppercase tracking-[0.12em] md:gap-3 md:text-[1.85rem] 2xl:text-[2rem]">
                  <span className="text-red-500">Carmen AI</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-200">Holograma</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowChat(!showChat)}
                  className="rounded-2xl border border-red-900/50 bg-[#090d12] p-3 text-red-100/60 transition-colors hover:border-red-500/40 hover:text-white"
                >
                  <MessageSquare className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  className="relative rounded-2xl border border-red-900/50 bg-[#090d12] p-3 text-red-100/60 transition-colors hover:border-red-500/40 hover:text-white"
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
            <section className="relative flex items-start justify-center rounded-[30px] p-2 md:p-3">
              <div className="w-full max-w-[660px] 2xl:max-w-[700px]">
                <HologramAvatar
                  isSpeaking={isSpeaking}
                  isListening={isListening}
                  status={status}
                />

                <div className="mt-4 flex justify-center">
                  <MicButton
                    isListening={isListening}
                    isSpeaking={isSpeaking}
                    onToggle={toggleListening}
                    disabled={isProcessing}
                  />
                </div>
              </div>
            </section>

            <aside className="relative overflow-hidden rounded-[28px] border border-red-400/25 bg-[linear-gradient(180deg,rgba(26,8,12,0.96),rgba(11,6,10,0.96))] p-4 shadow-[0_0_30px_rgba(220,38,38,0.14),inset_0_0_0_1px_rgba(252,165,165,0.08)] md:p-5">
              <div className="pointer-events-none absolute inset-2 rounded-[22px] border border-red-200/10" />

              <div className="relative flex items-center justify-center gap-3 border-b border-red-300/20 pb-5 pt-1">
                <Upload className="h-7 w-7 text-red-200" />
                <h2 className="carmen-display text-[1.9rem] font-semibold uppercase tracking-[0.08em] text-red-100">
                  Exportar arquivo
                </h2>
              </div>

              <div className="relative mt-5 space-y-5">
                <div>
                  <p className="carmen-label mb-3 text-xs uppercase tracking-[0.2em] text-red-100/50">Selecione o arquivo</p>
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between rounded-xl border border-red-200/15 bg-[#120a10] px-3 py-2.5 shadow-[inset_0_0_0_1px_rgba(252,165,165,0.06)]">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-300/30 bg-red-500/10 text-red-200">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-100">relatorio_visual.pdf</p>
                          <p className="text-[11px] text-slate-400">2.4 MB</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setExportFormat("pdf"); setTimeout(handleExport, 0); }}
                        disabled={!imageBoard || exportBusy}
                        className="flex items-center gap-2 rounded-lg border border-red-200/25 bg-[linear-gradient(180deg,rgba(70,18,28,0.9),rgba(36,10,16,0.9))] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-red-100 transition-all hover:border-red-200/45 hover:text-white disabled:opacity-50"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Exportar
                      </button>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-red-200/15 bg-[#120a10] px-3 py-2.5 shadow-[inset_0_0_0_1px_rgba(252,165,165,0.06)]">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-300/30 bg-red-500/10 text-red-200">
                          <FileImage className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-100">saida_imagem.png</p>
                          <p className="text-[11px] text-slate-400">1.8 MB</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setExportFormat("png"); setTimeout(handleExport, 0); }}
                        disabled={!imageBoard || exportBusy}
                        className="flex items-center gap-2 rounded-lg border border-red-200/25 bg-[linear-gradient(180deg,rgba(70,18,28,0.9),rgba(36,10,16,0.9))] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-red-100 transition-all hover:border-red-200/45 hover:text-white disabled:opacity-50"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Exportar
                      </button>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-red-200/15 bg-[#120a10] px-3 py-2.5 shadow-[inset_0_0_0_1px_rgba(252,165,165,0.06)]">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-orange-300/30 bg-orange-500/10 text-orange-200">
                          <FileJson className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-100">dados_brutos.json</p>
                          <p className="text-[11px] text-slate-400">3.1 MB</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setExportFormat("json"); setTimeout(handleExport, 0); }}
                        disabled={!imageBoard || exportBusy}
                        className="flex items-center gap-2 rounded-lg border border-red-200/25 bg-[linear-gradient(180deg,rgba(70,18,28,0.9),rgba(36,10,16,0.9))] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-red-100 transition-all hover:border-red-200/45 hover:text-white disabled:opacity-50"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Exportar
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-red-100/55">
                    <span>Progresso da exportação</span>
                    <span>{imageBoard ? `${exportBusy ? exportProgress : 100}%` : "0%"}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-300">
                    {imageBoard ? exportLabel : "Exportando..."}
                  </p>
                  <div className="mt-2 rounded-full border border-rose-200/25 bg-[#1b0f13] p-[3px] shadow-[0_0_14px_rgba(251,113,133,0.2)]">
                    <div
                      className="h-2.5 rounded-full bg-[linear-gradient(90deg,#f97316_0%,#fb7185_50%,#f59e0b_100%)] transition-all"
                      style={{ width: `${imageBoard ? (exportBusy ? exportProgress : 100) : 0}%` }}
                    />
                  </div>
                </div>

                <div>
                  <p className="carmen-label text-xs uppercase tracking-[0.2em] text-red-100/55">Prévia do arquivo</p>
                  <div
                    ref={previewCardRef}
                    className="mt-3 rounded-[20px] border border-red-200/25 bg-[linear-gradient(180deg,rgba(33,12,18,0.96),rgba(18,7,12,0.96))] p-3 shadow-[inset_0_0_0_1px_rgba(252,165,165,0.1)]"
                  >
                    <div className="aspect-[16/11] overflow-hidden rounded-xl border border-red-200/20 bg-[#130a10]">
                      {imageBoard ? (
                        <img
                          src={imageBoard.imageUrl}
                          alt={imageBoard.title}
                          className="h-full w-full object-cover object-center"
                          referrerPolicy="no-referrer"
                          onError={() => setImageLoadError(true)}
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center px-5 text-center text-sm text-red-100/45">
                          Sem referência visual disponível.
                        </div>
                      )}
                    </div>

                    {imageLoadError && (
                      <p className="mt-3 text-xs text-rose-300">
                        A imagem não carregou nesta tentativa. Abra em Fonte ou faça nova consulta.
                      </p>
                    )}

                    <div className="mt-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="carmen-display text-sm font-semibold uppercase tracking-[0.08em] text-red-100">
                          {imageBoard?.displayName || imageBoard?.title || "Sem referência visual"}
                        </p>
                        <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-red-100/45">
                          Origem: {imageBoard?.source || "aguardando consulta"}
                        </p>
                      </div>
                      {imageBoard?.pageUrl && (
                        <a
                          href={imageBoard.pageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-red-100"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Fonte
                        </a>
                      )}
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
