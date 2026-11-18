/**
 * Client store for Art of X — Neon-backed API when signed in + DB ready,
 * otherwise localStorage as unsigned fallback.
 *
 * Signed-in path never writes partner/scene/chat primary data to localStorage.
 */

import {
  PARTNERS_PHOTO_BUDGET_CHARS,
  STORAGE,
  compactPartnersForStorage,
  loadChats as loadChatsLocal,
  loadPartners as loadPartnersLocal,
  loadScenes as loadScenesLocal,
  partnersPhotoStats,
  saveChats as saveChatsLocal,
  savePartners as savePartnersLocal,
  saveScenes as saveScenesLocal,
  type ChatMessage,
  type PartnerRecord,
  type SavedScene,
} from "@/lib/artOfX";
import {
  demoMusesIfNeeded,
  ensureDemoCoupleMuse,
  ensurePowerMuses,
  markDemoMusesSeeded,
} from "@/lib/demoMuses";

/** Cleared by consumePartnersPersistNotice() after a successful persist. */
let lastPartnersPersistNotice: string | null = null;

/**
 * Soft-add Power Muses at most once per browser tab session. A failed persist
 * (payload / transient auth) used to re-PUT the full roster on every Muses /
 * chat load and thrash the session cookie cache into looking signed-out.
 */
let powerSoftAddPersistAttempted = false;

export function consumePartnersPersistNotice(): string | null {
  const n = lastPartnersPersistNotice;
  lastPartnersPersistNotice = null;
  return n;
}

function setPartnersPersistNotice(message: string | null) {
  lastPartnersPersistNotice = message;
}

export type StoreMode = "database" | "local";

export type LocalArtOfXCounts = {
  partners: number;
  scenes: number;
  chats: number;
};

let cachedMode: StoreMode | null = null;

export async function getStoreMode(): Promise<StoreMode> {
  if (cachedMode) return cachedMode;
  try {
    const res = await fetch("/api/art-of-x/status", {
      cache: "no-store",
      credentials: "same-origin",
    });
    if (res.ok) {
      const data = (await res.json()) as {
        cloud?: boolean;
        sessionCheckFailed?: boolean;
      };
      // Transient auth DB errors must not pin the tab to local/unsigned.
      if (data.sessionCheckFailed) {
        return "database";
      }
      cachedMode = data.cloud ? "database" : "local";
      return cachedMode;
    }
  } catch {
    // fall through
  }
  cachedMode = "local";
  return cachedMode;
}

/** Clear cached mode after login/logout so the next read re-probes status. */
export function resetStoreMode() {
  cachedMode = null;
}

/**
 * Only drop cloud mode when status confirms the user is not signed in.
 * A lone 401/503 on partners/chats can be a Neon blip during Power soft-add.
 */
async function downgradeToLocalIfSignedOut(): Promise<boolean> {
  resetStoreMode();
  try {
    const res = await fetch("/api/art-of-x/status", {
      cache: "no-store",
      credentials: "same-origin",
    });
    if (!res.ok) return false;
    const data = (await res.json()) as {
      cloud?: boolean;
      signedIn?: boolean;
      sessionCheckFailed?: boolean;
    };
    if (data.sessionCheckFailed) return false;
    cachedMode = data.cloud ? "database" : "local";
    return cachedMode === "local";
  } catch {
    return false;
  }
}

/** Peek browser-local Art of X counts without mutating anything. */
export function peekLocalArtOfX(): LocalArtOfXCounts {
  if (typeof window === "undefined") {
    return { partners: 0, scenes: 0, chats: 0 };
  }
  return {
    partners: loadPartnersLocal().length,
    scenes: loadScenesLocal().length,
    chats: Object.keys(loadChatsLocal()).length,
  };
}

export function hasLocalArtOfXData(): boolean {
  const c = peekLocalArtOfX();
  return c.partners > 0 || c.scenes > 0 || c.chats > 0;
}

/** Drop browser-local partners/scenes/chats after a successful account import. */
export function clearLocalArtOfX(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE.partners);
    localStorage.removeItem(STORAGE.scenes);
    localStorage.removeItem(STORAGE.chats);
  } catch {
    // ignore quota / private mode
  }
}

/**
 * Load Muses; when the roster is empty (new account / first visit),
 * seed Woman · Rocky · Jaxx once and persist.
 */
