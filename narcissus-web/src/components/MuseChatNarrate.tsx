"use client";

import { useEffect, useState } from "react";
import {
  narrationStateFor,
  pauseNarration,
  resumeNarration,
  speakMessage,
  speechSupported,
  stopNarration,
  subscribeNarration,
  type MuseVoiceSettings,
  type SpeakState,
} from "@/lib/museVoice";

type MuseChatNarrateProps = {
  messageId: string;
  text: string;
  settings: MuseVoiceSettings;
  /** Show optional narrate for user bubbles (off chrome when false). */
  enabled?: boolean;
  className?: string;
};

/**
 * Phone-friendly play / pause / stop control for a single chat bubble.
 */
export function MuseChatNarrate({
  messageId,
  text,
  settings,
  enabled = true,
  className = "",
}: MuseChatNarrateProps) {
  const [supported, setSupported] = useState(false);
  const [state, setState] = useState<SpeakState>("idle");

  useEffect(() => {
    setSupported(speechSupported());
    return subscribeNarration(() => {
      setState(narrationStateFor(messageId));
    });
  }, [messageId]);

  useEffect(() => {
    setState(narrationStateFor(messageId));
  }, [messageId]);

  if (!enabled || !supported || !text.trim()) return null;

  function onPlay() {
    if (state === "paused") {
      resumeNarration();
      return;
    }
    speakMessage(messageId, text, settings);
  }

  return (
    <div
      className={`muse-chat-narrate ${className}`}
      role="group"
      aria-label="Narrate message"
      data-testid={`muse-chat-narrate-${messageId}`}
    >
      {state === "idle" ? (
        <button
          type="button"
          className="muse-chat-narrate-btn"
          onClick={onPlay}
          aria-label="Play narration"
          data-testid={`muse-chat-narrate-play-${messageId}`}
        >
          Play
        </button>
      ) : (
        <>
          <button
            type="button"
            className="muse-chat-narrate-btn muse-chat-narrate-btn--on"
            onClick={() =>
              state === "paused" ? resumeNarration() : pauseNarration()
            }
            aria-label={state === "paused" ? "Resume narration" : "Pause narration"}
            data-testid={`muse-chat-narrate-pause-${messageId}`}
          >
            {state === "paused" ? "Resume" : "Pause"}
          </button>
          <button
            type="button"
            className="muse-chat-narrate-btn"
            onClick={() => stopNarration()}
            aria-label="Stop narration"
            data-testid={`muse-chat-narrate-stop-${messageId}`}
          >
            Stop
          </button>
        </>
      )}
    </div>
  );
}
