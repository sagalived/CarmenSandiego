import React from "react";
import { motion } from "framer-motion";

const CARMEN_IMG = "/carmen-holograma.png";

/**
 * @typedef {Object} HologramAvatarProps
 * @property {boolean} isSpeaking
 * @property {boolean} isListening
 * @property {string} status
 */

/** @param {HologramAvatarProps} props */
export default function HologramAvatar({ isSpeaking, isListening, status }) {
  return (
    <div className="relative mx-auto w-full max-w-[560px] 2xl:max-w-[620px]">
      <motion.div
        className="relative overflow-hidden rounded-[32px] border border-red-500/30 bg-[#11060a] shadow-[inset_0_0_0_1px_rgba(239,68,68,0.08),0_0_0_1px_rgba(239,68,68,0.06)]"
        animate={isSpeaking ? { scale: [1, 1.01, 1] } : isListening ? { scale: [1, 1.005, 1] } : {}}
        transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
      >
        <div className="absolute inset-[14px] rounded-[24px] border border-red-500/10" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.15),transparent_45%),linear-gradient(180deg,rgba(18,3,5,0.1),rgba(18,6,8,0.85))]" />
        <div className="absolute left-4 top-4 h-5 w-16 border-l border-t border-red-500/80" />
        <div className="absolute right-4 top-4 h-5 w-16 border-r border-t border-red-500/80" />
        <div className="absolute bottom-16 left-4 h-5 w-16 border-b border-l border-red-500/80" />
        <div className="absolute bottom-16 right-4 h-5 w-16 border-b border-r border-red-500/80" />

        <div className="pointer-events-none absolute left-3 top-10 hidden w-20 rounded-xl border border-red-500/20 bg-[#19080b]/82 p-3 text-left text-[10px] uppercase tracking-[0.18em] text-slate-500 md:block">
          <p className="text-red-400">ID: Carmen_AI</p>
          <p className="mt-3 text-slate-400">Versão 2.7.3</p>
          <p className="mt-3 text-emerald-400">Status: Online</p>
        </div>

        <div className="pointer-events-none absolute left-3 bottom-20 hidden h-20 w-20 rounded-xl border border-red-500/20 bg-[#19080b]/82 md:block">
          <div className="h-full w-full bg-[radial-gradient(circle_at_35%_45%,rgba(239,68,68,0.24),transparent_28%),linear-gradient(180deg,transparent,rgba(239,68,68,0.08))]" />
        </div>

        <div className="pointer-events-none absolute right-3 top-10 hidden w-20 rounded-xl border border-red-500/20 bg-[#19080b]/82 p-3 text-left text-[10px] uppercase tracking-[0.18em] text-slate-500 md:block">
          <p className="text-red-400">Protocolo</p>
          <p className="mt-3 text-slate-400">128-bit</p>
          <p className="mt-3 text-slate-400">Ativo</p>
        </div>

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
          src={CARMEN_IMG} 
          alt="Carmen San Diego AI"
          className="hologram-avatar-image aspect-square w-full object-cover"
          style={{
            objectPosition: "50% 25%",
            transform: isSpeaking ? "scale(1.15)" : isListening ? "scale(1.08)" : "scale(1.05)",
            filter: `brightness(${isSpeaking ? 1.15 : 1.06}) contrast(1.1) saturate(1.14)`
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