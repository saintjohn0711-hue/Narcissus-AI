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
  musePairThreadKey,
  pairedMusesFor,
  PERSON_LABEL,
  savePartners,
  samePartnerId,
  withMainPhoto,
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
  detectTryNewThingsConsent,
  extractExplicitRemember,
  heuristicExtractMemories,
  memoriesForPrompt,
  mergeMemories,
  normalizeMemories,
  type MuseMemory,
  type MuseMemoryKind,
} from "@/lib/museChatMemory";
import {
  DEFAULT_MUSE_PRESENCE_STYLE,
  loadPresenceStyle,
  savePresenceStyle,
  type MusePresenceStyle,
} from "@/lib/musePresence";
import type { ChatPov } from "@/lib/xai";

/** Chat prompt only needs text fields — strip heavy data-URLs. */
function partnerForChatApi(p: PartnerRecord): PartnerRecord {
  return { ...p, photos: [] };
}

const MEMORY_KIND_LABEL: Record<MuseMemoryKind, string> = {
  fact: "Fact",
  relationship: "Relationship",
  kink: "Kink",
  place: "Place",
  nickname: "Nickname",
  scene: "Scene",
  preference: "Preference",
  mode: "Mode",
};

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
  const withParam = searchParams.get("with");

  const [partners, setPartners] = useState<PartnerRecord[]>([]);
  const [chats, setChats] = useState<Record<string, ChatMessage[]>>({});
  const [activeId, setActiveId] = useState<number | null>(null);
  const [castId, setCastId] = useState<number | null>(null);
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
  const [memoriesOpen, setMemoriesOpen] = useState(false);
  const [memoryDraft, setMemoryDraft] = useState("");
  const [memoryKind, setMemoryKind] = useState<MuseMemoryKind>("relationship");
  const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null);
  const [reactionReply, setReactionReply] = useState<{
    id: string;
    text: string;
  } | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const partnersRef = useRef<PartnerRecord[]>([]);
  const skipPersist = useRef(false);
  const streamingChats = useRef(false);
  const chatsRef = useRef<Record<string, ChatMessage[]>>({});
  const pickedFromUrl = useRef(false);
  const castFromUrl = useRef(false);
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
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
        const withId = withParam ? Number(withParam) : NaN;
        if (
          Number.isFinite(withId) &&
          Number.isFinite(fromUrl) &&
          list.some((p) => p.id === withId) &&
          withId !== fromUrl
        ) {
          setCastId(withId);
          castFromUrl.current = true;
        }
      } catch {
        if (!cancelled) {
          setError("Couldn’t load Muses or chats — refresh and try again.");
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [museParam, withParam]);

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
    if (!ready || castFromUrl.current || !withParam) return;
    const id = Number(withParam);
    if (!Number.isFinite(id) || !activeId || samePartnerId(id, activeId)) return;
    if (partners.some((p) => p.id === id)) {
      setCastId(id);
      castFromUrl.current = true;
    }
  }, [ready, withParam, partners, activeId]);

  useEffect(() => {
    if (!ready || !activeId) return;
    setPresenceStyle(loadPresenceStyle(activeId));
  }, [ready, activeId]);

  useEffect(() => {
    chatsRef.current = chats;
  }, [chats]);

  useEffect(() => {
    partnersRef.current = partners;
  }, [partners]);

  useEffect(() => {
    if (!ready) return;
    if (skipPersist.current) {
      skipPersist.current = false;
      return;
    }
    if (streamingChats.current) return;
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      void persistChats(chatsRef.current).catch(() => {});
    }, 600);
    return () => {
      if (persistTimer.current) clearTimeout(persistTimer.current);
    };
  }, [chats, ready]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chats, activeId, sending]);

  const partner = useMemo(
    () => partners.find((p) => p.id === activeId) || null,
    [partners, activeId],
  );
  const castPartner = useMemo(() => {
    if (!partner || castId == null) return null;
    if (samePartnerId(castId, partner.id)) return null;
    return partners.find((p) => samePartnerId(p.id, castId)) || null;
  }, [partners, partner, castId]);
  const pairedOptions = useMemo(
    () => (partner ? pairedMusesFor(partner, partners) : []),
    [partner, partners],
  );
  const companionFull = Boolean(partner) && presenceStyle === "cartoon";
  const threadKey =
    activeId != null
      ? castPartner
        ? musePairThreadKey(activeId, castPartner.id)
        : String(activeId)
      : "";
  const messages = threadKey ? chats[threadKey] || [] : [];
  const castLabel =
    partner && castPartner
      ? `${displayName(partner)} + ${displayName(castPartner)}`
      : partner
        ? displayName(partner)
        : "";
  const visibleMemories = useMemo(() => {
    if (!partner) return [] as MuseMemory[];
    return memoriesForPrompt(partner.memories || [], {
      pairWith: castPartner?.id ?? null,
    });
  }, [partner, castPartner]);
  const tryNewActive = Boolean(
    partner?.tryNewThings || castPartner?.tryNewThings,
  );

  async function persistPartnerPatch(
    patch: (p: PartnerRecord) => PartnerRecord,
  ) {
    const list = partnersRef.current;
    if (!partner) return;
    const next = list.map((p) => {
      if (samePartnerId(p.id, partner.id)) return patch(p);
      if (castPartner && samePartnerId(p.id, castPartner.id)) {
        // Keep dual-cast tryNewThings in sync when toggling from chat.
        const primaryNext = patch(partner);
        if (
          typeof primaryNext.tryNewThings === "boolean" &&
          primaryNext.tryNewThings !== Boolean(p.tryNewThings) &&
          primaryNext.memories === partner.memories
        ) {
          return {
            ...p,
            tryNewThings: primaryNext.tryNewThings,
            updatedAt: new Date().toISOString(),
          };
        }
      }
      return p;
    });
    setPartners(next);
    partnersRef.current = next;
    try {
      try {
        savePartners(next);
      } catch {
        // local quota
      }
      const saved = await persistPartners(next);
      setPartners(saved);
      partnersRef.current = saved;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Saved on this device — cloud sync failed.",
      );
    }
  }

  async function setTryNewThings(enabled: boolean) {
    if (!partner) return;
    const now = new Date().toISOString();
    const list = partnersRef.current.map((p) => {
      if (samePartnerId(p.id, partner.id)) {
        return { ...p, tryNewThings: enabled, updatedAt: now };
      }
      if (castPartner && samePartnerId(p.id, castPartner.id)) {
        return { ...p, tryNewThings: enabled, updatedAt: now };
      }
      return p;
    });
    setPartners(list);
    partnersRef.current = list;
    try {
      try {
        savePartners(list);
      } catch {
        // ignore
      }
      const saved = await persistPartners(list);
      setPartners(saved);
      partnersRef.current = saved;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Couldn’t save try-new permission.",
      );
    }
  }

  async function addMemoriesToPartner(
    incoming: MuseMemory[],
    targetId?: number,
  ) {
    if (!incoming.length) return;
    const id = targetId ?? partner?.id;
    if (id == null) return;
    const now = new Date().toISOString();
    const list = partnersRef.current.map((p) => {
      if (!samePartnerId(p.id, id)) return p;
      return {
        ...p,
        memories: mergeMemories(normalizeMemories(p.memories), incoming),
        updatedAt: now,
      };
    });
    setPartners(list);
    partnersRef.current = list;
    try {
      try {
        savePartners(list);
      } catch {
        // ignore
      }
      const saved = await persistPartners(list);
      setPartners(saved);
      partnersRef.current = saved;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn’t save memory.",
      );
    }
  }

  async function forgetMemory(memoryId: string) {
    if (!partner) return;
    await persistPartnerPatch((p) => ({
      ...p,
      memories: normalizeMemories(p.memories).filter((m) => m.id !== memoryId),
      updatedAt: new Date().toISOString(),
    }));
  }

  async function saveManualMemory() {
    const text = memoryDraft.trim();
    if (!text || !partner) return;
    if (editingMemoryId) {
      await persistPartnerPatch((p) => ({
        ...p,
        memories: normalizeMemories(p.memories).map((m) =>
          m.id === editingMemoryId
            ? {
                ...m,
                text,
                kind: memoryKind,
                source: "explicit" as const,
                at: new Date().toISOString(),
                pairWith: castPartner?.id ?? m.pairWith ?? null,
              }
            : m,
        ),
        updatedAt: new Date().toISOString(),
      }));
      setEditingMemoryId(null);
      setMemoryDraft("");
      setMemoryKind("relationship");
      return;
    }
    const mem: MuseMemory = {
      id: `mem_${Date.now()}`,
      text,
      kind: memoryKind,
      at: new Date().toISOString(),
      source: "explicit",
      pairWith: castPartner?.id ?? null,
    };
    setMemoryDraft("");
    setMemoryKind("relationship");
    await addMemoriesToPartner([mem]);
  }

  function beginEditMemory(m: MuseMemory) {
    setEditingMemoryId(m.id);
    setMemoryDraft(m.text);
    setMemoryKind(m.kind);
    setMemoriesOpen(true);
  }

  function cancelEditMemory() {
    setEditingMemoryId(null);
    setMemoryDraft("");
    setMemoryKind("relationship");
  }

  async function harvestMemoriesAfterTurn(
    userText: string,
    museReply: string,
  ) {
    if (!partner) return;
    const pairWith = castPartner?.id ?? null;

    const consent = detectTryNewThingsConsent(userText);
    if (consent != null) {
      await setTryNewThings(consent);
    }

    const explicit = extractExplicitRemember(userText);
    let extracted: MuseMemory[] = heuristicExtractMemories(
      userText,
      museReply,
      { pairWith },
    );
    if (explicit) {
      extracted = mergeMemories(extracted, [
        {
          id: `mem_explicit_${Date.now()}`,
          text: explicit,
          kind: /boyfriend|girlfriend|husband|wife|partner|fiancé/i.test(
            explicit,
          )
            ? "relationship"
            : /bisexual|\bbi\b/i.test(explicit)
              ? "preference"
              : "fact",
          at: new Date().toISOString(),
          source: "explicit",
          pairWith,
        },
      ]);
    }

    try {
      const res = await fetch("/api/art-of-x/chat-memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userText, museReply, pairWith }),
      });
      if (res.ok) {
        const data = (await res.json()) as { memories?: MuseMemory[] };
        if (Array.isArray(data.memories) && data.memories.length) {
          extracted = mergeMemories(extracted, normalizeMemories(data.memories));
        }
      }
    } catch {
      // heuristic already applied
    }

    if (extracted.length) {
      await addMemoriesToPartner(extracted);
    }
  }

  async function startCompanion() {
    const scratch = {
      ...emptyPartner("Companion", partners),
      looks: "Ani / JuicyChat-class anime companion",
    };
    const next = [...partners, scratch];
    setError(null);
    setChatOpen(true);
    try {
      // Local first so Generate works even if cloud persist fails.
      try {
        savePartners(next);
      } catch {
        // Quota — still attempt cloud + in-memory Companion.
      }
      setPartners(next);
      setActiveId(scratch.id);
      setPresenceStyle(DEFAULT_MUSE_PRESENCE_STYLE);
      savePresenceStyle(scratch.id, DEFAULT_MUSE_PRESENCE_STYLE);
      await persistPartners(next);
    } catch (err) {
      // Keep in-memory scratch so Generate still works this session.
      setPartners(next);
      setActiveId(scratch.id);
      setPresenceStyle(DEFAULT_MUSE_PRESENCE_STYLE);
      savePresenceStyle(scratch.id, DEFAULT_MUSE_PRESENCE_STYLE);
      setError(
        err instanceof Error
          ? `Companion started locally — cloud save failed (${err.message}).`
          : "Companion started locally — cloud save failed.",
      );
    }
  }

  async function updatePartnerPhotos(photos: string[], mainPhotoIndex: number) {
    if (!partner) return;
    const updated = withMainPhoto({ ...partner, photos }, mainPhotoIndex);
    const next = partners.map((p) => (p.id === partner.id ? updated : p));
    setPartners(next);
    try {
      try {
        savePartners(next);
      } catch {
        // ignore local quota
      }
      await persistPartners(next);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Photo saved on this device — cloud sync failed.",
      );
    }
  }

  async function resetChat() {
    if (!partner || resetting || !threadKey) return;
    const name = castLabel || displayName(partner);
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
      if (castPartner) {
        const next = { ...chats };
        delete next[threadKey];
        await persistChats(next);
        setChats(next);
      } else {
        const next = await clearChatForPartner(chats, partner.id);
        setChats(next);
      }
    } catch (err) {
      skipPersist.current = false;
      setError(err instanceof Error ? err.message : "Couldn’t reset chat");
    } finally {
      setResetting(false);
    }
  }

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!partner || !text.trim() || sending || !threadKey) return;

    const userText = text.trim();
    const now = new Date().toISOString();
    const key = threadKey;
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

    const prior = chats[key] || [];
    setChats((prev) => ({
      ...prev,
      [key]: [...(prev[key] || []), you, placeholder],
    }));
    setText("");
    setSending(true);
    setError(null);
    streamingChats.current = true;

    try {
      const res = await fetch("/api/art-of-x/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partner: partnerForChatApi(partner),
          cast: castPartner ? partnerForChatApi(castPartner) : null,
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
          [key]: (prev[key] || []).filter((m) => m.id !== replyId),
        }));
        return;
      }

      const contentType = res.headers.get("content-type") || "";
      let finalReply = "";
      if (contentType.includes("text/event-stream")) {
        finalReply = await readXaiSseStream(res, (delta) => {
          setChats((prev) => {
            const list = [...(prev[key] || [])];
            const idx = list.findIndex((m) => m.id === replyId);
            if (idx < 0) return prev;
            list[idx] = {
              ...list[idx]!,
              text: (list[idx]!.text || "") + delta,
            };
            return { ...prev, [key]: list };
          });
        });
      } else {
        const data = (await res.json()) as { text?: string; model?: string };
        if (data.model) setModelLabel(data.model);
        const replyText = data.text?.trim() || "";
        if (!replyText) throw new Error("empty_reply");
        finalReply = replyText;
        setChats((prev) => {
          const list = [...(prev[key] || [])];
          const idx = list.findIndex((m) => m.id === replyId);
          if (idx < 0) return prev;
          list[idx] = { ...list[idx]!, text: replyText };
          return { ...prev, [key]: list };
        });
      }

      const trimmed = finalReply.trim();
      if (!trimmed) {
        setError("Muse returned an empty reply — try again.");
        setChats((prev) => ({
          ...prev,
          [key]: (prev[key] || []).filter((m) => m.id !== replyId),
        }));
      } else {
        // Ensure ref has final text before finally-persist (React state may lag).
        const list = [...(chatsRef.current[key] || [])];
        const idx = list.findIndex((m) => m.id === replyId);
        if (idx >= 0) {
          list[idx] = { ...list[idx]!, text: trimmed };
          chatsRef.current = { ...chatsRef.current, [key]: list };
        }
        setReactionReply({ id: replyId, text: trimmed });
        void harvestMemoriesAfterTurn(userText, trimmed);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chat failed");
      setChats((prev) => ({
        ...prev,
        [key]: (prev[key] || []).filter((m) => m.id !== replyId),
      }));
    } finally {
      streamingChats.current = false;
      setSending(false);
      // One persist after stream (mid-token writes were skipped).
      void persistChats(chatsRef.current).catch(() => {});
    }
  }

  return (
    <div
      className={
        companionFull
          ? "muse-chat-page muse-chat-page--companion-full relative flex min-h-[100dvh] flex-col"
          : "mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-7 sm:px-8 sm:py-10"
      }
    >
      {companionFull ? (
        <AppNav variant="companion" />
      ) : (
        <AppNav />
      )}
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
                    setCastId((cur) => {
                      if (cur == null) return null;
                      const stillPaired = pairedMusesFor(p, partners).some(
                        (x) => samePartnerId(x.id, cur),
                      );
                      return stillPaired ? cur : null;
                    });
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
                  castPartner={castPartner}
                  variant={companionFull ? "full" : "rail"}
                  onStyleChange={setPresenceStyle}
                  lastPartnerReply={reactionReply}
                  chatCollapsed={companionFull && !chatOpen}
                  museOptions={companionFull ? partners : undefined}
                  onSelectMuse={
                    companionFull
                      ? (id) => {
                          setActiveId(id);
                          setCastId((cur) => {
                            const next = partners.find((p) =>
                              samePartnerId(p.id, id),
                            );
                            if (!next || cur == null) return null;
                            const stillPaired = pairedMusesFor(
                              next,
                              partners,
                            ).some((p) => samePartnerId(p.id, cur));
                            return stillPaired ? cur : null;
                          });
                          setError(null);
                        }
                      : undefined
                  }
                  chatOpen={companionFull ? chatOpen : undefined}
                  onToggleChat={
                    companionFull ? () => setChatOpen((v) => !v) : undefined
                  }
                  onPartnerPhotosChange={updatePartnerPhotos}
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
                      {castLabel}
                    </h2>
                    <p className="mt-1 text-xs text-[#c4b7a8]">
                      {castPartner
                        ? "Dual cast · been together"
                        : companionFull
                          ? "Companion · Adults 18+"
                          : partner.dynTags.slice(0, 3).join(" · ") ||
                            "No dynamics tagged"}
                      {modelLabel ? ` · ${modelLabel}` : ""}
                    </p>
                    {(pairedOptions.length > 0 || castPartner) && (
                      <label className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
                        With
                        <select
                          value={castPartner ? String(castPartner.id) : ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            setCastId(v ? Number(v) : null);
                            setError(null);
                          }}
                          className="max-w-[12rem] rounded-sm border border-[var(--line)] bg-[#12182a] px-2 py-1 text-sm text-[var(--ink)]"
                        >
                          <option value="">Solo</option>
                          {pairedOptions.map((p) => (
                            <option key={p.id} value={p.id}>
                              {displayName(p)}
                            </option>
                          ))}
                          {castPartner &&
                            !pairedOptions.some((p) =>
                              samePartnerId(p.id, castPartner.id),
                            ) && (
                              <option value={castPartner.id}>
                                {displayName(castPartner)}
                              </option>
                            )}
                        </select>
                      </label>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {companionFull && (
                      <>
                        <Link
                          href="/art-of-x"
                          className="rounded-sm border border-[var(--line)] px-3 py-1.5 text-xs font-medium text-[var(--soft)] transition hover:border-[var(--accent)]/45 hover:text-[var(--ink)]"
                        >
                          Art of X
                        </Link>
                        <button
                          type="button"
                          onClick={() => setChatOpen(false)}
                          className="rounded-sm border border-[var(--line)] px-3 py-1.5 text-xs font-medium text-[var(--soft)] transition hover:border-[var(--accent)]/45 hover:text-[var(--ink)] md:hidden"
                        >
                          Hide
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => setMemoriesOpen((v) => !v)}
                      className={`rounded-sm border px-3 py-1.5 text-xs font-medium transition ${
                        memoriesOpen
                          ? "border-[var(--accent)]/55 bg-[var(--accent)]/10 text-[var(--ink)]"
                          : "border-[var(--line)] text-[var(--soft)] hover:border-[var(--accent)]/45 hover:text-[var(--ink)]"
                      }`}
                      title="What she remembers — add lasting facts for chat"
                    >
                      Memories
                      {visibleMemories.length
                        ? ` (${visibleMemories.length})`
                        : ""}
                    </button>
                    <button
                      type="button"
                      onClick={() => void setTryNewThings(!tryNewActive)}
                      className={`rounded-sm border px-3 py-1.5 text-xs font-medium transition ${
                        tryNewActive
                          ? "border-[var(--accent)]/55 bg-[var(--accent)]/10 text-[var(--ink)]"
                          : "border-[var(--line)] text-[var(--soft)] hover:border-[var(--accent)]/45 hover:text-[var(--ink)]"
                      }`}
                      title={
                        tryNewActive
                          ? "Allowed to try new things / shift mode"
                          : "Stay in established vibe — tap to grant try-new"
                      }
                    >
                      {tryNewActive ? "Try new · on" : "Try new things"}
                    </button>
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
                      title="Clear this Muse’s conversation (memories stay)"
                    >
                      {resetting ? "Resetting…" : "Reset chat"}
                    </button>
                  </div>
                </div>
              )}

              {partner && memoriesOpen && (
                <div
                  className="muse-memories-panel border-b border-[var(--line)] bg-[#0a0e18]/90 px-4 py-3 sm:px-5"
                  data-testid="muse-memories-panel"
                >
                  <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                    <p
                      className="text-sm text-[var(--ink)]"
                      style={{ fontFamily: "var(--font-display), serif" }}
                    >
                      What {displayName(partner)} remembers
                    </p>
                    <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                      Survives reset · loads into chat
                    </p>
                  </div>
                  <p className="mb-3 text-xs leading-relaxed text-[#c4b7a8]">
                    Add lasting facts for realism — e.g. “Joey is Carrie’s
                    boyfriend”, “she wants Joey bisexual”. Also auto-saves from
                    chat or “remember …”.
                  </p>
                  <form
                    className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void saveManualMemory();
                    }}
                  >
                    <label className="min-w-0 flex-1 text-xs text-[var(--muted)]">
                      Memory
                      <input
                        value={memoryDraft}
                        onChange={(e) => setMemoryDraft(e.target.value)}
                        placeholder="Joey is her boyfriend"
                        className="mt-1 w-full rounded-sm border border-[var(--line)] bg-[#12182a] px-3 py-2 text-sm text-[var(--ink)]"
                        data-testid="muse-memory-input"
                      />
                    </label>
                    <label className="text-xs text-[var(--muted)] sm:w-36">
                      Kind
                      <select
                        value={memoryKind}
                        onChange={(e) =>
                          setMemoryKind(e.target.value as MuseMemoryKind)
                        }
                        className="mt-1 w-full rounded-sm border border-[var(--line)] bg-[#12182a] px-2 py-2 text-sm text-[var(--ink)]"
                      >
                        {(
                          Object.keys(MEMORY_KIND_LABEL) as MuseMemoryKind[]
                        ).map((k) => (
                          <option key={k} value={k}>
                            {MEMORY_KIND_LABEL[k]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="flex gap-2">
                      {editingMemoryId && (
                        <button
                          type="button"
                          onClick={cancelEditMemory}
                          className="rounded-sm border border-[var(--line)] px-3 py-2 text-xs font-medium text-[var(--soft)]"
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={!memoryDraft.trim()}
                        className="rounded-sm bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-[var(--on-accent)] disabled:opacity-50"
                        data-testid="muse-memory-save"
                      >
                        {editingMemoryId ? "Update" : "Add memory"}
                      </button>
                    </div>
                  </form>
                  {visibleMemories.length === 0 ? (
                    <p className="text-xs text-[var(--muted)]">
                      Nothing saved yet — add one above.
                    </p>
                  ) : (
                    <ul className="max-h-40 space-y-2 overflow-y-auto">
                      {visibleMemories.map((m) => (
                        <li
                          key={m.id}
                          className="flex items-start justify-between gap-3 border border-[var(--line)]/70 bg-[#12182a]/55 px-2.5 py-2"
                        >
                          <div className="min-w-0">
                            <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--accent)]">
                              {MEMORY_KIND_LABEL[m.kind] || m.kind}
                              {m.source === "explicit" ? " · saved" : " · auto"}
                            </p>
                            <p className="mt-0.5 text-sm leading-snug text-[#f7f1e8]">
                              {m.text}
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-1.5">
                            <button
                              type="button"
                              onClick={() => beginEditMemory(m)}
                              className="rounded-sm border border-[var(--line)] px-2 py-1 text-[10px] font-medium text-[var(--soft)] hover:text-[var(--ink)]"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => void forgetMemory(m.id)}
                              className="rounded-sm border border-[var(--danger)]/35 px-2 py-1 text-[10px] font-medium text-[#f0c4b8] hover:bg-[var(--danger)]/10"
                            >
                              Forget
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
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
                    {castPartner
                      ? `Say something filthy — ${displayName(partner!)} and ${displayName(castPartner)} are both in the scene.`
                      : "Say something filthy. Her portrait stays with you."}
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
                        ? castPartner
                          ? castLabel
                          : displayName(partner)
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
