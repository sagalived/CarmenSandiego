import React from "react";
import { motion } from "framer-motion";
import { Mic, MicOff, Volume2 } from "lucide-react";

/**
 * @typedef {Object} MicButtonProps
 * @property {boolean} isListening
 * @property {boolean} isSpeaking
 * @property {() => void} onToggle
 * @property {boolean} disabled
 */

/** @param {MicButtonProps} props */
export default function MicButton({ isListening, isSpeaking, onToggle, disabled }) {
  return (
    <div className="relative w-full max-w-[380px]">
      <motion.button
        onClick={onToggle}
        disabled={disabled || isSpeaking}
        whileTap={{ scale: 0.9 }}
        className={`relative z-10 flex w-full items-center justify-center gap-4 rounded-[26px] border px-5 py-4 transition-all duration-300 ${
          isListening
            ? "border-cyan-400/70 bg-cyan-500/10 shadow-[0_0_35px_rgba(6,182,212,0.28)] text-white"
            : isSpeaking
            ? "border-red-500/80 bg-red-600/12 shadow-[0_0_35px_rgba(220,38,38,0.24)] text-white cursor-not-allowed"
            : "border-red-500/50 bg-[linear-gradient(180deg,rgba(27,10,12,0.96),rgba(16,8,10,0.96))] text-white hover:border-red-400 hover:shadow-[0_0_24px_rgba(220,38,38,0.22)]"
        }`}
      >
        <span className={`flex h-14 w-14 items-center justify-center rounded-full border ${
          isListening ? "border-cyan-400/70 bg-cyan-400/15" : "border-red-500/60 bg-red-500/12"
        }`}>
          {isSpeaking ? (
            <Volume2 className="h-6 w-6 animate-pulse" />
          ) : isListening ? (
            <MicOff className="h-6 w-6" />
          ) : (
            <Mic className="h-6 w-6 text-red-300" />
          )}
        </span>
        <span className="text-xl font-semibold uppercase tracking-[0.12em]">
          {isSpeaking ? "Respondendo" : isListening ? "Ouvindo jogador" : "Toque para falar"}
        </span>
      </motion.button>
    </div>
  );
}