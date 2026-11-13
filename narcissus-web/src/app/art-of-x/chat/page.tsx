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
import { MuseChatNarrate } from "@/components/MuseChatNarrate";
import { MusePresence } from "@/components/MusePresence";
import {
  MuseVoicePreviewBar,
  useMuseVoicePreview,
} from "@/components/MuseVoicePreview";
import {
  displayName,
  emptyPartner,
  ensureMuseGroupPairings,
  formatCastWithParam,
  genderLabel,
  mainPhoto,
  MAX_MUSE_CAST_MATES,
  museCastThreadKey,
  normalizeCastMateIds,
  pairedMusesFor,
  parseCastWithParam,
  PERSON_LABEL,
  savePartners,
  samePartnerId,
  withMainPhoto,
  type ChatMessage,
  type PartnerRecord,
} from "@/lib/artOfX";
import {
  accentFromVoiceId,
  accentLabel,
  DEFAULT_CHAT_VOICE_PREFS,
  encodeAccentVoiceId,
  loadChatVoicePrefs,
  MUSE_VOICE_ACCENTS,
  presetsForGender,
  saveChatVoicePrefs,
  narrationSupported,
  naturalTtsAvailable,
  speakMessage,
  stopNarration,
  voiceSettingsFromPartner,
  warmSpeechVoices,
  type ChatVoicePrefs,
  type MuseVoiceAccentId,
  type MuseVoiceGender,
  type MuseVoicePresetId,
} from "@/lib/museVoice";
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
  MEMORY_KIND_LABEL,
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
import {
  SEX_RIBBON_CATALOG,
  autoAwardFromContext,
  awardRibbon,
  globalRibbonCollection,
  hasRibbon,
  isTaskComplete,
  normalizeSexRibbons,
  ribbonDef,
  tierLabel,
  type SexRibbonId,
} from "@/lib/sexRibbons";
import type { ChatPov } from "@/lib/xai";

/** Persist Companion drawer open/closed across visits (optional preference). */
const COMPANION_CHAT_OPEN_KEY = "narcissus.artOfX.companionChatOpen";

/** Phone/desktop option sheets — mutual exclusive so only one covers the message list. */
type ChatOverlay = null | "cast" | "memories" | "ribbons" | "voice";

const VOICE_GENDERS: MuseVoiceGender[] = ["female", "male"];

