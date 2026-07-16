import React from "react";
import { motion } from "framer-motion";

const CARMEN_IMG = "/carmen-realista.png";
const CARMEN_IMG_FALLBACK = "/carmen-holograma.png";

/**
 * @typedef {Object} HologramAvatarProps
 * @property {boolean} isSpeaking
 * @property {boolean} isListening
 * @property {string} status
 */

/** @param {HologramAvatarProps} props */
export default function HologramAvatar({ isSpeaking, isListening, status }) {
  const [avatarSrc, setAvatarSrc] = React.useState(CARMEN_IMG);

  return (
    <div className="relative mx-auto w-full max-w-[560px] 2xl:max-w-[620px]">
      <motion.div
        className="relative overflow-hidden rounded-[32px] border border-red-500/30 bg-[#11060a] shadow-[inset_0_0_0_1px_rgba(239,68,68,0.08),0_0_0_1px_rgba(239,68,68,0.06)]"
        animate={isSpeaking ? { scale: [1, 1.01, 1] } : isListening ? { scale: [1, 1.005, 1] } : {}}
        transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
      >
        <div className="absolute inset-[14px] rounded-[24px] border border-red-500/10" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.15),transparent_45%),linear-gradient(180deg,rgba(18,3,5,0.1),rgba(18,6,8,0.85))]" />
        <motion.div
          className="absolute inset-[10px] rounded-[26px] border"
          animate={{
            borderColor: ["rgba(255,76,76,0.18)", "rgba(56,189,248,0.28)", "rgba(255,76,76,0.18)"],
            boxShadow: [
              "0 0 0 rgba(0,0,0,0)",
              "inset 0 0 30px rgba(56,189,248,0.14), 0 0 28px rgba(239,68,68,0.18)",
              "0 0 0 rgba(0,0,0,0)"
            ]
          }}
          transition={{ repeat: Infinity, duration: 4.6, ease: "easeInOut" }}
        />
        <div className="absolute left-4 top-4 h-5 w-16 border-l border-t border-red-500/80" />
        <div className="absolute right-4 top-4 h-5 w-16 border-r border-t border-red-500/80" />
        <div className="absolute bottom-16 left-4 h-5 w-16 border-b border-l border-red-500/80" />
        <div className="absolute bottom-16 right-4 h-5 w-16 border-b border-r border-red-500/80" />

        <motion.div
          className="pointer-events-none absolute left-3 top-10 hidden w-20 rounded-xl border bg-[#19080b]/82 p-3 text-left text-[10px] uppercase tracking-[0.18em] text-slate-500 md:block"
          animate={{
            borderColor: ["rgba(239,68,68,0.28)", "rgba(34,211,238,0.35)", "rgba(239,68,68,0.28)"],
            boxShadow: [
              "0 0 12px rgba(239,68,68,0.1)",
              "0 0 18px rgba(34,211,238,0.22), inset 0 0 20px rgba(239,68,68,0.14)",
              "0 0 12px rgba(239,68,68,0.1)"
            ]
          }}
          transition={{ repeat: Infinity, duration: 3.2, ease: "easeInOut" }}
        >
          <p className="text-red-400">ID: Carmen_AI</p>
          <p className="mt-3 text-slate-400">Versão 2.7.3</p>
          <p className="mt-3 text-emerald-400">Status: Online</p>
          <motion.div
            className="absolute inset-y-2 left-1 w-[2px] bg-cyan-300/70"
            animate={{ opacity: [0.2, 0.9, 0.2] }}
            transition={{ repeat: Infinity, duration: 1.6 }}
          />
        </motion.div>

        <div className="pointer-events-none absolute left-3 bottom-20 hidden h-20 w-20 rounded-xl border border-red-500/20 bg-[#19080b]/82 md:block">
          <div className="h-full w-full bg-[radial-gradient(circle_at_35%_45%,rgba(239,68,68,0.24),transparent_28%),linear-gradient(180deg,transparent,rgba(239,68,68,0.08))]" />
        </div>

        <motion.div
          className="pointer-events-none absolute right-3 top-10 hidden w-20 rounded-xl border bg-[#19080b]/82 p-3 text-left text-[10px] uppercase tracking-[0.18em] text-slate-500 md:block"
          animate={{
            borderColor: ["rgba(239,68,68,0.28)", "rgba(34,211,238,0.35)", "rgba(239,68,68,0.28)"],
            boxShadow: [
              "0 0 12px rgba(239,68,68,0.1)",
              "0 0 18px rgba(34,211,238,0.22), inset 0 0 20px rgba(239,68,68,0.14)",
              "0 0 12px rgba(239,68,68,0.1)"
            ]
          }}
          transition={{ repeat: Infinity, duration: 3.2, ease: "easeInOut", delay: 0.4 }}
        >
          <p className="text-red-400">Protocolo</p>
          <p className="mt-3 text-slate-400">128-bit</p>
          <p className="mt-3 text-slate-400">Ativo</p>
          <motion.div
            className="absolute inset-y-2 right-1 w-[2px] bg-cyan-300/70"
            animate={{ opacity: [0.2, 0.9, 0.2] }}
            transition={{ repeat: Infinity, duration: 1.6 }}
          />
        </motion.div>

        <div className="pointer-events-none absolute right-3 bottom-20 hidden w-20 space-y-3 md:block">
          <div className="rounded-xl border border-red-500/18 bg-[#19080b]/82 p-3">
            <div className="grid grid-cols-5 gap-1">
              {Array.from({ length: 10 }).map((_, index) => (
                <span
                  key={index}
                  className="h-5 rounded-sm bg-[linear-gradient(180deg,rgba(239,68,68,0.65),rgba(239,68,68,0.12))]"
                  style={{ opacity: 0.35 + ((index % 5) + 1) / 8 }}
                />
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-red-500/18 bg-[#19080b]/82 p-3">
            <div className="mx-auto h-8 w-8 rounded-full border border-red-400/50" />
          </div>
        </div>

        <img
          src={avatarSrc}
          alt="Carmen San Diego AI"
          className="hologram-avatar-image aspect-square w-full object-contain"
          onError={() => {
            if (avatarSrc !== CARMEN_IMG_FALLBACK) {
              setAvatarSrc(CARMEN_IMG_FALLBACK);
            }
          }}
          style={{
            objectPosition: "50% 46%",
            transform: isSpeaking ? "scale(0.97)" : isListening ? "scale(0.95)" : "scale(0.93)",
            filter: `brightness(${isSpeaking ? 1.08 : 1.02}) contrast(1.05) saturate(1.04) drop-shadow(0 0 34px rgba(255,40,82,0.22))`
          }}
        />

        <div 
          className="absolute inset-0 pointer-events-none opacity-25"
          style={{
            background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,0,0,0.03) 2px, rgba(255,0,0,0.03) 4px)"
          }}
        />

        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(180deg, transparent 0%, rgba(255,0,0,0.05) 50%, transparent 100%)"
          }}
          animate={{ y: ["-100%", "100%"] }}
          transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
        />

        <div className="absolute inset-0 shadow-[inset_0_0_60px_rgba(239,68,68,0.08),inset_0_0_80px_rgba(220,38,38,0.12)]" />
        <div className="hologram-avatar-pulse absolute inset-x-[18%] bottom-[10%] h-10 rounded-full bg-red-500/10 blur-2xl" />
        <div className="pointer-events-none absolute inset-x-[22%] bottom-[6%] h-8 rounded-full border border-red-500/25 opacity-80" />
      </motion.div>

      <div className="mt-3 flex items-center justify-center gap-3 sm:mt-4">
        <motion.div 
          className={`w-2.5 h-2.5 rounded-full ${
            isSpeaking ? "bg-red-500" : isListening ? "bg-red-400" : "bg-emerald-500"
          }`}
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        />
        <span className="text-[1.55rem] font-semibold tracking-[0.12em] uppercase text-emerald-400 sm:text-[1.8rem] 2xl:text-[2rem]">
          {status}
        </span>
      </div>
    </div>
  );
}