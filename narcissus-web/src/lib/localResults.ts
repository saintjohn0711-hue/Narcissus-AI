import { mkdir, writeFile } from "fs/promises";
import path from "path";

const DIR = path.join(process.cwd(), ".data", "results");

export async function saveLocalResult(
  filename: string,
  bytes: Uint8Array,
): Promise<string> {
  await mkdir(DIR, { recursive: true });
  const safe = filename.replace(/[^\w.\-]+/g, "_");
  await writeFile(path.join(DIR, safe), Buffer.from(bytes));
  return safe;
}

export function localResultPath(filename: string): string {
  const safe = filename.replace(/[^\w.\-]+/g, "_");
  return path.join(DIR, safe);
}

export function localResultUrl(filename: string): string {
  const params = new URLSearchParams({
    local: "1",
    filename: filename.replace(/[^\w.\-]+/g, "_"),
  });
  return `/api/media?${params.toString()}`;
}