export async function fetchPartners(): Promise<PartnerRecord[]> {
  const mode = await getStoreMode();
  let list: PartnerRecord[];
  if (mode === "local") {
    list = loadPartnersLocal();
  } else {
    const res = await fetch("/api/art-of-x/partners", {
      cache: "no-store",
      credentials: "same-origin",
    });
    if (res.status === 401) {
      const signedOut = await downgradeToLocalIfSignedOut();
      if (signedOut) {
        list = loadPartnersLocal();
      } else {
        // Still signed in — transient auth blip; don't wipe to localStorage.
        throw new Error("Failed to load partners (session blip — retry)");
      }
    } else if (res.status === 503) {
      throw new Error("Failed to load partners (server busy — retry)");
    } else {
      if (!res.ok) throw new Error("Failed to load partners");
      const data = (await res.json()) as { partners: PartnerRecord[] };
      list = data.partners || [];
    }
  }
  return ensureDemoMuses(list);
}

/** Seed demo Muses into an empty roster and persist. Soft-add Heat / Power if missing. */
export async function ensureDemoMuses(
  list: PartnerRecord[],
): Promise<PartnerRecord[]> {
  const demos = demoMusesIfNeeded(list);
  let next = demos ?? ensureDemoCoupleMuse(list) ?? list;
  const withPower = ensurePowerMuses(next);
  const powerAdded = Boolean(withPower);
  if (withPower) next = withPower;
  if (next === list) return list;

  // Soft-add Power at most once per tab — avoid PUT storms that knock auth.
  if (powerAdded && powerSoftAddPersistAttempted && !demos) {
    markDemoMusesSeeded();
    return next;
  }
  if (powerAdded) powerSoftAddPersistAttempted = true;

  try {
    const saved = await persistPartners(next);
    markDemoMusesSeeded();
    return saved;
  } catch {
    // Persist failed (offline / session / payload) — still show demos in-memory.
    markDemoMusesSeeded();
    return next;
  }
}

async function preparePartnersForPersist(
  partners: PartnerRecord[],
  maxChars = PARTNERS_PHOTO_BUDGET_CHARS,
): Promise<PartnerRecord[]> {
  const { photoChars } = partnersPhotoStats(partners);
  if (photoChars <= maxChars) {
    setPartnersPersistNotice(null);
    return partners;
  }
  const result = await compactPartnersForStorage(partners, maxChars);
  if (!result.compacted) return partners;
  const parts = [
    "Muse photos were resized to fit save limits",
    result.droppedPhotos
      ? `(removed ${result.droppedPhotos} extra photo${
          result.droppedPhotos === 1 ? "" : "s"
        })`
      : null,
  ].filter(Boolean);
  setPartnersPersistNotice(parts.join(" "));
  return result.partners;
}

async function putPartnersCloud(
  partners: PartnerRecord[],
): Promise<PartnerRecord[]> {
  const res = await fetch("/api/art-of-x/partners", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ partners }),
  });
  if (res.status === 401) {
    const signedOut = await downgradeToLocalIfSignedOut();
    if (signedOut) {
      // Do not silently write account edits to localStorage while signed-out.
      throw new Error("Session expired — sign in to save to your account");
    }
    throw new Error("Couldn’t verify session — retry save");
  }
  if (res.status === 503) {
    throw new Error("Server busy verifying session — retry save");
  }
  if (!res.ok) {
    let detail = "";
    let errorCode = "";
    try {
      const data = (await res.json()) as {
        message?: string;
        error?: string;
      };
      detail = data.message || data.error || "";
      errorCode = data.error || "";
    } catch {
      // ignore
    }
    const err = new Error(detail || `Failed to save partners (${res.status})`);
    (err as Error & { status?: number; code?: string }).status = res.status;
    (err as Error & { status?: number; code?: string }).code = errorCode;
    throw err;
  }
  const data = (await res.json()) as {
    partners?: PartnerRecord[];
    notice?: string;
    trimmedExtras?: number;
  };
  if (data.notice) {
    setPartnersPersistNotice(data.notice);
  } else if (data.trimmedExtras && data.trimmedExtras > 0) {
    setPartnersPersistNotice(
      `Removed ${data.trimmedExtras} extra Muse photo${
        data.trimmedExtras === 1 ? "" : "s"
      } so the save would fit.`,
    );
  }
  return Array.isArray(data.partners) ? data.partners : partners;
}

