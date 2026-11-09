"use client";

import Link from "next/link";
import {
  FormEvent,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { MusePresence } from "@/components/MusePresence";
import {
  displayName,
  emptyPartner,
  genderLabel,
  mainPhoto,
  PERSON_LABEL,
  savePartners,
  type ChatMessage,
  type PartnerRecord,
} from "@/lib/artOfX";
import {
  clearChatForPartner,
  fetchChats,
  fetchPartners,
  persistChats,
  persistPartners,
} from "@/lib/artOfXStore";
import {
  DEFAULT_MUSE_PRESENCE_STYLE,
  savePresenceStyle,
  type MusePresenceStyle,
} from "@/lib/musePresence";
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

function ChatPageInner() {
  const searchParams = useSearchParams();
  const museParam = searchParams.get("muse") || searchParams.get("partner");

  const [partners, setPartners] = useState<PartnerRecord[]>([]);
  const [chats, setChats] = useState<Record<string, ChatMessage[]>>({});
  const [activeId, setActiveId] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [ready, setReady] = useState(false);
  const [pov, setPov] = useState<ChatPov>("1st");
  const [sending, setSending] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelLabel, setModelLabel] = useState<string | null>(null);
  const [presenceStyle, setPresenceStyle] = useState<MusePresenceStyle>(
    DEFAULT_MUSE_PRESENCE_STYLE,
  );
  const [chatOpen, setChatOpen] = useState(true);
  const [reactionReply, setReactionReply] = useState<{
    id: string;
    text: string;
  } | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const skipPersist = useRef(false);
  const pickedFromUrl = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [list, map] = await Promise.all([fetchPartners(), fetchChats()]);
      if (cancelled) return;
      setPartners(list);
      setChats(map);
      const fromUrl = museParam ? Number(museParam) : NaN;
      if (Number.isFinite(fromUrl) && list.some((p) => p.id === fromUrl)) {
        setActiveId(fromUrl);
        pickedFromUrl.current = true;
      } else if (list[0]) {
        setActiveId(list[0].id);
      }
      setReady(true);
    })().catch(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [museParam]);

  useEffect(() => {
    if (!ready || pickedFromUrl.current || !museParam) return;
    const id = Number(museParam);
    if (!Number.isFinite(id)) return;
    if (partners.some((p) => p.id === id)) {
      setActiveId(id);
      pickedFromUrl.current = true;
    }
  }, [ready, museParam, partners]);

  useEffect(() => {
    if (!ready) return;
    if (skipPersist.current) {
      skipPersist.current = false;
      return;
    }
    void persistChats(chats).catch(() => {});
  }, [chats, ready]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chats, activeId, sending]);

  const partner = useMemo(
    () => partners.find((p) => p.id === activeId) || null,
    [partners, activeId],
  );
  const companionFull = Boolean(partner) && presenceStyle === "cartoon";
  const threadKey = activeId != null ? String(activeId) : "";
  const messages = threadKey ? chats[threadKey] || [] : [];

  async function startCompanion() {
    const scratch = {
      ...emptyPartner("Companion", partners),
      looks: "Ani / JuicyChat-class anime companion",
    };
    const next = [...partners, scratch];
    // Local first so Generate works even if cloud persist fails.
    savePartners(next);
    setPartners(next);
    setActiveId(scratch.id);
    setPresenceStyle(DEFAULT_MUSE_PRESENCE_STYLE);
    savePresenceStyle(scratch.id, DEFAULT_MUSE_PRESENCE_STYLE);
    setError(null);
    setChatOpen(true);
    try {
      await persistPartners(next);
    } catch {
      // Keep local scratch Companion — user can still Generate.
    }
  }

  async function resetChat() {
    if (!partner || resetting) return;
    const name = displayName(partner);
    const ok =
      typeof window !== "undefined" &&
      window.confirm(
        `Reset chat with ${name}? This clears the whole conversation — can’t undo.`,
      );
    if (!ok) return;

    setResetting(true);
    setError(null);
    try {
      skipPersist.current = true;
      const next = await clearChatForPartner(chats, partner.id);
      setChats(next);
    } catch (err) {
      skipPersist.current = false;
      setError(err instanceof Error ? err.message : "Couldn’t reset chat");
    } finally {
      setResetting(false);
    }
  }

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
      [String(partner.id)]: [
        ...(prev[String(partner.id)] || []),
        you,
        placeholder,
      ],
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
      let finalReply = "";
      if (contentType.includes("text/event-stream")) {
        finalReply = await readXaiSseStream(res, (delta) => {
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
        finalReply = replyText;
        setChats((prev) => {
          const list = [...(prev[String(partner.id)] || [])];
          const idx = list.findIndex((m) => m.id === replyId);
          if (idx < 0) return prev;
          list[idx] = { ...list[idx]!, text: replyText };
          return { ...prev, [String(partner.id)]: list };
        });
      }

      const trimmed = finalReply.trim();
      if (!trimmed) {
        setChats((prev) => ({
          ...prev,
          [String(partner.id)]: (prev[String(partner.id)] || []).filter(
            (m) => m.id !== replyId,
          ),
        }));
      } else {
        setReactionReply({ id: replyId, text: trimmed });
      }
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
    <div
      className={
        companionFull
          ? "muse-chat-page muse-chat-page--companion-full flex min-h-[100dvh] flex-col"
          : "mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-7 sm:px-8 sm:py-10"
      }
    >
      {!companionFull && <AppNav />}
      {!companionFull && (
        <header className="mb-6">
          <p className="mb-2 text-[10px] uppercase tracking-[0.28em] text-[var(--muted)]">
            {PERSON_LABEL.plural} · Grok
          </p>
          <h1
            className="text-4xl font-semibold tracking-tight text-[var(--ink)] sm:text-5xl"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Muse chat
          </h1>
          <p className="mt-2 max-w-xl text-sm font-light text-[#c4b7a8]">
            Her living portrait sits with you while you talk
            {modelLabel ? ` · ${modelLabel}` : ""}. Adults 18+ only.
          </p>
        </header>
      )}

      {partners.length === 0 ? (
        <div className="border border-[var(--line)] bg-[var(--bg-elevated)]/35 p-8 sm:p-10">
          <p
            className="text-2xl text-[var(--ink)]"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Start your Companion
          </p>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-[#c4b7a8]">
            Design an Ani-style anime companion from traits — no photo required.
            Likeness lock is optional later.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void startCompanion()}
              className="inline-flex rounded-sm bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--on-accent)]"
            >
              Start Companion
            </button>
            <Link
              href="/art-of-x/partners"
              className="inline-flex rounded-sm border border-[var(--line)] px-4 py-2 text-sm font-medium text-[var(--ink)]"
            >
              Open {PERSON_LABEL.plural}
            </Link>
          </div>
        </div>
      ) : (
        <div
          className={
            companionFull
              ? "relative flex min-h-0 flex-1 flex-col"
              : "flex flex-col gap-4"
          }
        >
          {!companionFull && (
            <aside
              className="flex gap-2 overflow-x-auto pb-1"
              aria-label={`${PERSON_LABEL.singular} picker`}
            >
              {partners.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setActiveId(p.id);
                    setError(null);
                  }}
                  className={`flex min-w-[9.25rem] shrink-0 items-center gap-2.5 border px-2.5 py-2 text-left text-sm backdrop-blur-sm ${
                    activeId === p.id
                      ? "border-[var(--glow)]/50 bg-[var(--glow)]/10"
                      : "border-[var(--line)] bg-[#080b14]/55"
                  }`}
                >
                  {mainPhoto(p) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={mainPhoto(p)!}
                      alt=""
                      className="h-9 w-9 object-cover"
                    />
                  ) : (
                    <span className="flex h-9 w-9 items-center justify-center bg-[#12182a] text-xs text-[#c4b7a8]">
                      {p.name.slice(0, 1)}
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-[var(--ink)]">
                      {p.name}
                    </span>
                    <span className="block truncate text-[10px] text-[var(--muted)]">
                      {p.type} · {genderLabel(p.gender)}
                    </span>
                  </span>
                </button>
              ))}
            </aside>
          )}

          <section
            className={
              companionFull
                ? "muse-chat-stage muse-chat-stage--companion-full relative flex min-h-[100dvh] flex-1 overflow-hidden"
                : "muse-chat-stage grid overflow-hidden border border-[var(--line)] bg-[var(--bg-elevated)]/40 lg:grid-cols-[minmax(300px,38%)_minmax(0,1fr)]"
            }
          >
            {partner ? (
              <div
                className={
                  companionFull
                    ? "muse-chat-presence muse-chat-presence--full absolute inset-0 z-0"
                    : "muse-chat-presence border-b border-[var(--line)] p-3 sm:p-4 lg:sticky lg:top-0 lg:self-start lg:border-b-0 lg:border-r"
                }
              >
                <MusePresence
                  partner={partner}
                  variant={companionFull ? "full" : "rail"}
                  onStyleChange={setPresenceStyle}
                  lastPartnerReply={reactionReply}
                  chatCollapsed={companionFull && !chatOpen}
                  museOptions={companionFull ? partners : undefined}
                  onSelectMuse={
                    companionFull
                      ? (id) => {
                          setActiveId(id);
                          setError(null);
                        }
                      : undefined
                  }
                  chatOpen={companionFull ? chatOpen : undefined}
                  onToggleChat={
                    companionFull ? () => setChatOpen((v) => !v) : undefined
                  }
                />
              </div>
            ) : (
              <div className="flex min-h-64 items-center justify-center border-b border-[var(--line)] p-6 text-sm text-[var(--muted)] lg:border-b-0 lg:border-r">
                Select a {PERSON_LABEL.singularLower}
              </div>
            )}

            <div
              className={
                companionFull
                  ? `muse-chat-drawer z-20 flex flex-col ${
                      chatOpen
                        ? "muse-chat-drawer--open"
                        : "muse-chat-drawer--closed"
                    }`
                  : "flex min-h-[22rem] flex-col border border-[var(--line)] bg-[var(--bg-elevated)] lg:min-h-[36rem]"
              }
            >
              {partner && (
                <div className="muse-chat-drawer-header flex flex-wrap items-end justify-between gap-3 border-b border-[var(--line)]">
                  <div className="min-w-0">
                    <h2
                      className="text-xl text-[var(--ink)]"
                      style={{ fontFamily: "var(--font-display), serif" }}
                    >
                      {displayName(partner)}
                    </h2>
                    <p className="mt-1 text-xs text-[#c4b7a8]">
                      {companionFull
                        ? "Companion · Adults 18+"
                        : partner.dynTags.slice(0, 3).join(" · ") ||
                          "No dynamics tagged"}
                      {modelLabel ? ` · ${modelLabel}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
                      POV
                      <select
                        value={pov}
                        onChange={(e) => setPov(e.target.value as ChatPov)}
                        className="rounded-sm border border-[var(--line)] bg-[#12182a] px-2 py-1 text-sm text-[var(--ink)]"
                      >
                        <option value="1st">1st person</option>
                        <option value="3rd">3rd person</option>
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={() => void resetChat()}
                      disabled={resetting || messages.length === 0}
                      className="rounded-sm border border-[var(--danger)]/40 px-3 py-1.5 text-xs font-medium text-[#f0c4b8] transition hover:border-[var(--danger)]/70 hover:bg-[var(--danger)]/10 disabled:cursor-not-allowed disabled:opacity-40"
                      title="Clear this Muse’s conversation"
                    >
                      {resetting ? "Resetting…" : "Reset chat"}
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className="border-b border-[var(--line)] bg-[#3a1814] px-4 py-2.5 text-sm text-[#f0c4b8] sm:px-5">
                  {error}
                </div>
              )}

              <div
                className={`muse-chat-drawer-messages flex-1 overflow-auto ${
                  messages.length === 0
                    ? "muse-chat-drawer-messages--empty flex flex-col justify-center"
                    : "space-y-3"
                }`}
              >
                {messages.length === 0 && (
                  <p className="muse-chat-empty text-sm leading-relaxed text-[#e8dcd0]">
                    Say something filthy. Her portrait stays with you.
                  </p>
                )}
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`max-w-[85%] rounded-sm px-3 py-2 text-sm leading-relaxed ${
                      m.who === "You"
                        ? "ml-auto bg-[var(--accent)]/20 text-[#f7f1e8]"
                        : "bg-[#12182a] text-[#f7f1e8]"
                    }`}
                  >
                    <p className="mb-1 text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                      {m.who === "Partner" && partner
                        ? displayName(partner)
                        : m.who}
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
                className="muse-chat-drawer-composer flex gap-2 border-t border-[var(--line)]"
              >
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Message…"
                  disabled={sending || !partner}
                  className="prompt-field min-w-0 flex-1 rounded-sm border border-[var(--line)] bg-[#12182a] px-3 py-2.5 text-sm disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={sending || !partner || !text.trim()}
                  className="rounded-sm bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--on-accent)] disabled:opacity-50"
                >
                  {sending ? "…" : "Send"}
                </button>
              </form>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-7 sm:px-8 sm:py-10">
          <AppNav />
          <p className="mt-8 text-sm text-[var(--muted)]">Opening Muse chat…</p>
        </div>
      }
    >
      <ChatPageInner />
    </Suspense>
  );
}
