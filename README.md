# threads-it-carousel

IT news → Instagram / Threads carousel generator — 1080×1350 PNG via satori + sharp.

Dikurasi dari **Hacker News** & **Dev.to**. Pilih berita → generate carousel (cover + points + closing) → preview & ZIP download.

## Stack

- Next.js 16 (App Router) + React 19 + Tailwind CSS v4
- satori + @resvg/resvg-js + sharp — render 1080×1350 PNG
- rss-parser (Dev.to) + Hacker News Firebase API
- jszip + file-saver — ZIP download

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Scripts

- `npm run dev` — dev server (Turbopack)
- `npm run build` — production build
- `npm run lint` — eslint
- `npm start` — production server

## API

- `GET /api/news?limit=6&source=all|hacker-news|dev-to` → `{ success, count, data: ITNews[] }`
- `POST /api/render` body `{ slides: RenderSlide[], theme }` → `{ success, slides: base64[] }`

## Fonts

`public/fonts/Inter-Regular.ttf` (+ `Inter-Bold.woff` fallback) — used by satori at 400/700/800.

## Deploy

Vercel forbidden — deploy target TBD.

Built by [@reyonlau_](https://github.com/Reyonl)