export async function persistPartners(
  partners: PartnerRecord[],
): Promise<PartnerRecord[]> {
  const prepared = await preparePartnersForPersist(partners);
  if ((await getStoreMode()) === "local") {
    savePartnersLocal(prepared);
    return prepared;
  }
  try {
    return await putPartnersCloud(prepared);
  } catch (err) {
    const status = (err as Error & { status?: number }).status;
    const code = (err as Error & { code?: string }).code;
    const tooLarge =
      status === 413 ||
      code === "payload_too_large" ||
      /too many or too-large|payload/i.test(
        err instanceof Error ? err.message : "",
      );
    if (!tooLarge) throw err;
    // Cloud still rejected — compact harder and retry once.
    const tighter = await compactPartnersForStorage(
      prepared,
      Math.floor(PARTNERS_PHOTO_BUDGET_CHARS * 0.7),
    );
    if (tighter.compacted) {
      setPartnersPersistNotice(
        tighter.droppedPhotos
          ? `Muse photos were heavily resized (removed ${tighter.droppedPhotos} extras) so your account could save.`
          : "Muse photos were heavily resized so your account could save.",
      );
    }
    return await putPartnersCloud(tighter.partners);
  }
}

export async function fetchScenes(): Promise<SavedScene[]> {
  if ((await getStoreMode()) === "local") return loadScenesLocal();
  const res = await fetch("/api/art-of-x/scenes", {
    cache: "no-store",
    credentials: "same-origin",
  });
  if (res.status === 401) {
    const signedOut = await downgradeToLocalIfSignedOut();
    if (signedOut) return loadScenesLocal();
    throw new Error("Failed to load scenes (session blip — retry)");
  }
  if (!res.ok) throw new Error("Failed to load scenes");
  const data = (await res.json()) as { scenes: SavedScene[] };
  return data.scenes || [];
}

export async function persistScenes(scenes: SavedScene[]): Promise<void> {
  if ((await getStoreMode()) === "local") {
    saveScenesLocal(scenes);
    return;
  }
  const res = await fetch("/api/art-of-x/scenes", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ scenes }),
  });
  if (res.status === 401) {
    const signedOut = await downgradeToLocalIfSignedOut();
    if (signedOut) {
      throw new Error("Session expired — sign in to save to your account");
    }
    throw new Error("Couldn’t verify session — retry save");
  }
  if (!res.ok) throw new Error("Failed to save scenes");
}

export async function fetchChats(): Promise<Record<string, ChatMessage[]>> {
  if ((await getStoreMode()) === "local") return loadChatsLocal();
  const res = await fetch("/api/art-of-x/chats", {
    cache: "no-store",
    credentials: "same-origin",
  });
  if (res.status === 401) {
    const signedOut = await downgradeToLocalIfSignedOut();
    if (signedOut) return loadChatsLocal();
    throw new Error("Failed to load chats (session blip — retry)");
  }
  if (!res.ok) throw new Error("Failed to load chats");
  const data = (await res.json()) as { chats: Record<string, ChatMessage[]> };
  return data.chats || {};
}

export async function persistChats(
  chats: Record<string, ChatMessage[]>,
): Promise<void> {
  if ((await getStoreMode()) === "local") {
    saveChatsLocal(chats);
    return;
  }
  const res = await fetch("/api/art-of-x/chats", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ chats }),
  });
  if (res.status === 401) {
    const signedOut = await downgradeToLocalIfSignedOut();
    if (signedOut) {
      throw new Error("Session expired — sign in to save to your account");
    }
    throw new Error("Couldn’t verify session — retry save");
  }
  if (!res.ok) throw new Error("Failed to save chats");
}

/**
 * Clear chat history for one Muse (client localStorage and/or Neon).
 * Prefer DELETE on the API when cloud; always update the returned map.
 */
export async function clearChatForPartner(
  chats: Record<string, ChatMessage[]>,
  partnerId: number,
): Promise<Record<string, ChatMessage[]>> {
  const next = { ...chats };
  delete next[String(partnerId)];

  if ((await getStoreMode()) === "local") {
    saveChatsLocal(next);
    return next;
  }

  const res = await fetch(
    `/api/art-of-x/chats?partnerId=${encodeURIComponent(String(partnerId))}`,
    { method: "DELETE", credentials: "same-origin" },
  );
  if (res.status === 401) {
    const signedOut = await downgradeToLocalIfSignedOut();
    if (signedOut) {
      saveChatsLocal(next);
      return next;
    }
    // Still signed in — fall through to PUT fallback below.
  }
  if (!res.ok) {
    // Fallback: full PUT of remaining threads so the wipe still sticks.
    await persistChats(next);
    return next;
  }
  return next;
}

