export type ComfyImageRef = {
  filename: string;
  subfolder: string;
  type: "input" | "output" | "temp";
};

export type ComfyJobResult = {
  promptId: string;
  images: ComfyImageRef[];
  viewUrls: string[];
};

function baseUrl(): string {
  const url = process.env.COMFYUI_BASE_URL?.replace(/\/$/, "");
  if (!url) throw new Error("COMFYUI_BASE_URL is not set");
  return url;
}

export function isComfyConfigured(): boolean {
  return Boolean(process.env.COMFYUI_BASE_URL?.trim());
}

export async function uploadImage(
  file: File | Blob,
  filename: string,
): Promise<ComfyImageRef> {
  const body = new FormData();
  body.set("image", file, filename);
  body.set("overwrite", "true");
  const res = await fetch(`${baseUrl()}/upload/image`, {
    method: "POST",
    body,
  });
  if (!res.ok) {
    throw new Error(`ComfyUI upload failed (${res.status})`);
  }
  const data = (await res.json()) as {
    name: string;
    subfolder?: string;
    type?: string;
  };
  return {
    filename: data.name,
    subfolder: data.subfolder || "",
    type: (data.type as ComfyImageRef["type"]) || "input",
  };
}

export async function queuePrompt(
  prompt: Record<string, unknown>,
  clientId = "narcissus-web",
): Promise<string> {
  const res = await fetch(`${baseUrl()}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, client_id: clientId }),
  });
  const data = await res.json();
  if (!res.ok) {
    const msg =
      data?.error?.message ||
      data?.error ||
      `ComfyUI prompt failed (${res.status})`;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  if (!data.prompt_id) {
    throw new Error("ComfyUI did not return prompt_id");
  }
  return data.prompt_id as string;
}

type HistoryEntry = {
  outputs?: Record<
    string,
    {
      images?: Array<{
        filename: string;
        subfolder?: string;
        type?: string;
      }>;
    }
  >;
  status?: { completed?: boolean; status_str?: string };
};

export async function waitForPrompt(
  promptId: string,
  {
    timeoutMs = 180_000,
    intervalMs = 1500,
  }: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<ComfyImageRef[]> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await fetch(`${baseUrl()}/history/${promptId}`);
    if (!res.ok) {
      throw new Error(`ComfyUI history failed (${res.status})`);
    }
    const hist = (await res.json()) as Record<string, HistoryEntry>;
    const entry = hist[promptId];
    if (entry?.outputs) {
      const images: ComfyImageRef[] = [];
      for (const node of Object.values(entry.outputs)) {
        for (const img of node.images || []) {
          images.push({
            filename: img.filename,
            subfolder: img.subfolder || "",
            type: (img.type as ComfyImageRef["type"]) || "output",
          });
        }
      }
      if (images.length) return images;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("Timed out waiting for ComfyUI job");
}

export function viewUrl(image: ComfyImageRef): string {
  const params = new URLSearchParams({
    filename: image.filename,
    subfolder: image.subfolder,
    type: image.type,
  });
  return `${baseUrl()}/view?${params.toString()}`;
}

export async function runPromptToImages(
  prompt: Record<string, unknown>,
): Promise<ComfyJobResult> {
  const promptId = await queuePrompt(prompt);
  const images = await waitForPrompt(promptId);
  return {
    promptId,
    images,
    viewUrls: images.map(viewUrl),
  };
}
