# Shorty API — Daily Music Charts & Dual-Stream Resolution Service

A high-precision Node.js & TypeScript microservice that extracts daily music charts from Soundcharts (YouTube, Spotify, Gaana, etc.) and pre-resolves each song with **100% exact matches** across:
1. **JioSaavn** (for Lossless 320kbps / 16-bit FLAC audio, synchronized lyrics, and 500x500 HD cover art).
2. **YouTube** (for official Opus 160kbps audio streams and video playback).

---

## 🚀 Key Features

- **Multi-Source Extraction**: Extracts charts from Soundcharts (`YouTube India`, `Spotify India`, `Gaana Worldwide`), with a modular architecture ready for Billboard, Apple Music, Shazam, etc.
- **Smart Song Matcher**:
  - Cleans promo text, movie titles, and formatting noise.
  - Cross-verifies candidate title similarity and artist tokens.
  - Automatically matches both JioSaavn lossless audio and YouTube video streams.
- **Sub-Millisecond Response Times**: All chart queries are served from in-memory cache and persisted to disk JSON.
- **Automated Background Scheduler**: Built-in cron timer that updates charts automatically every 12–24 hours without delaying client requests.

---

## 📁 Project Structure

```
shorty-api/
├── data/                       # Local disk cache (persists resolved charts)
├── src/
│   ├── config/
│   │   └── sources.ts          # Chart URLs and provider registry (add new links here)
│   ├── extractors/
│   │   ├── base.ts             # ChartExtractor interface
│   │   ├── soundcharts.ts      # Schema.org ItemList JSON-LD extractor
│   │   └── index.ts            # Extractor registry & factory
│   ├── resolvers/
│   │   ├── jiosaavn.ts         # JioSaavn API query & Lossless stream resolver
│   │   ├── youtube.ts          # YouTube InnerTube video resolver
│   │   └── matcher.ts          # Dual-platform matcher & scoring engine
│   ├── routes/
│   │   └── charts.ts           # Express endpoints
│   ├── services/
│   │   └── chartService.ts     # In-memory cache, disk persistence & scheduler
│   ├── utils/
│   │   └── textCleaner.ts      # Fuzzy matching, token similarity, & title cleaner
│   ├── scripts/
│   │   └── runExtraction.ts    # CLI test extraction runner
│   └── server.ts               # Express server entry point
├── package.json
└── tsconfig.json
```

---

## 🛠️ Quick Start

### 1. Install Dependencies
```bash
cd shorty-api
npm install
```

### 2. Run the Development Server
```bash
npm run dev
```
The server will start at `http://localhost:4000`.

### 3. Run a Test Extraction from CLI
```bash
npm run extract
```

---

## 📡 API Endpoints

### 1. List All Available Charts
- **Endpoint**: `GET /api/charts`
- **Response**: List of charts, platforms, last updated timestamps, and current #1 tracks.

### 2. Get a Specific Chart
- **Endpoint**: `GET /api/charts/:id`
- **Examples**:
  - `GET /api/charts/spotify-india`
  - `GET /api/charts/youtube-india`
  - `GET /api/charts/gaana-worldwide`
- **Response**: Full ranked list of songs with JioSaavn & YouTube stream IDs, match scores, and HD cover art.

### 3. Refresh a Chart (On-Demand)
- **Endpoint**: `POST /api/charts/:id/refresh`
- **Query Param**: `?async=true` to run the refresh in the background.

### 4. Resolve Any Single Song (Tool Endpoint)
- **Endpoint**: `GET /api/charts/tools/resolve?title=Guzarish&artist=Satinder Sartaaj`
- **Response**: Resolves that specific song on both JioSaavn and YouTube on-demand.

---

## ➕ Adding More Links in the Future

Adding new chart URLs is as simple as adding an entry to `src/config/sources.ts`:

```typescript
{
  id: 'apple-music-india',
  name: 'Apple Music Top 100 — India',
  platform: 'apple_music',
  provider: 'soundcharts',
  url: 'https://soundcharts.com/en/charts/apple-music/india',
  country: 'IN',
  category: 'Trending Streaming',
  limit: 100,
  enabled: true,
}
```
The service will automatically extract, match, cache, and serve it at `GET /api/charts/apple-music-india`!

---

## 📱 How to Connect in Our Mobile App

In the mobile app, create a service `src/services/chartsApiService.ts`:

```typescript
const API_BASE = 'http://localhost:4000/api/charts'; // Or your deployed URL (e.g., on Render or Railway)

export async function fetchDailyChart(chartId: 'spotify-india' | 'youtube-india' | 'gaana-worldwide') {
  const res = await fetch(`${API_BASE}/${chartId}`);
  const data = await res.json();
  return data.chart?.tracks || [];
}
```
Each track returned has:
- `track.streams.saavn` (for Lossless 320kbps playback)
- `track.streams.youtube` (for video / Opus playback)
- `track.cover` (500x500 HD cover art)
- `track.matchScore` (e.g. 0.95)