function nextFreeNumericId(
  used: Set<number>,
  preferred: number,
  fallback: number,
): number {
  if (Number.isFinite(preferred) && preferred > 0 && !used.has(preferred)) {
    return preferred;
  }
  let id = fallback;
  while (used.has(id)) id += 1;
  used.add(id);
  return id;
}

function nextFreeSceneId(used: Set<string>, preferred: string): string {
  if (preferred && !used.has(preferred)) return preferred;
  let n = Date.now();
  let id = `scene_${n}`;
  while (used.has(id)) {
    n += 1;
    id = `scene_${n}`;
  }
  return id;
}

/**
 * Merge browser-local Art of X into the signed-in Neon account.
 * Cloud wins on id/key conflicts; local-only rows are appended (ids remapped if needed).
 * Clears localStorage after a successful write so we stop dual-sourcing.
 */
export async function mergeLocalIntoDatabase(): Promise<LocalArtOfXCounts> {
  const localPartners = loadPartnersLocal();
  const localScenes = loadScenesLocal();
  const localChats = loadChatsLocal();

  resetStoreMode();
  cachedMode = "database";

  const cloudPartners = await fetchPartners();
  const usedPartnerIds = new Set(cloudPartners.map((p) => p.id));
  const cloudPartnerNames = new Set(
    cloudPartners.map((p) => p.name.trim().toLowerCase()).filter(Boolean),
  );
  let idSeed = Date.now();
  const addedPartners: PartnerRecord[] = [];
  for (const p of localPartners) {
    const nameKey = p.name.trim().toLowerCase();
    // Already on account (same id or same name) — keep cloud row.
    if (usedPartnerIds.has(p.id) || (nameKey && cloudPartnerNames.has(nameKey))) {
      continue;
    }
    const id = nextFreeNumericId(usedPartnerIds, p.id, idSeed++);
    usedPartnerIds.add(id);
    if (nameKey) cloudPartnerNames.add(nameKey);
    addedPartners.push({ ...p, id });
  }
  const mergedPartners = [...cloudPartners, ...addedPartners];

  const cloudScenes = await fetchScenes();
  const usedSceneIds = new Set(cloudScenes.map((s) => s.id));
  const cloudSceneTitles = new Set(
    cloudScenes.map((s) => s.title.trim().toLowerCase()).filter(Boolean),
  );
  const addedScenes: SavedScene[] = [];
  for (const s of localScenes) {
    const titleKey = s.title.trim().toLowerCase();
    if (usedSceneIds.has(s.id) || (titleKey && cloudSceneTitles.has(titleKey))) {
      continue;
    }
    const id = nextFreeSceneId(usedSceneIds, s.id);
    usedSceneIds.add(id);
    if (titleKey) cloudSceneTitles.add(titleKey);
    addedScenes.push({ ...s, id });
  }
  const mergedScenes = [...cloudScenes, ...addedScenes];

  const cloudChats = await fetchChats();
  const mergedChats: Record<string, ChatMessage[]> = { ...cloudChats };
  let addedChatThreads = 0;
  for (const [key, msgs] of Object.entries(localChats)) {
    if (!mergedChats[key] || mergedChats[key].length === 0) {
      mergedChats[key] = msgs;
      addedChatThreads += 1;
    }
  }

  await persistPartners(mergedPartners);
  await persistScenes(mergedScenes);
  await persistChats(mergedChats);
  clearLocalArtOfX();

  return {
    partners: addedPartners.length,
    scenes: addedScenes.length,
    chats: addedChatThreads,
  };
}

/**
 * After auth: offer to move browser-local data into the account.
 * Returns import counts when the user accepts (or autoImport), else null.
 */
export async function promptImportLocalIfNeeded(opts?: {
  /** New accounts: import without asking when local data exists. */
  autoImport?: boolean;
}): Promise<LocalArtOfXCounts | null> {
  if (!hasLocalArtOfXData()) return null;
  const auto = Boolean(opts?.autoImport);
  if (!auto) {
    const ok =
      typeof window !== "undefined" &&
      window.confirm(
        "Move partners saved on this browser into your Narcissus account?",
      );
    if (!ok) return null;
  }
  return mergeLocalIntoDatabase();
}
