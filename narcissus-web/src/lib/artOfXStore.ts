/**
 * Client store for Art of X — Neon-backed API when signed in + DB ready,
 * otherwise localStorage as unsigned fallback.
 *
 * Signed-in path never writes partner/scene/chat primary data to localStorage.
 */

import {
  STORAGE,
  loadChats as loadChatsLocal,
  loadPartners as loadPartnersLocal,
  loadScenes as loadScenesLocal,
  saveChats as saveChatsLocal,
  savePartners as savePartnersLocal,
  saveScenes as saveScenesLocal,
  type ChatMessage,
  type PartnerRecord,
  type SavedScene,
} from "@/lib/artOfX";

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
    const res = await fetch("/api/art-of-x/status", { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as { cloud?: boolean };
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

export async function fetchPartners(): Promise<PartnerRecord[]> {
  if ((await getStoreMode()) === "local") return loadPartnersLocal();
  const res = await fetch("/api/art-of-x/partners", { cache: "no-store" });
  if (res.status === 401) {
    resetStoreMode();
    return loadPartnersLocal();
  }
  if (!res.ok) throw new Error("Failed to load partners");
  const data = (await res.json()) as { partners: PartnerRecord[] };
  return data.partners || [];
}

export async function persistPartners(
  partners: PartnerRecord[],
): Promise<PartnerRecord[]> {
  if ((await getStoreMode()) === "local") {
    savePartnersLocal(partners);
    return partners;
  }
  const res = await fetch("/api/art-of-x/partners", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ partners }),
  });
  if (res.status === 401) {
    resetStoreMode();
    // Do not silently write account edits to localStorage while signed-out mid-session.
    throw new Error("Session expired — sign in to save to your account");
  }
  if (!res.ok) {
    let detail = "";
    try {
      const data = (await res.json()) as { message?: string; error?: string };
      detail = data.message || data.error || "";
    } catch {
      // ignore
    }
    throw new Error(detail || `Failed to save partners (${res.status})`);
  }
  const data = (await res.json()) as { partners?: PartnerRecord[] };
  return Array.isArray(data.partners) ? data.partners : partners;
}

export async function fetchScenes(): Promise<SavedScene[]> {
  if ((await getStoreMode()) === "local") return loadScenesLocal();
  const res = await fetch("/api/art-of-x/scenes", { cache: "no-store" });
  if (res.status === 401) {
    resetStoreMode();
    return loadScenesLocal();
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
    body: JSON.stringify({ scenes }),
  });
  if (res.status === 401) {
    resetStoreMode();
    throw new Error("Session expired — sign in to save to your account");
  }
  if (!res.ok) throw new Error("Failed to save scenes");
}

export async function fetchChats(): Promise<Record<string, ChatMessage[]>> {
  if ((await getStoreMode()) === "local") return loadChatsLocal();
  const res = await fetch("/api/art-of-x/chats", { cache: "no-store" });
  if (res.status === 401) {
    resetStoreMode();
    return loadChatsLocal();
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
    body: JSON.stringify({ chats }),
  });
  if (res.status === 401) {
    resetStoreMode();
    throw new Error("Session expired — sign in to save to your account");
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
    resetStoreMode();
    saveChatsLocal(next);
    return next;
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
