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

Set locally in `.env.local` (or on Vercel for `narcissus-ai`):

| Variable | Purpose |
| --- | --- |
| `COMFYUI_BASE_URL` | ComfyUI proxy (no trailing slash) |
| `XAI_API_KEY` | xAI Grok for Art of X partner chat (`/art-of-x/chat`) |
| `XAI_MODEL` | Optional; defaults to `grok-4.7` |

**Grok key:** https://console.x.ai/ → API keys → add `XAI_API_KEY` on the Vercel project (Production + Preview). Without it, chat returns “Add XAI_API_KEY”.

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
