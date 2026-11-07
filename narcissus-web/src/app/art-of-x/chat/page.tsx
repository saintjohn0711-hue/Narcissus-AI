"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { AppNav } from "@/components/AppNav";
import {
  displayName,
  genderLabel,
  mainPhoto,
  normalizeKinks,
  type ChatMessage,
  type PartnerRecord,
} from "@/lib/artOfX";
import { fetchChats, fetchPartners, persistChats } from "@/lib/artOfXStore";
import type { ChatPov } from "@/lib/xai";

async function readXaiSseStream(
  res: Response,
  onDelta: (chunk: string) => void,
): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n");
    buffer = parts.pop() || "";

    for (const line of parts) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const json = JSON.parse(payload) as {
          choices?: Array<{ delta?: { content?: string } }>;
        };
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) {
          full += delta;
          onDelta(delta);
        }
      } catch {
        // ignore malformed SSE chunks
      }
    }
  }
  return full;
}

export default function ChatPage() {
  const [partners, setPartners] = useState<PartnerRecord[]>([]);
  const [chats, setChats] = useState<Record<string, ChatMessage[]>>({});
  const [activeId, setActiveId] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [ready, setReady] = useState(false);
  const [pov, setPov] = useState<ChatPov>("1st");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelLabel, setModelLabel] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [list, map] = await Promise.all([fetchPartners(), fetchChats()]);
      if (cancelled) return;
      setPartners(list);
      setChats(map);
      if (list[0]) setActiveId(list[0].id);
      setReady(true);
    })().catch(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    void persistChats(chats).catch(() => {});
  }, [chats, ready]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chats, activeId, sending]);

  const partner = useMemo(
    () => partners.find((p) => p.id === activeId) || null,
    [partners, activeId],
  );
  const threadKey = activeId != null ? String(activeId) : "";
  const messages = threadKey ? chats[threadKey] || [] : [];

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!partner || !text.trim() || sending) return;

    const userText = text.trim();
    const now = new Date().toISOString();
    const you: ChatMessage = {
      id: `m_${Date.now()}`,
      partnerId: partner.id,
      who: "You",
      text: userText,
      at: now,
    };
    const replyId = `m_${Date.now() + 1}`;
    const placeholder: ChatMessage = {
      id: replyId,
      partnerId: partner.id,
      who: "Partner",
      text: "",
      at: new Date().toISOString(),
    };

    const prior = chats[String(partner.id)] || [];
    setChats((prev) => ({
      ...prev,
      [String(partner.id)]: [...(prev[String(partner.id)] || []), you, placeholder],
    }));
    setText("");
    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/art-of-x/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partner,
          messages: [...prior, you].map((m) => ({
            who: m.who,
            text: m.text,
          })),
          pov,
          stream: true,
        }),
      });

      const hdrModel = res.headers.get("X-XAI-Model");
      if (hdrModel) setModelLabel(hdrModel);

      if (!res.ok) {
        let message = "Chat request failed.";
        try {
          const data = (await res.json()) as {
            message?: string;
            error?: string;
            detail?: string;
          };
          message =
            data.message ||
            (data.error === "xai_not_configured"
              ? "Add XAI_API_KEY"
              : data.detail || data.error || message);
        } catch {
          // keep default
        }
        setError(message);
        setChats((prev) => ({
          ...prev,
          [String(partner.id)]: (prev[String(partner.id)] || []).filter(
            (m) => m.id !== replyId,
          ),
        }));
        return;
      }

      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("text/event-stream")) {
        await readXaiSseStream(res, (delta) => {
          setChats((prev) => {
            const list = [...(prev[String(partner.id)] || [])];
            const idx = list.findIndex((m) => m.id === replyId);
            if (idx < 0) return prev;
            list[idx] = {
              ...list[idx]!,
              text: (list[idx]!.text || "") + delta,
            };
            return { ...prev, [String(partner.id)]: list };
          });
        });
      } else {
        const data = (await res.json()) as { text?: string; model?: string };
        if (data.model) setModelLabel(data.model);
        const replyText = data.text?.trim() || "";
        if (!replyText) throw new Error("empty_reply");
        setChats((prev) => {
          const list = [...(prev[String(partner.id)] || [])];
          const idx = list.findIndex((m) => m.id === replyId);
          if (idx < 0) return prev;
          list[idx] = { ...list[idx]!, text: replyText };
          return { ...prev, [String(partner.id)]: list };
        });
      }

      setChats((prev) => {
        const list = prev[String(partner.id)] || [];
        const reply = list.find((m) => m.id === replyId);
        if (reply && !reply.text.trim()) {
          return {
            ...prev,
            [String(partner.id)]: list.filter((m) => m.id !== replyId),
          };
        }
        return prev;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chat failed");
      setChats((prev) => ({
        ...prev,
        [String(partner.id)]: (prev[String(partner.id)] || []).filter(
          (m) => m.id !== replyId,
        ),
      }));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-10 sm:px-10">
      <AppNav />
      <header className="mb-8">
        <h1
          className="text-4xl font-semibold tracking-tight text-[var(--ink)] sm:text-5xl"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          AI chat
        </h1>
        <p className="mt-2 max-w-xl text-sm font-light text-[#c4b7a8]">
          Chat with Muse cards via xAI Grok
          {modelLabel ? ` · ${modelLabel}` : ""}. Grounded in looks, kinks,
          dynamics, and history — witty, vivid, adults 18+ only.
        </p>
      </header>

      {partners.length === 0 ? (
        <p className="text-sm text-[#c4b7a8]">
          Add Muses first, then come back to chat with them.
        </p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <aside className="space-y-2">
            {partners.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setActiveId(p.id);
                  setError(null);
                }}
                className={`flex w-full items-center gap-3 border px-3 py-2 text-left text-sm ${
                  activeId === p.id
                    ? "border-[var(--accent)] bg-[var(--accent)]/10"
                    : "border-[var(--line)]"
                }`}
              >
                {mainPhoto(p) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={mainPhoto(p)!}
                    alt=""
                    className="h-10 w-10 object-cover"
                  />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center bg-[#1c1814] text-xs text-[#c4b7a8]">
                    {p.name.slice(0, 1)}
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block truncate text-[var(--ink)]">
                    {p.name}
                  </span>
                  <span className="block truncate text-xs text-[var(--muted)]">
                    {p.type} · {genderLabel(p.gender)}
                  </span>
                </span>
              </button>
            ))}
          </aside>

          <section className="flex min-h-[28rem] flex-col border border-[var(--line)] bg-[var(--bg-elevated)]/40">
            {partner && (
              <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--line)] p-4">
                <div>
                  <h2
                    className="text-xl text-[var(--ink)]"
                    style={{ fontFamily: "var(--font-display), serif" }}
                  >
                    {displayName(partner)}
                  </h2>
                  <p className="mt-1 text-xs text-[#c4b7a8]">
                    {normalizeKinks(partner.kinks)
                      .slice(0, 5)
                      .map((k) => k.tag)
                      .join(" · ") || "No kinks tagged"}
                    {partner.dynTags.length
                      ? ` · ${partner.dynTags.slice(0, 3).join(", ")}`
                      : ""}
                  </p>
                </div>
                <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
                  POV
                  <select
                    value={pov}
                    onChange={(e) => setPov(e.target.value as ChatPov)}
                    className="rounded-sm border border-[var(--line)] bg-[#1c1814] px-2 py-1 text-sm text-[var(--ink)]"
                  >
                    <option value="1st">1st person</option>
                    <option value="3rd">3rd person</option>
                  </select>
                </label>
              </div>
            )}

            {error && (
              <div className="border-b border-[var(--line)] bg-[#3a1814]/60 px-4 py-2 text-sm text-[#f0c4b8]">
                {error}
              </div>
            )}

            <div className="flex-1 space-y-3 overflow-auto p-4">
              {messages.length === 0 && (
                <p className="text-sm text-[#c4b7a8]">
                  Say something filthy. They already know your history.
                </p>
              )}
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[85%] rounded-sm px-3 py-2 text-sm leading-relaxed ${
                    m.who === "You"
                      ? "ml-auto bg-[var(--accent)]/20 text-[#f7f1e8]"
                      : "bg-[#1c1814] text-[#f7f1e8]"
                  }`}
                >
                  <p className="mb-1 text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                    {m.who}
                  </p>
                  <p className="whitespace-pre-wrap">
                    {m.text ||
                      (sending && m.who === "Partner" ? "…" : "")}
                  </p>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <form
              onSubmit={send}
              className="flex gap-2 border-t border-[var(--line)] p-3"
            >
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Message…"
                disabled={sending || !partner}
                className="prompt-field min-w-0 flex-1 rounded-sm border border-[var(--line)] bg-[#1c1814] px-3 py-2 text-sm disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={sending || !partner || !text.trim()}
                className="rounded-sm bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#1a120c] disabled:opacity-50"
              >
                {sending ? "…" : "Send"}
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
