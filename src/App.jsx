import React from "react";
import CarmenHologramaConsole from "./componentes/holograma/CarmenHologramaConsole";

const resolveElevenLabsApiKey = () => {
  const env = import.meta.env;
  const fromEnv =
    env.VITE_ELEVENLABS_API_KEY ||
    env.VITE_ELEVENLABS_APIKEY ||
    env.VITE_XI_API_KEY ||
    "";

  if (fromEnv.trim()) return fromEnv.trim();

  if (typeof window !== "undefined") {
    const fromStorage = window.localStorage.getItem("VITE_ELEVENLABS_API_KEY") || "";
    if (fromStorage.trim()) return fromStorage.trim();
  }

  return "";
};

export default function App() {
  const elevenLabsApiKey = resolveElevenLabsApiKey();
  const elevenLabsVoiceId = import.meta.env.VITE_ELEVENLABS_VOICE_ID || "4tRn1lSkEn13EVTuqb0g";

  return (
    <CarmenHologramaConsole
      apiBaseUrl="https://carmen-glow-ai.base44.app"
      apiEndpointPath=""
      elevenLabsApiKey={elevenLabsApiKey}
      elevenLabsVoiceId={elevenLabsVoiceId}
      ttsEngineDefault={elevenLabsApiKey ? "elevenlabs" : "webspeech"}
      title="CARMEN AI • HOLOGRAMA"
    />
  );
}
