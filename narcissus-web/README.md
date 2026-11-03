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

Copy `.env.example` → `.env.local` and set `COMFYUI_BASE_URL` to the ComfyUI proxy (no trailing slash).

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
