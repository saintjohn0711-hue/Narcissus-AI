"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_VOICE_PREVIEW_LINE,
  getVoiceHint,
  isVoicePreviewActive,
  narrationSupported,
  naturalTtsAvailable,
  previewVoice,
  stopNarration,
  subscribeNarration,
  warmSpeechVoices,
  type MuseVoiceSettings,
} from "@/lib/museVoice";

export type MuseVoicePreviewApi = {
  sample: string;
  setSample: (value: string) => void;
  supported: boolean;
  /** True when OpenAI TTS is configured server-side. */
  natural: boolean;
  previewing: boolean;
  /** Soft status (missing key / browser recovery) — never blocks chat. */
  hint: string | null;
  preview: (settings: MuseVoiceSettings) => void;
  stop: () => void;
};

/** Shared sample line + preview helpers for Muse edit + Companion Voice. */
export function useMuseVoicePreview(
  initialSample = DEFAULT_VOICE_PREVIEW_LINE,
): MuseVoicePreviewApi {
  const [sample, setSample] = useState(initialSample);
  const [supported, setSupported] = useState(false);
  const [natural, setNatural] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    setSupported(narrationSupported());
    const cool = warmSpeechVoices();
    void naturalTtsAvailable().then(setNatural);
    const unsub = subscribeNarration(() => {
      setPreviewing(isVoicePreviewActive());
      setHint(getVoiceHint());
    });
    return () => {
      cool();
      unsub();
    };
  }, []);

  function preview(settings: MuseVoiceSettings) {
    if (!narrationSupported()) return;
    previewVoice(settings, sample);
  }

  return {
    sample,
    setSample,
    supported,
    natural,
    previewing,
    hint,
    preview,
    stop: stopNarration,
  };
}

type MuseVoicePreviewBarProps = {
  api: MuseVoicePreviewApi;
  /** Current selection — used by the explicit Preview button. */
  settings: MuseVoiceSettings;
  className?: string;
  /** Compact layout for the Companion Voice panel. */
  compact?: boolean;
};

/**
 * Optional sample line + Preview / Stop — phone-friendly tap targets.
 * Selection chips call `api.preview(nextSettings)` themselves.
 */
export function MuseVoicePreviewBar({
  api,
  settings,
  className = "",
  compact = false,
}: MuseVoicePreviewBarProps) {
  if (!api.supported) {
    return (
      <p
        className={`text-xs text-[var(--muted)] ${className}`}
        data-testid="muse-voice-preview-unsupported"
      >
        Speech isn’t available in this browser.
      </p>
    );
  }

  return (
    <div
      className={`muse-voice-preview ${compact ? "muse-voice-preview--compact" : ""} ${className}`}
      data-testid="muse-voice-preview"
      data-engine={api.natural ? "openai" : "web-speech"}
    >
      <label className="muse-voice-preview-label" htmlFor="muse-voice-preview-sample">
        Sample line
        <span className="muse-voice-preview-optional">optional</span>
      </label>
      <input
        id="muse-voice-preview-sample"
        type="text"
        value={api.sample}
        onChange={(e) => api.setSample(e.target.value)}
        placeholder={DEFAULT_VOICE_PREVIEW_LINE}
        maxLength={180}
        className="muse-voice-preview-input"
        data-testid="muse-voice-preview-sample"
        enterKeyHint="done"
        autoComplete="off"
      />
      <div className="muse-voice-preview-actions">
        <button
          type="button"
          className={`muse-chat-tool ${api.previewing ? "muse-chat-tool--on" : ""}`}
          onClick={() => api.preview(settings)}
          data-testid="muse-voice-preview-play"
          aria-label="Preview selected voice"
        >
          {api.previewing ? "Playing…" : "Preview"}
        </button>
        <button
          type="button"
          className="muse-chat-tool"
          onClick={() => api.stop()}
          disabled={!api.previewing}
          data-testid="muse-voice-preview-stop"
          aria-label="Stop voice preview"
        >
          Stop
        </button>
      </div>
      <p className="muse-voice-preview-hint">
        {api.natural
          ? "Selecting gender, accent, or delivery plays a short natural voice test."
          : "Using this browser’s voice for now — natural Muse TTS needs OPENAI_API_KEY on the server. Chat stays usable either way."}
      </p>
      {api.hint ? (
        <p
          className="muse-voice-preview-hint muse-voice-preview-hint--soft"
          data-testid="muse-voice-soft-hint"
          role="status"
        >
          {api.hint}
        </p>
      ) : null}
    </div>
  );
}
