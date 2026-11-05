/**
 * Client store for Art of X — uses Neon-backed API when signed in + DB ready,
 * otherwise localStorage (existing MVP behavior).
 */

import {
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

let cachedMode: StoreMode | null = null;

export async function getStoreMode(): Promise<StoreMode> {
  if (cachedMode) return cachedMode;
  try {
    const res = await fetch("/api/art-of-x/status", { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as { cloud?: boolean; database?: boolean };
      // Prefer cloud when signed in; otherwise local until login
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
): Promise<void> {
  if ((await getStoreMode()) === "local") {
    savePartnersLocal(partners);
    return;
  }
  const res = await fetch("/api/art-of-x/partners", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ partners }),
  });
  if (res.status === 401) {
    resetStoreMode();
    savePartnersLocal(partners);
    return;
  }
  if (!res.ok) throw new Error("Failed to save partners");
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
    saveScenesLocal(scenes);
    return;
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
    saveChatsLocal(chats);
    return;
  }
  if (!res.ok) throw new Error("Failed to save chats");
}

/** One-shot: upload current localStorage into the signed-in account database. */
export async function migrateLocalToDatabase(): Promise<{
  partners: number;
  scenes: number;
  chats: number;
}> {
  const partners = loadPartnersLocal();
  const scenes = loadScenesLocal();
  const chats = loadChatsLocal();
  resetStoreMode();
  cachedMode = "database";
  await persistPartners(partners);
  await persistScenes(scenes);
  await persistChats(chats);
  return {
    partners: partners.length,
    scenes: scenes.length,
    chats: Object.keys(chats).length,
  };
}
