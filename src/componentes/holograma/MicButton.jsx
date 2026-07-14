import React from "react";
import { motion } from "framer-motion";
import { Mic, MicOff, Volume2 } from "lucide-react";

export default function MicButton({ isListening, isSpeaking, onToggle, disabled }) {
  return (
    <div className="relative">
      {/* Pulse rings when listening */}
      {isListening && (
        <>
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-cyan-400/40"
            animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          />
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-cyan-400/30"
            animate={{ scale: [1, 2.2], opacity: [0.4, 0] }}
            transition={{ repeat: Infinity, duration: 1.5, delay: 0.3 }}
          />
        </>
      )}

      <motion.button
        onClick={onToggle}
        disabled={disabled || isSpeaking}
        whileTap={{ scale: 0.9 }}
        className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
          isListening
            ? "bg-cyan-500 shadow-[0_0_30px_rgba(6,182,212,0.5)] text-white"
            : isSpeaking
            ? "bg-red-600 shadow-[0_0_30px_rgba(220,38,38,0.4)] text-white cursor-not-allowed"
            : "bg-gray-800 border border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-white hover:border-red-500/50 hover:shadow-[0_0_20px_rgba(220,38,38,0.2)]"
        }`}
      >
        {isSpeaking ? (
          <Volume2 className="w-6 h-6 animate-pulse" />
        ) : isListening ? (
          <MicOff className="w-6 h-6" />
        ) : (
          <Mic className="w-6 h-6" />
        )}
      </motion.button>

      <p className="text-center mt-3 text-xs font-mono tracking-wider text-gray-500">
        {isSpeaking ? "RESPONDENDO..." : isListening ? "OUVINDO..." : "TOQUE PARA FALAR"}
      </p>
    </div>
  );
}