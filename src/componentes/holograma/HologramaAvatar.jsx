import React from "react";
import { motion } from "framer-motion";

const CARMEN_IMG = "https://media.base44.com/images/public/6a531f2e92264ebcf71514ee/8d9143c48_generated_image.png";

export default function HologramAvatar({ isSpeaking, isListening, status }) {
  return (
    <div className="relative flex items-center justify-center">
      {/* Outer glow rings */}
      <div className="absolute w-80 h-80 md:w-96 md:h-96 rounded-full border border-red-500/20 animate-pulse" />
      <div className="absolute w-72 h-72 md:w-88 md:h-88 rounded-full border border-cyan-500/10" />
      
      {/* Hologram container */}
      <motion.div
        className="relative w-64 h-64 md:w-80 md:h-80 rounded-full overflow-hidden"
        animate={isSpeaking ? { scale: [1, 1.02, 1] } : isListening ? { scale: [1, 1.01, 1] } : {}}
        transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
      >
        {/* Background glow */}
        <div className="absolute inset-0 bg-gradient-radial from-red-900/40 via-red-950/20 to-transparent rounded-full" />
        
        {/* Carmen image */}
        <img 
          src={CARMEN_IMG} 
          alt="Carmen San Diego AI"
          className="w-full h-full object-cover rounded-full"
          style={{
            filter: `brightness(${isSpeaking ? 1.3 : 1.1}) contrast(1.1) saturate(1.2)`,
            mixBlendMode: "screen"
          }}
        />
        
        {/* Scanline overlay */}
        <div 
          className="absolute inset-0 pointer-events-none rounded-full opacity-30"
          style={{
            background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,255,0.03) 2px, rgba(0,255,255,0.03) 4px)"
          }}
        />

        {/* Holographic shimmer */}
        <motion.div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: "linear-gradient(180deg, transparent 0%, rgba(0,255,255,0.05) 50%, transparent 100%)"
          }}
          animate={{ y: ["-100%", "100%"] }}
          transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
        />

        {/* Edge glow */}
        <div className="absolute inset-0 rounded-full shadow-[inset_0_0_30px_rgba(220,38,38,0.3),inset_0_0_60px_rgba(0,255,255,0.1)]" />
      </motion.div>

      {/* Status indicator */}
      <div className="absolute -bottom-2 flex items-center gap-2">
        <motion.div 
          className={`w-2.5 h-2.5 rounded-full ${
            isSpeaking ? "bg-red-500" : isListening ? "bg-cyan-400" : "bg-emerald-500"
          }`}
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        />
        <span className="text-xs font-mono tracking-widest uppercase text-gray-400">
          {status}
        </span>
      </div>
    </div>
  );
}
