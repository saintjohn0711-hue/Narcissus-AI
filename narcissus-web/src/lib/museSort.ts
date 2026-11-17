/**
 * Muse list ordering for ledger / pickers / chat select.
 * “By acts” uses the same per-Muse contribution as Echo overscore pieces.
 */

import {
  sortMuses as sortMusesBasic,
  type MuseSortMode,
  type PartnerRecord,
} from "@/lib/artOfX";
import { sortMusesByActRank } from "@/lib/museActStats";

export function sortMuses(
  list: PartnerRecord[],
  mode: MuseSortMode,
  manualOrder: number[] = [],
): PartnerRecord[] {
  if (mode === "acts-desc") {
    return sortMusesByActRank(list);
  }
  return sortMusesBasic(list, mode, manualOrder);
}
