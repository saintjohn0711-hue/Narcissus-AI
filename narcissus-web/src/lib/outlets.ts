/**
 * Primary visitor outlets — who you want (Men / Women / Trans).
 * Deep-links into Muses with ?outlet=; couples / groups / cross dresser stay on All.
 */

import type { PersonGender } from "@/lib/artOfX";

export type OutletId = "women" | "men" | "trans";

export type OutletDef = {
  id: OutletId;
  label: string;
  /** Short line for home / hub strips */
  line: string;
  gender: PersonGender;
  href: string;
};

export const OUTLETS: readonly OutletDef[] = [
  {
    id: "women",
    label: "Women",
    line: "Muses who present as women — chat, craft, desire ledger.",
    gender: "woman",
    href: "/art-of-x/partners?outlet=women",
  },
  {
    id: "men",
    label: "Men",
    line: "Muses who present as men — chat, craft, desire ledger.",
    gender: "man",
    href: "/art-of-x/partners?outlet=men",
  },
  {
    id: "trans",
    label: "Trans",
    line: "Trans Muses — chat, craft, desire ledger.",
    gender: "trans",
    href: "/art-of-x/partners?outlet=trans",
  },
] as const;

export const OUTLET_IDS: OutletId[] = OUTLETS.map((o) => o.id);

export function parseOutletParam(
  raw: string | null | undefined,
): OutletId | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase();
  if (v === "women" || v === "men" || v === "trans") return v;
  return null;
}

export function outletById(id: OutletId): OutletDef {
  return OUTLETS.find((o) => o.id === id)!;
}

export function partnersHrefForOutlet(outlet: OutletId | null): string {
  if (!outlet) return "/art-of-x/partners";
  return `/art-of-x/partners?outlet=${outlet}`;
}

export function museMatchesOutlet(
  gender: PersonGender | string,
  outlet: OutletId,
): boolean {
  return gender === outletById(outlet).gender;
}
