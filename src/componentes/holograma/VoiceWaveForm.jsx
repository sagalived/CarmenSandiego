import React from "react";
import { motion } from "framer-motion";

export default function VoiceWaveform({ isActive, color = "red" }) {
  const bars = 24;
  const colorClass = color === "red" ? "bg-red-500" : "bg-cyan-400";

  if (!isActive) return null;

  return (
    <div className="flex items-center justify-center gap-0.5 h-8">
      {Array.from({ length: bars }).map((_, i) => (
        <motion.div
          key={i}
          className={`w-1 rounded-full ${colorClass}`}
          animate={{
            height: [4, Math.random() * 28 + 4, 4],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            repeat: Infinity,
            duration: 0.5 + Math.random() * 0.5,
            delay: i * 0.04,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );
}