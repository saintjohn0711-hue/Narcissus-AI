import { mkdir, writeFile } from "fs/promises";
import path from "path";

/**
 * Local TTS via edge-tts (Microsoft neural voices). No API key required.
 * Used for Say / JOI so videos have audible speech.
 */
export async function synthesizeSpeech(
  text: string,
  outPath: string,
  voice = "en-US-JennyNeural",
): Promise<string> {
  // edge-tts python is installed; prefer CLI for reliability from Node
  const { spawn } = await import("child_process");
  await mkdir(path.dirname(outPath), { recursive: true });

  await new Promise<void>((resolve, reject) => {
    const bin = process.env.EDGE_TTS_BIN || "edge-tts";
    const args = [
      "--voice",
      voice,
      "--text",
      text,
      "--write-media",
      outPath,
    ];
    // Prefer python module invocation (always available after pip install)
    const child = spawn(
      "python3",
      ["-m", "edge_tts", ...args],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    let err = "";
    child.stderr.on("data", (d) => {
      err += String(d);
    });
    child.on("error", () => {
      // fallback: PATH edge-tts
      const fallback = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] });
      let err2 = "";
      fallback.stderr.on("data", (d) => {
        err2 += String(d);
      });
      fallback.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(err2 || err || "edge-tts failed"));
      });
    });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else {
        const fallback = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] });
        let err2 = "";
        fallback.stderr.on("data", (d) => {
          err2 += String(d);
        });
        fallback.on("close", (c2) => {
          if (c2 === 0) resolve();
          else reject(new Error(err2 || err || "edge-tts failed"));
        });
      }
    });
  });

  return outPath;
}

export async function writeTextSidecar(text: string, outPath: string) {
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, text, "utf8");
}