/** Chat prompt only needs text fields — strip heavy data-URLs. */
function partnerForChatApi(p: PartnerRecord): PartnerRecord {
  return { ...p, photos: [] };
}

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
  /** Additional Muses in the scene (max 3; primary + mates ≤ 4). */
  const [castIds, setCastIds] = useState<number[]>([]);
  const [chatOverlay, setChatOverlay] = useState<ChatOverlay>(null);
  const castPickerOpen = chatOverlay === "cast";
  const memoriesOpen = chatOverlay === "memories";
  const ribbonsOpen = chatOverlay === "ribbons";
  const voicePanelOpen = chatOverlay === "voice";
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
  const [chatPrefReady, setChatPrefReady] = useState(false);
  const [ribbonFlash, setRibbonFlash] = useState<string | null>(null);
  const [memoryDraft, setMemoryDraft] = useState("");
  const [memoryKind, setMemoryKind] = useState<MuseMemoryKind>("relationship");
  const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null);
  /** Inline edit for the user's own chat bubbles (not the composer). */
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [reactionReply, setReactionReply] = useState<{
    id: string;
    text: string;
  } | null>(null);
  const [voicePrefs, setVoicePrefs] = useState<ChatVoicePrefs>(
    DEFAULT_CHAT_VOICE_PREFS,
  );
  const [speechOk, setSpeechOk] = useState(false);
  const [naturalTts, setNaturalTts] = useState(false);
  const voicePreview = useMuseVoicePreview();
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const voicePrefsRef = useRef<ChatVoicePrefs>(DEFAULT_CHAT_VOICE_PREFS);
  const partnersRef = useRef<PartnerRecord[]>([]);
  const skipPersist = useRef(false);
  const streamingChats = useRef(false);
  const chatsRef = useRef<Record<string, ChatMessage[]>>({});
  const pickedFromUrl = useRef(false);
  const castFromUrl = useRef(false);
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const urlSyncSkip = useRef(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(COMPANION_CHAT_OPEN_KEY);
      if (raw === "0") setChatOpen(false);
      else if (raw === "1") setChatOpen(true);
    } catch {
      /* private mode / blocked storage */
    }
    setChatPrefReady(true);
  }, []);

  useEffect(() => {
    const prefs = loadChatVoicePrefs();
    setVoicePrefs(prefs);
    voicePrefsRef.current = prefs;
    setSpeechOk(narrationSupported());
    void naturalTtsAvailable().then(setNaturalTts);
    return warmSpeechVoices();
  }, []);

  useEffect(() => {
    voicePrefsRef.current = voicePrefs;
    saveChatVoicePrefs(voicePrefs);
  }, [voicePrefs]);

  useEffect(() => {
    return () => stopNarration();
  }, []);

  useEffect(() => {
    if (!chatPrefReady) return;
    try {
      localStorage.setItem(COMPANION_CHAT_OPEN_KEY, chatOpen ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [chatOpen, chatPrefReady]);

  function openChatPanel() {
    setChatOpen(true);
  }

  function closeChatOverlay() {
    if (chatOverlay === "voice") voicePreview.stop();
    setChatOverlay(null);
  }

  function toggleChatOverlay(next: Exclude<ChatOverlay, null>) {
    setChatOverlay((cur) => {
      if (cur === next) {
        if (cur === "voice") voicePreview.stop();
        return null;
      }
      if (cur === "voice") voicePreview.stop();
      return next;
    });
  }

  function closeChatPanel() {
    setChatOpen(false);
    setChatOverlay(null);
    voicePreview.stop();
  }

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
        const primary = Number.isFinite(fromUrl) ? fromUrl : undefined;
        const fromWith = parseCastWithParam(withParam, primary).filter((id) =>
          list.some((p) => samePartnerId(p.id, id)),
        );
        if (fromWith.length > 0) {
          setCastIds(fromWith);
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
    if (!ready || castFromUrl.current || !withParam || activeId == null) return;
    const ids = parseCastWithParam(withParam, activeId).filter((id) =>
      partners.some((p) => samePartnerId(p.id, id)),
    );
    if (ids.length > 0) {
      setCastIds(ids);
      castFromUrl.current = true;
    }
  }, [ready, withParam, partners, activeId]);

  /** Keep `?muse=&with=` shareable as cast changes. */
  useEffect(() => {
    if (!ready || activeId == null || typeof window === "undefined") return;
    if (urlSyncSkip.current) {
      urlSyncSkip.current = false;
      return;
    }
    const params = new URLSearchParams(window.location.search);
    params.set("muse", String(activeId));
    const withValue = formatCastWithParam(castIds);
    if (withValue) params.set("with", withValue);
    else params.delete("with");
    const next = `${window.location.pathname}?${params.toString()}`;
    const cur = `${window.location.pathname}${window.location.search}`;
    if (next !== cur) window.history.replaceState(null, "", next);
  }, [ready, activeId, castIds]);

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

  useEffect(() => {
    if (!ribbonFlash) return;
    const t = setTimeout(() => setRibbonFlash(null), 4200);
    return () => clearTimeout(t);
  }, [ribbonFlash]);

  useEffect(() => {
    if (!ribbonsOpen) return;
    const t = requestAnimationFrame(() => {
      document
        .querySelector("[data-testid='muse-ribbons-panel']")
        ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
    return () => cancelAnimationFrame(t);
  }, [ribbonsOpen]);

  const partner = useMemo(
    () => partners.find((p) => p.id === activeId) || null,
    [partners, activeId],
  );
  const castPartners = useMemo(() => {
    if (!partner) return [] as PartnerRecord[];
    const ids = normalizeCastMateIds(castIds, partner.id);
    return ids
      .map((id) => partners.find((p) => samePartnerId(p.id, id)))
      .filter((p): p is PartnerRecord => Boolean(p));
  }, [partners, partner, castIds]);
  /** First mate — dual-cast / legacy call sites. */
  const castPartner = castPartners[0] || null;
  const pairedOptions = useMemo(
    () => (partner ? pairedMusesFor(partner, partners) : []),
    [partner, partners],
  );
  const castPickOptions = useMemo(() => {
    if (!partner) return [] as PartnerRecord[];
    const paired = pairedOptions;
    const pairedSet = new Set(paired.map((p) => Number(p.id)));
    const rest = partners.filter(
      (p) =>
        !samePartnerId(p.id, partner.id) && !pairedSet.has(Number(p.id)),
    );
    return [...paired, ...rest];
  }, [partner, partners, pairedOptions]);
  const companionFull = Boolean(partner) && presenceStyle === "cartoon";
  const threadKey =
    activeId != null
      ? museCastThreadKey(
          activeId,
          castPartners.map((p) => Number(p.id)),
        )
      : "";
  const messages = threadKey ? chats[threadKey] || [] : [];

  useEffect(() => {
    setEditingMessageId(null);
    setEditDraft("");
  }, [threadKey]);
  const castLabel = partner
    ? castPartners.length > 0
      ? [displayName(partner), ...castPartners.map((p) => displayName(p))].join(
          " + ",
        )
      : displayName(partner)
    : "";
  const castModeLabel =
    castPartners.length >= 2
      ? `Group cast · ${castPartners.length + 1} Muses`
      : castPartners.length === 1
        ? "Dual cast · been together"
        : null;
  const visibleMemories = useMemo(() => {
    if (!partner) return [] as MuseMemory[];
    return memoriesForPrompt(partner.memories || [], {
      pairWith: castPartner?.id ?? null,
      castIds: castPartners.map((p) => Number(p.id)),
    });
  }, [partner, castPartner, castPartners]);
  const tryNewActive = Boolean(
    partner?.tryNewThings || castPartners.some((p) => p.tryNewThings),
  );
  const museRibbons = useMemo(
    () => normalizeSexRibbons(partner?.sexRibbons),
    [partner?.sexRibbons],
  );
  const ribbonCtx = useMemo(() => {
    const recentText = messages
      .slice(-12)
      .map((m) => m.text)
      .join("\n");
    return {
      memories: partner?.memories || [],
      tryNewThings: tryNewActive,
      dualCast: castPartners.length > 0,
      messageCount: messages.length,
      recentText,
    };
  }, [partner?.memories, tryNewActive, castPartners, messages]);
  const collection = useMemo(
    () => globalRibbonCollection(partners),
    [partners],
  );

  function syncCastTryNew(
    list: PartnerRecord[],
    primaryNext: PartnerRecord,
  ): PartnerRecord[] {
    if (typeof primaryNext.tryNewThings !== "boolean") return list;
    if (primaryNext.memories !== partner?.memories) return list;
    const castSet = new Set(castPartners.map((c) => Number(c.id)));
    if (castSet.size === 0) return list;
    return list.map((p) => {
      if (!castSet.has(Number(p.id))) return p;
      if (Boolean(p.tryNewThings) === primaryNext.tryNewThings) return p;
      return {
        ...p,
        tryNewThings: primaryNext.tryNewThings,
        updatedAt: new Date().toISOString(),
      };
    });
  }

  async function persistCastPairings(nextCastIds: number[]) {
    if (!partner || nextCastIds.length === 0) return;
    const groupIds = [Number(partner.id), ...nextCastIds];
    const linked = ensureMuseGroupPairings(partnersRef.current, groupIds);
    if (linked === partnersRef.current) return;
    setPartners(linked);
    partnersRef.current = linked;
    try {
      try {
        savePartners(linked);
      } catch {
        // local quota
      }
      const saved = await persistPartners(linked);
      setPartners(saved);
      partnersRef.current = saved;
    } catch {
      // pairings still local
    }
  }

  function setCastSelection(nextIds: number[]) {
    const normalized = normalizeCastMateIds(nextIds, activeId ?? undefined);
    setCastIds(normalized);
    setError(null);
    if (normalized.length > 0) void persistCastPairings(normalized);
  }

  function toggleCastMate(id: number) {
    const cur = normalizeCastMateIds(castIds, activeId ?? undefined);
    const has = cur.some((x) => samePartnerId(x, id));
    if (has) {
      setCastSelection(cur.filter((x) => !samePartnerId(x, id)));
      return;
    }
    if (cur.length >= MAX_MUSE_CAST_MATES) {
      setError(`Group cast max is ${MAX_MUSE_CAST_MATES + 1} Muses.`);
      return;
    }
    setCastSelection([...cur, id]);
  }

  function beginEditMessage(m: ChatMessage) {
    if (m.who !== "You" || sending) return;
    setEditingMessageId(m.id);
    setEditDraft(m.text);
  }

  function cancelEditMessage() {
    setEditingMessageId(null);
    setEditDraft("");
  }

  function saveEditMessage() {
    if (!editingMessageId || !threadKey) return;
    const nextText = editDraft.trim();
    if (!nextText) return;
    const id = editingMessageId;
    setChats((prev) => ({
      ...prev,
      [threadKey]: (prev[threadKey] || []).map((m) =>
        m.id === id ? { ...m, text: nextText } : m,
      ),
    }));
    setEditingMessageId(null);
    setEditDraft("");
  }

  async function persistPartnerPatch(
    patch: (p: PartnerRecord) => PartnerRecord,
  ) {
    const list = partnersRef.current;
    if (!partner) return;
    const primaryNext = patch(partner);
    let next = list.map((p) =>
      samePartnerId(p.id, partner.id) ? primaryNext : p,
    );
    // Keep cast tryNewThings in sync when toggling from chat.
    next = syncCastTryNew(next, primaryNext);
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
    const castSet = new Set(castPartners.map((c) => Number(c.id)));
    const list = partnersRef.current.map((p) => {
      if (samePartnerId(p.id, partner.id)) {
        let next = { ...p, tryNewThings: enabled, updatedAt: now };
        if (enabled) {
          const awarded = autoAwardFromContext(next.sexRibbons, {
            memories: next.memories,
            tryNewThings: true,
            dualCast: castPartners.length > 0,
            messageCount: messages.length,
            recentText: messages.map((m) => m.text).join("\n"),
          });
          next = { ...next, sexRibbons: awarded.awards };
          if (awarded.granted.length) {
            setRibbonFlash(
              awarded.granted.map((id) => ribbonDef(id).name).join(" · "),
            );
          }
        }
        return next;
      }
      if (castSet.has(Number(p.id))) {
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

  async function setMuseVoice(patch: {
    voiceGender?: MuseVoiceGender;
    voicePreset?: MuseVoicePresetId;
    voiceAccent?: MuseVoiceAccentId;
    voiceId?: string;
  }) {
    if (!partner) return;
    const now = new Date().toISOString();
    const nextGender = patch.voiceGender ?? partner.voiceGender;
    const list = partnersRef.current.map((p) =>
      samePartnerId(p.id, partner.id)
        ? {
            ...p,
            voiceGender: nextGender,
            voicePreset:
              patch.voicePreset ??
              (patch.voiceGender ? "auto" : p.voicePreset),
            // Gender change keeps accent (locale); only clear exact URI overrides.
            voiceId:
              patch.voiceId !== undefined
                ? patch.voiceId
                : patch.voiceAccent !== undefined
                  ? encodeAccentVoiceId(patch.voiceAccent)
                  : patch.voiceGender
                    ? encodeAccentVoiceId(accentFromVoiceId(p.voiceId))
                    : p.voiceId,
            updatedAt: now,
          }
        : p,
    );
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
        err instanceof Error ? err.message : "Couldn’t save Muse voice.",
      );
    }
  }

  async function claimRibbon(ribbonId: SexRibbonId) {
    if (!partner) return;
    if (hasRibbon(partner.sexRibbons, ribbonId)) return;
    if (!isTaskComplete(ribbonId, ribbonCtx)) {
      setError("Finish the task before claiming that ribbon.");
      return;
    }
    const def = ribbonDef(ribbonId);
    await persistPartnerPatch((p) => ({
      ...p,
      sexRibbons: awardRibbon(p.sexRibbons, ribbonId, "claim"),
      updatedAt: new Date().toISOString(),
    }));
    setRibbonFlash(def.name);
  }

  async function syncRibbonsFromContext(
    targetId: number,
    ctxOverride?: Partial<typeof ribbonCtx>,
  ) {
    const p = partnersRef.current.find((x) => samePartnerId(x.id, targetId));
    if (!p) return;
    const ctx = {
      memories: p.memories || [],
      tryNewThings: Boolean(
        p.tryNewThings || castPartners.some((c) => c.tryNewThings),
      ),
      dualCast: castPartners.length > 0,
      messageCount: messages.length,
      recentText: messages.map((m) => m.text).join("\n"),
      ...ctxOverride,
    };
    const { awards, granted } = autoAwardFromContext(p.sexRibbons, ctx);
    if (!granted.length) return;
    const now = new Date().toISOString();
    const list = partnersRef.current.map((row) =>
      samePartnerId(row.id, targetId)
        ? { ...row, sexRibbons: awards, updatedAt: now }
        : row,
    );
    setPartners(list);
    partnersRef.current = list;
    setRibbonFlash(granted.map((id) => ribbonDef(id).name).join(" · "));
    try {
      try {
        savePartners(list);
      } catch {
        // ignore
      }
      const saved = await persistPartners(list);
      setPartners(saved);
      partnersRef.current = saved;
    } catch {
      // local already has awards
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
    let grantedFlash: string | null = null;
    const list = partnersRef.current.map((p) => {
      if (!samePartnerId(p.id, id)) return p;
      const memories = mergeMemories(normalizeMemories(p.memories), incoming);
      const { awards, granted } = autoAwardFromContext(p.sexRibbons, {
        memories,
        tryNewThings: Boolean(
          p.tryNewThings || castPartners.some((c) => c.tryNewThings),
        ),
        dualCast: castPartners.length > 0,
        messageCount: messages.length,
        recentText: messages.map((m) => m.text).join("\n"),
      });
      if (granted.length) {
        grantedFlash = granted.map((rid) => ribbonDef(rid).name).join(" · ");
      }
      return {
        ...p,
        memories,
        sexRibbons: awards,
        updatedAt: now,
      };
    });
    setPartners(list);
    partnersRef.current = list;
    if (grantedFlash) setRibbonFlash(grantedFlash);
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
      await persistPartnerPatch((p) => {
        const memories = normalizeMemories(p.memories).map((m) =>
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
        );
        const { awards, granted } = autoAwardFromContext(p.sexRibbons, {
          memories,
          tryNewThings: Boolean(
            p.tryNewThings || castPartners.some((c) => c.tryNewThings),
          ),
          dualCast: castPartners.length > 0,
          messageCount: messages.length,
          recentText: messages.map((m) => m.text).join("\n"),
        });
        if (granted.length) {
          setRibbonFlash(granted.map((id) => ribbonDef(id).name).join(" · "));
        }
        return {
          ...p,
          memories,
          sexRibbons: awards,
          updatedAt: new Date().toISOString(),
        };
      });
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
    setChatOverlay("memories");
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
    setEditingMessageId(null);
    setEditDraft("");
    try {
      skipPersist.current = true;
      if (castPartners.length > 0) {
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
          cast:
            castPartners.length > 0
              ? castPartners.map((c) => partnerForChatApi(c))
              : null,
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
        const nextCount = (chatsRef.current[key] || []).length;
        const recentBlob = [...prior, you, { text: trimmed }]
          .map((m) => ("text" in m ? m.text : ""))
          .join("\n");
        void syncRibbonsFromContext(partner.id, {
          dualCast: castPartners.length > 0,
          messageCount: nextCount,
          recentText: recentBlob,
          tryNewThings: tryNewActive,
          memories: partner.memories || [],
        });
        if (voicePrefsRef.current.autoNarrateMuse && narrationSupported()) {
          speakMessage(
            replyId,
            trimmed,
            voiceSettingsFromPartner(partner),
          );
        }
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
                    setCastIds((cur) => {
                      if (cur.length === 0) return [];
                      const paired = new Set(
                        pairedMusesFor(p, partners).map((x) => Number(x.id)),
                      );
                      return normalizeCastMateIds(
                        cur.filter((id) => paired.has(Number(id))),
                        p.id,
                      );
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
                ? `muse-chat-stage muse-chat-stage--companion-full relative flex min-h-[100dvh] flex-1 overflow-hidden${
                    chatOpen ? " muse-chat-stage--chat-open" : ""
                  }`
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
                  castPartners={castPartners}
                  variant={companionFull ? "full" : "rail"}
                  onStyleChange={setPresenceStyle}
                  lastPartnerReply={reactionReply}
                  chatCollapsed={companionFull && !chatOpen}
                  museOptions={companionFull ? partners : undefined}
                  onSelectMuse={
                    companionFull
                      ? (id) => {
                          setActiveId(id);
                          setCastIds((cur) => {
                            const next = partners.find((p) =>
                              samePartnerId(p.id, id),
                            );
                            if (!next || cur.length === 0) return [];
                            const paired = new Set(
                              pairedMusesFor(next, partners).map((p) =>
                                Number(p.id),
                              ),
                            );
                            return normalizeCastMateIds(
                              cur.filter((cid) => paired.has(Number(cid))),
                              id,
                            );
                          });
                          setError(null);
                        }
                      : undefined
                  }
                  chatOpen={companionFull ? chatOpen : undefined}
                  onPartnerPhotosChange={updatePartnerPhotos}
                />
              </div>
            ) : (
              <div className="flex min-h-64 items-center justify-center border-b border-[var(--line)] p-6 text-sm text-[var(--muted)] lg:border-b-0 lg:border-r">
                Select a {PERSON_LABEL.singularLower}
              </div>
            )}

            {companionFull && partner && !chatOpen && (
              <button
                type="button"
                className="muse-chat-fab z-30"
                onClick={openChatPanel}
                data-testid="muse-chat-fab"
                aria-label="Open chat"
              >
                Chat
              </button>
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
              aria-hidden={companionFull ? !chatOpen : undefined}
            >
              {partner && (
                <div className="muse-chat-drawer-header border-b border-[var(--glow)]/15">
                  <div className="muse-chat-drawer-header-top">
                    <div className="min-w-0 flex-1">
                      <h2
                        className="muse-chat-drawer-header-title text-xl text-[var(--ink)]"
                        style={{ fontFamily: "var(--font-display), serif" }}
                        title={castLabel}
                      >
                        {castPartners.length >= 2 && partner
                          ? `${displayName(partner)} + ${castPartners.length}`
                          : castLabel}
                      </h2>
                      <p
                        className="mt-0.5 truncate text-xs text-[#c4b7a8]"
                        title={castLabel}
                      >
                        {castModeLabel
                          ? castPartners.length >= 2
                            ? `${castModeLabel} · ${castLabel}`
                            : castModeLabel
                          : companionFull
                            ? "Companion · Adults 18+"
                            : partner.dynTags.slice(0, 3).join(" · ") ||
                              "No dynamics tagged"}
                        {modelLabel ? ` · ${modelLabel}` : ""}
                      </p>
                    </div>
                    {companionFull && (
                      <button
                        type="button"
                        onClick={closeChatPanel}
                        className="muse-chat-drawer-close"
                        data-testid="muse-chat-close"
                        aria-label="Close chat"
                        title="Close chat — show more of the Muse"
                      >
                        Close
                      </button>
                    )}
                  </div>

                  {castPickOptions.length > 0 && (
                    <div className="muse-chat-cast-chrome">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleChatOverlay("cast")}
                          className={`muse-chat-tool ${
                            castPickerOpen ? "muse-chat-tool--on" : ""
                          }`}
                          aria-expanded={castPickerOpen}
                          data-testid="muse-cast-picker-toggle"
                        >
                          {castPartners.length === 0
                            ? "Add Muses to cast"
                            : `Cast · ${castPartners.length + 1} of ${MAX_MUSE_CAST_MATES + 1}`}
                        </button>
                        {castPartners.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setCastSelection([]);
                              closeChatOverlay();
                            }}
                            className="muse-chat-tool muse-chat-tool--quiet"
                          >
                            Solo
                          </button>
                        )}
                      </div>
                      {castPartners.length > 0 && (
                        <ul
                          className="muse-chat-cast-chips mt-1.5"
                          aria-label="Active cast"
                        >
                          {castPartners.map((p) => (
                            <li key={p.id}>
                              <button
                                type="button"
                                onClick={() => toggleCastMate(p.id)}
                                className="muse-chat-cast-chip"
                                title={`Remove ${displayName(p)}`}
                              >
                                {mainPhoto(p) ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={mainPhoto(p)!} alt="" />
                                ) : null}
                                {displayName(p)}
                                <span
                                  aria-hidden
                                  className="text-[var(--muted)]"
                                >
                                  ×
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  <div
                    className="muse-chat-toolbar"
                    role="toolbar"
                    aria-label="Chat options"
                  >
                    <button
                      type="button"
                      onClick={() => toggleChatOverlay("memories")}
                      className={`muse-chat-tool ${
                        memoriesOpen ? "muse-chat-tool--on" : ""
                      }`}
                      title="What she remembers — add lasting facts for chat"
                      aria-expanded={memoriesOpen}
                      data-testid="muse-memories-toggle"
                    >
                      Memories
                      {visibleMemories.length
                        ? ` (${visibleMemories.length})`
                        : ""}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleChatOverlay("ribbons")}
                      className={`muse-chat-tool ${
                        ribbonsOpen ? "muse-chat-tool--on" : ""
                      }`}
                      title="Sex ribbons — complete chat tasks, collect across Muses"
                      aria-expanded={ribbonsOpen}
                      data-testid="muse-ribbons-toggle"
                    >
                      Ribbons
                      {museRibbons.length ? ` (${museRibbons.length})` : ""}
                      {collection.totalCount
                        ? ` · ${collection.totalCount}`
                        : ""}
                    </button>
                    <button
                      type="button"
                      onClick={() => void setTryNewThings(!tryNewActive)}
                      className={`muse-chat-tool ${
                        tryNewActive ? "muse-chat-tool--on" : ""
                      }`}
                      title={
                        tryNewActive
                          ? "Allowed to try new things / shift mode"
                          : "Stay in established vibe — tap to grant try-new"
                      }
                    >
                      {tryNewActive ? "Try new · on" : "Try new"}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleChatOverlay("voice")}
                      className={`muse-chat-tool ${
                        voicePanelOpen ? "muse-chat-tool--on" : ""
                      }`}
                      title={
                        voicePanelOpen
                          ? "Hide Muse voice options"
                          : "Muse voice — gender, accent, preset, auto-play"
                      }
                      aria-expanded={voicePanelOpen}
                      data-testid="muse-voice-toggle"
                    >
                      Voice
                      {partner.voiceGender === "male" ? " · ♂" : " · ♀"}
                      {(() => {
                        const accent = accentFromVoiceId(partner.voiceId);
                        return accent !== "auto"
                          ? ` · ${accentLabel(accent)}`
                          : "";
                      })()}
                    </button>
                    <label className="muse-chat-tool muse-chat-tool--pov">
                      <span>POV</span>
                      <select
                        value={pov}
                        onChange={(e) => setPov(e.target.value as ChatPov)}
                        className="muse-chat-pov-select"
                      >
                        <option value="1st">1st</option>
                        <option value="3rd">3rd</option>
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={() => void resetChat()}
                      disabled={resetting || messages.length === 0}
                      className="muse-chat-tool muse-chat-tool--danger"
                      title="Clear this Muse’s conversation (memories stay)"
                    >
                      {resetting ? "Resetting…" : "Reset"}
                    </button>
                  </div>
                </div>
              )}

              {partner && ribbonFlash && (
                <div
                  className="border-b border-[var(--accent)]/35 bg-[linear-gradient(90deg,#12182a_0%,#1a1420_55%,#12182a_100%)] px-4 py-2 text-xs text-[var(--accent-strong)] sm:px-5"
                  data-testid="muse-ribbon-flash"
                >
                  Ribbon earned · {ribbonFlash}
                </div>
              )}

              <div className="muse-chat-drawer-main">
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
                  <p className="muse-chat-empty text-[0.9375rem] leading-[1.65] text-[#e8dcd0]">
                    {castPartners.length > 0
                      ? `Say something filthy — ${castLabel} ${castPartners.length === 1 ? "are both" : "are all"} in the scene.`
                      : "Say something filthy. Her portrait stays with you."}
                  </p>
                )}
                {messages.map((m) => {
                  const isEditingYou =
                    m.who === "You" && editingMessageId === m.id;
                  const showNarrate =
                    Boolean(m.text?.trim()) &&
                    !(sending && m.who === "Partner" && !m.text) &&
                    (m.who === "Partner" || voicePrefs.narrateUser);
                  return (
                    <div
                      key={m.id}
                      className={`max-w-[90%] rounded-sm px-4 py-3 text-base leading-[1.65] ${
                        m.who === "You"
                          ? "ml-auto bg-[var(--accent)]/20 text-[#f7f1e8]"
                          : "bg-[#12182a] text-[#f7f1e8]"
                      }`}
                      data-testid={
                        m.who === "You"
                          ? "muse-chat-user-bubble"
                          : "muse-chat-muse-bubble"
                      }
                    >
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                          {m.who === "Partner" && partner
                            ? castPartners.length > 0
                              ? castLabel
                              : displayName(partner)
                            : m.who}
                        </p>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {showNarrate && partner && (
                            <MuseChatNarrate
                              messageId={m.id}
                              text={m.text}
                              settings={voiceSettingsFromPartner(partner)}
                            />
                          )}
                          {m.who === "You" && !isEditingYou && (
                            <button
                              type="button"
                              className="muse-chat-msg-edit-btn"
                              onClick={() => beginEditMessage(m)}
                              disabled={sending}
                              data-testid={`muse-chat-edit-${m.id}`}
                              aria-label="Edit your message"
                            >
                              Edit
                            </button>
                          )}
                        </div>
                      </div>
                      {isEditingYou ? (
                        <div>
                          <textarea
                            className="muse-chat-msg-edit-field"
                            value={editDraft}
                            onChange={(e) => setEditDraft(e.target.value)}
                            aria-label="Edit message"
                            data-testid="muse-chat-edit-field"
                            autoFocus
                          />
                          <div className="muse-chat-msg-edit-actions">
                            <button
                              type="button"
                              onClick={saveEditMessage}
                              disabled={!editDraft.trim()}
                              className="border border-[var(--accent)]/55 bg-[var(--accent)] px-3 text-[var(--on-accent)] disabled:opacity-50"
                              data-testid="muse-chat-edit-save"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={cancelEditMessage}
                              className="border border-[var(--line)] text-[var(--soft)] hover:text-[var(--ink)]"
                              data-testid="muse-chat-edit-cancel"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">
                          {m.text ||
                            (sending && m.who === "Partner" ? "…" : "")}
                        </p>
                      )}
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {partner && chatOverlay && (
                <div
                  className="muse-chat-overlay"
                  data-testid="muse-chat-overlay"
                >
                  <button
                    type="button"
                    className="muse-chat-overlay-scrim"
                    aria-label="Dismiss panel"
                    data-testid="muse-chat-overlay-dismiss"
                    onClick={closeChatOverlay}
                  />
                  <div className="muse-chat-overlay-layer">
              {partner && castPickerOpen && (
                <div
                  className="muse-chat-overlay-sheet muse-chat-cast-picker"
                  data-testid="muse-cast-picker"
                  role="dialog"
                  aria-label="Cast picker"
                >
                  <div className="muse-chat-overlay-head">
                    <p
                      className="text-sm text-[var(--ink)]"
                      style={{ fontFamily: "var(--font-display), serif" }}
                    >
                      Cast
                    </p>
                    <button
                      type="button"
                      onClick={closeChatOverlay}
                      className="muse-chat-tool shrink-0"
                      data-testid="muse-cast-picker-close"
                      aria-label="Close cast picker"
                    >
                      Close
                    </button>
                  </div>
                  <p className="mb-1.5 text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
                    Pick up to {MAX_MUSE_CAST_MATES} more ·{" "}
                    {MAX_MUSE_CAST_MATES + 1} total
                  </p>
                  <ul className="muse-chat-overlay-list flex flex-col gap-1">
                    {castPickOptions.map((p) => {
                      const on = castPartners.some((c) =>
                        samePartnerId(c.id, p.id),
                      );
                      const paired = pairedOptions.some((x) =>
                        samePartnerId(x.id, p.id),
                      );
                      return (
                        <li key={p.id}>
                          <label className="flex min-h-[2.75rem] cursor-pointer items-center gap-2 px-1 py-1.5 text-sm text-[var(--ink)] hover:bg-[var(--glow)]/5">
                            <input
                              type="checkbox"
                              checked={on}
                              onChange={() => toggleCastMate(p.id)}
                              className="accent-[var(--glow)] h-4 w-4"
                            />
                            <span className="min-w-0 flex-1 truncate">
                              {displayName(p)}
                            </span>
                            {paired ? (
                              <span className="shrink-0 text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
                                together
                              </span>
                            ) : null}
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
{partner && voicePanelOpen && (
                <div
                  className="muse-chat-overlay-sheet muse-voice-panel"
                  data-testid="muse-voice-panel"
                  role="dialog"
                  aria-label="Voice options"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                      <p
                        className="text-sm text-[var(--ink)]"
                        style={{ fontFamily: "var(--font-display), serif" }}
                      >
                        Chat voice
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-[#c4b7a8]">
                        {!speechOk
                          ? "Speech isn’t available in this browser — chat still works without voice."
                          : naturalTts || voicePreview.natural
                            ? "Natural voice — pick accent + delivery (each plays a short test). Tap Play on a bubble."
                            : "Using this browser’s voice for now. Add OPENAI_API_KEY on Vercel for natural Muse TTS — Preview/Play soft-recover; chat is never blocked."}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        voicePreview.stop();
                        closeChatOverlay();
                      }}
                      className="muse-chat-tool shrink-0"
                      data-testid="muse-voice-close"
                      aria-label="Close voice menu"
                    >
                      Close
                    </button>
                  </div>

                  <div className="muse-voice-panel-body">
                    <p className="mb-1.5 text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                      Muse gender
                    </p>
                    <div className="mb-3 flex flex-wrap gap-2">
                      {VOICE_GENDERS.map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => {
                            void setMuseVoice({ voiceGender: g });
                            voicePreview.preview(
                              voiceSettingsFromPartner({
                                ...partner,
                                voiceGender: g,
                                voicePreset: "auto",
                                voiceId: encodeAccentVoiceId(
                                  accentFromVoiceId(partner.voiceId),
                                ),
                              }),
                            );
                          }}
                          className={`rounded-sm border px-2.5 py-1.5 text-xs capitalize ${
                            partner.voiceGender === g
                              ? "border-[var(--glow)]/55 bg-[var(--glow)]/12 text-[var(--glow)]"
                              : "border-[var(--glow)]/20 text-[var(--soft)] hover:border-[var(--glow)]/40"
                          }`}
                          data-testid={`chat-voice-gender-${g}`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>

                    <p className="mb-1.5 text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                      Accent
                    </p>
                    <div
                      className="muse-voice-chip-row mb-3"
                      role="group"
                      aria-label="Voice accent"
                    >
                      {MUSE_VOICE_ACCENTS.map((a) => {
                        const selected =
                          accentFromVoiceId(partner.voiceId) === a.id;
                        return (
                          <button
                            key={a.id}
                            type="button"
                            title={a.blurb}
                            onClick={() => {
                              void setMuseVoice({
                                voiceAccent: a.id as MuseVoiceAccentId,
                              });
                              voicePreview.preview(
                                voiceSettingsFromPartner({
                                  ...partner,
                                  voiceId: encodeAccentVoiceId(
                                    a.id as MuseVoiceAccentId,
                                  ),
                                }),
                              );
                            }}
                            className={`muse-voice-chip ${
                              selected ? "muse-voice-chip--on" : ""
                            }`}
                            data-testid={`chat-voice-accent-${a.id}`}
                          >
                            {a.label}
                          </button>
                        );
                      })}
                    </div>

                    <p className="mb-1.5 text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                      Delivery
                    </p>
                    <div className="mb-3 flex flex-wrap gap-2">
                      {presetsForGender(partner.voiceGender || "female").map(
                        (p) => (
                          <button
                            key={p.id}
                            type="button"
                            title={p.blurb}
                            onClick={() => {
                              void setMuseVoice({
                                voicePreset: p.id as MuseVoicePresetId,
                              });
                              voicePreview.preview(
                                voiceSettingsFromPartner({
                                  ...partner,
                                  voicePreset: p.id as MuseVoicePresetId,
                                }),
                              );
                            }}
                            className={`rounded-sm border px-2.5 py-1.5 text-xs ${
                              partner.voicePreset === p.id
                                ? "border-[var(--glow)]/55 bg-[var(--glow)]/12 text-[var(--glow)]"
                                : "border-[var(--glow)]/20 text-[var(--soft)] hover:border-[var(--glow)]/40"
                            }`}
                            data-testid={`chat-voice-preset-${p.id}`}
                          >
                            {p.label}
                          </button>
                        ),
                      )}
                    </div>

                    <MuseVoicePreviewBar
                      api={voicePreview}
                      settings={voiceSettingsFromPartner(partner)}
                      compact
                      className="mb-3"
                    />

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setVoicePrefs((prev) => ({
                            ...prev,
                            autoNarrateMuse: !prev.autoNarrateMuse,
                          }))
                        }
                        className={`muse-chat-tool ${
                          voicePrefs.autoNarrateMuse ? "muse-chat-tool--on" : ""
                        }`}
                        data-testid="chat-voice-auto"
                      >
                        {voicePrefs.autoNarrateMuse
                          ? "Auto-play · on"
                          : "Auto-play Muse"}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setVoicePrefs((prev) => ({
                            ...prev,
                            narrateUser: !prev.narrateUser,
                          }))
                        }
                        className={`muse-chat-tool ${
                          voicePrefs.narrateUser ? "muse-chat-tool--on" : ""
                        }`}
                        data-testid="chat-voice-user"
                      >
                        {voicePrefs.narrateUser
                          ? "Your lines · on"
                          : "Your lines · off"}
                      </button>
                      <button
                        type="button"
                        onClick={() => stopNarration()}
                        className="muse-chat-tool"
                        data-testid="chat-voice-stop-all"
                      >
                        Stop
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {partner && ribbonsOpen && (
                <div
                  className="muse-chat-overlay-sheet muse-ribbons-panel"
                  data-testid="muse-ribbons-panel"
                  role="dialog"
                  aria-label="Sex ribbons"
                >
                  <div className="muse-chat-overlay-head mb-2">
                    <div className="min-w-0">
                      <p
                        className="text-sm text-[var(--ink)]"
                        style={{ fontFamily: "var(--font-display), serif" }}
                      >
                        Sex ribbons
                      </p>
                      <p className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                        {collection.totalCount} total ·{" "}
                        {collection.uniqueTypes.length}/
                        {SEX_RIBBON_CATALOG.length} types
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={closeChatOverlay}
                      className="muse-chat-tool shrink-0"
                      data-testid="muse-ribbons-close"
                      aria-label="Close ribbons"
                    >
                      Close
                    </button>
                  </div>
                  <p className="mb-3 text-xs leading-relaxed text-[#c4b7a8]">
                    Complete light chat tasks with {displayName(partner)} to
                    earn ribbons. Collection spans every Muse.
                  </p>

                  <ul className="mb-3 max-h-44 space-y-2 overflow-y-auto">
                    {SEX_RIBBON_CATALOG.map((def) => {
                      const earned = hasRibbon(museRibbons, def.id);
                      const ready = !earned && isTaskComplete(def.id, ribbonCtx);
                      return (
                        <li
                          key={def.id}
                          className="flex items-start justify-between gap-3 border border-[var(--glow)]/18 bg-[#0c121c]/75 px-2.5 py-2"
                          data-testid={`muse-ribbon-task-${def.id}`}
                        >
                          <div className="min-w-0">
                            <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--glow)]/85">
                              {tierLabel(def.tier)} · {def.name}
                              {earned ? " · earned" : ready ? " · ready" : ""}
                            </p>
                            <p className="mt-0.5 text-sm leading-snug text-[#f7f1e8]">
                              {def.task}
                            </p>
                          </div>
                          <div className="shrink-0">
                            {earned ? (
                              <span className="rounded-sm border border-[var(--accent)]/40 px-2 py-1 text-[10px] font-medium text-[var(--accent-strong)]">
                                Collected
                              </span>
                            ) : (
                              <button
                                type="button"
                                disabled={!ready}
                                onClick={() => void claimRibbon(def.id)}
                                className="rounded-sm border border-[var(--glow)]/25 px-2 py-1 text-[10px] font-medium text-[var(--soft)] transition hover:border-[var(--glow)]/50 hover:text-[var(--glow)] disabled:cursor-not-allowed disabled:opacity-40"
                                data-testid={`muse-ribbon-claim-${def.id}`}
                              >
                                Claim
                              </button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  {museRibbons.length > 0 && (
                    <div className="mb-3">
                      <p className="mb-1.5 text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                        With {displayName(partner)}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {museRibbons.map((a) => {
                          const def = ribbonDef(a.ribbonId);
                          return (
                            <span
                              key={a.id}
                              className="rounded-sm border border-[var(--accent)]/35 bg-[var(--accent)]/10 px-2 py-1 text-[10px] font-medium text-[var(--accent-strong)]"
                              title={def.blurb}
                            >
                              {def.name}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {collection.byMuse.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                        Across all Muses
                      </p>
                      <ul className="max-h-24 space-y-1 overflow-y-auto text-xs text-[#c4b7a8]">
                        {collection.byMuse.map((row) => (
                          <li
                            key={row.partnerId}
                            className="flex justify-between gap-3"
                          >
                            <span className="truncate text-[var(--ink)]">
                              {row.name}
                            </span>
                            <span className="shrink-0 text-[var(--accent)]">
                              {row.count}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {partner && memoriesOpen && (
                <div
                  className="muse-chat-overlay-sheet muse-memories-panel"
                  data-testid="muse-memories-panel"
                  role="dialog"
                  aria-label="Memories"
                >
                  <div className="muse-chat-overlay-head mb-2">
                    <div className="min-w-0">
                      <p
                        className="text-sm text-[var(--ink)]"
                        style={{ fontFamily: "var(--font-display), serif" }}
                      >
                        What {displayName(partner)} remembers
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2">
                        <Link
                          href={`/art-of-x/partners/${partner.id}/memories`}
                          className="text-[10px] uppercase tracking-[0.14em] text-[var(--accent-strong)] underline-offset-2 hover:underline"
                          data-testid="muse-memories-full-page-link"
                        >
                          Full page
                        </Link>
                        <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                          Survives reset · loads into chat
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={closeChatOverlay}
                      className="muse-chat-tool shrink-0"
                      data-testid="muse-memories-close"
                      aria-label="Close memories"
                    >
                      Close
                    </button>
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
                        className="mt-1 w-full rounded-sm border border-[var(--glow)]/25 bg-[#0c121c] px-3 py-2 text-sm text-[var(--ink)]"
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
                        className="mt-1 w-full rounded-sm border border-[var(--glow)]/25 bg-[#0c121c] px-2 py-2 text-sm text-[var(--ink)]"
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
                          className="rounded-sm border border-[var(--glow)]/25 px-3 py-2 text-xs font-medium text-[var(--soft)] hover:border-[var(--glow)]/45"
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={!memoryDraft.trim()}
                        className="rounded-sm border border-[var(--glow)]/40 bg-[var(--glow)]/15 px-3 py-2 text-xs font-semibold text-[var(--glow)] disabled:opacity-50"
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
                          className="flex items-start justify-between gap-3 border border-[var(--glow)]/18 bg-[#0c121c]/75 px-2.5 py-2"
                        >
                          <div className="min-w-0">
                            <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--glow)]/85">
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
                              className="rounded-sm border border-[var(--glow)]/25 px-2 py-1 text-[10px] font-medium text-[var(--soft)] hover:border-[var(--glow)]/50 hover:text-[var(--glow)]"
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

                  </div>
                </div>
              )}

              </div>

              <form
                onSubmit={send}
                className="muse-chat-drawer-composer flex gap-2 border-t border-[var(--glow)]/15"
              >
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Message…"
                  disabled={sending || !partner}
                  className="prompt-field min-w-0 flex-1 rounded-sm border border-[var(--glow)]/25 bg-[#0c121c] px-4 py-3.5 text-base disabled:opacity-60 focus:border-[var(--glow)]/50 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={sending || !partner || !text.trim()}
                  className="rounded-sm border border-[var(--glow)]/40 bg-[var(--glow)]/15 px-5 py-3.5 text-[0.9375rem] font-semibold text-[var(--glow)] shadow-[0_0_20px_rgba(0,229,255,0.12)] disabled:opacity-50"
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
