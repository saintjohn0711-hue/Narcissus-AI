# Narcissus web (MVP)

Next.js studio UI for adult likeness-preserving image jobs on Runpod ComfyUI.

## Run locally

```bash
cd /agent/narcissus-web
npm install
npm run dev
```

Open http://localhost:3000

## Env

Set in `.env.local` / Vercel:

| Var | Purpose |
| --- | --- |
| `COMFYUI_BASE_URL` | ComfyUI proxy (no trailing slash) |
| `AI_GATEWAY_API_KEY` | Vercel AI Gateway — enables Grok-quality Art of X scene writer + looks vision |
| `OPENAI_API_KEY` | Fallback if Gateway key is absent |
| `SCENE_MODEL` | Optional override (Gateway default: `spacexai/grok-4.20-non-reasoning`) |
| `LOOKS_VISION_MODEL` | Optional looks-vision model override |

Without an LLM key, Scene builder uses richer **local** craft (partner looks / dynamics / kinks) instead of thin templates.

## API

`POST /api/jobs` (multipart):

| Field | Value |
| --- | --- |
| `photo` | image file |
| `mode` | `faceswap` \| `undress` |
| `adultsConfirmed` | `true` |

Uploads to ComfyUI, runs img2img, returns `{ status, promptId, resultUrl, … }`.

## Status

- Adult gate + upload + modes wired to live ComfyUI on Runpod.
- Phase 1 engine: SD 1.5 img2img (Reactor / undress LoRAs next).
- Stop the ComfyUI Pod when idle — it bills while running.
