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
| `XAI_API_KEY` | xAI Grok for Art of X partner chat + Stories scene writer |
| `XAI_MODEL` | Optional; defaults to `grok-4.7` |
| `AI_GATEWAY_API_KEY` | Vercel AI Gateway — enables looks vision (+ optional OpenAI-compat paths via `llmConfig`) |
| `OPENAI_API_KEY` | Fallback if Gateway key is absent |
| `SCENE_MODEL` | Optional override for Gateway-backed scene/looks helpers |
| `LOOKS_VISION_MODEL` | Optional looks-vision model override |

**Grok key:** https://console.x.ai/ → API keys → add `XAI_API_KEY` on the Vercel project (Production + Preview). Without it, chat/Stories LLM returns missing-key; client falls back to local craft where supported.

Without a Gateway/OpenAI key, describe-looks stays unavailable; Scene builder still uses local craft when the LLM path is down.

**Muse chat voice:** Companion chat narrates Muse replies with the browser Web Speech API (per-Muse female/male, accent/locale, + delivery preset). Voice panel collapses like Memories/Ribbons. No TTS secret required. Studio Say-This still uses local Edge-TTS on Comfy hosts. OpenAI/ElevenLabs chat TTS is an optional upgrade when those keys are intentionally provisioned.

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
