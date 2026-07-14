import React from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import CarmenHologramaConsole from "./CarmenHologramaConsole";

class FakeUtterance {
  constructor(text) {
    this.text = text;
    this.lang = "";
    this.rate = 1;
    this.pitch = 1;
    this.volume = 1;
    this.voice = null;
    this.onstart = null;
    this.onend = null;
    this.onerror = null;
  }
}

class FakeAudio {
  constructor(url) {
    this.url = url;
    this.currentTime = 0;
    this.onplay = null;
    this.onended = null;
    this.onerror = null;
    this.pause = vi.fn();
  }

  play = vi.fn(async () => {
    this.onplay?.();
    this.onended?.();
  });
}

describe("CarmenHologramaConsole integration", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    global.SpeechSynthesisUtterance = FakeUtterance;
    global.Audio = FakeAudio;

    if (!global.URL) {
      global.URL = {};
    }

    global.URL.createObjectURL = vi.fn(() => "blob:fake-audio");
    global.URL.revokeObjectURL = vi.fn();

    const speak = vi.fn((utterance) => {
      utterance.onstart?.();
      utterance.onend?.();
    });

    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        speak,
        cancel: vi.fn(),
        getVoices: () => [
          {
            name: "Microsoft Maria Online",
            lang: "pt-BR",
            localService: false,
          },
        ],
        onvoiceschanged: null,
      },
    });

    global.fetch = vi.fn();
  });

  it("sanitiza resposta robotica da API e fala em modo humano", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reply: "Estou processando os dados em tempo real para sua solicitacao." }),
    });

    render(
      <CarmenHologramaConsole
        apiBaseUrl="https://api.fake"
        apiEndpointPath="api/chat"
        ttsEngineDefault="webspeech"
      />
    );

    fireEvent.change(screen.getByPlaceholderText(/Digite um comando para Carmen/i), {
      target: { value: "Onde está o alvo?" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Enviar comando/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(1);
    });

    const utterance = window.speechSynthesis.speak.mock.calls[0][0];
    expect(utterance.text.toLowerCase()).toContain("jogador");
    expect(utterance.text.toLowerCase()).not.toContain("processando os dados em tempo real");

    const payload = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(payload.style).toContain("humano");
    expect(payload.style).toContain("jogador");
    expect(payload.avoid).toContain("respostas roboticas");
  });

  it("faz fallback para resposta local quando API falha", async () => {
    global.fetch.mockRejectedValue(new Error("network error"));

    render(
      <CarmenHologramaConsole
        apiBaseUrl="https://api.fake"
        apiEndpointPath=""
        ttsEngineDefault="webspeech"
      />
    );

    fireEvent.change(screen.getByPlaceholderText(/Digite um comando para Carmen/i), {
      target: { value: "status" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Enviar comando/i }));

    await waitFor(() => {
      expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(1);
    });

    expect(global.fetch).toHaveBeenCalledTimes(3);

    const spokenText = window.speechSynthesis.speak.mock.calls[0][0].text.toLowerCase();
    expect(spokenText).toMatch(/sistemas|audio|canal|status|jogador/);
  });

  it("usa ElevenLabs quando chave esta configurada", async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ reply: "Jogador, aqui esta sua pista principal." }),
      })
      .mockResolvedValueOnce({
        ok: true,
        blob: async () => new Blob(["audio"], { type: "audio/mpeg" }),
      });

    render(
      <CarmenHologramaConsole
        apiBaseUrl="https://api.fake"
        apiEndpointPath="api/chat"
        elevenLabsApiKey="test-key"
        elevenLabsVoiceId="voice-123"
        ttsEngineDefault="elevenlabs"
      />
    );

    fireEvent.change(screen.getByPlaceholderText(/Digite um comando para Carmen/i), {
      target: { value: "me de uma pista" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Enviar comando/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    expect(window.speechSynthesis.speak).not.toHaveBeenCalled();
    expect(global.fetch.mock.calls[1][0]).toContain("https://api.elevenlabs.io/v1/text-to-speech/voice-123/stream");
    expect(global.fetch.mock.calls[1][1].headers["xi-api-key"]).toBe("test-key");
  });

  it("faz fallback para Web Speech quando ElevenLabs falha", async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ reply: "Jogador, vamos por outro caminho." }),
      })
      .mockResolvedValueOnce({
        ok: false,
        blob: async () => new Blob(["audio"], { type: "audio/mpeg" }),
      });

    render(
      <CarmenHologramaConsole
        apiBaseUrl="https://api.fake"
        apiEndpointPath="api/chat"
        elevenLabsApiKey="test-key"
        elevenLabsVoiceId="voice-123"
        ttsEngineDefault="elevenlabs"
      />
    );

    fireEvent.change(screen.getByPlaceholderText(/Digite um comando para Carmen/i), {
      target: { value: "qual a proxima rota" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Enviar comando/i }));

    await waitFor(() => {
      expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(1);
    });

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
