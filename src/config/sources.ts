import { ChartSourceConfig } from '../types/index.js';

export const CHART_SOURCES: ChartSourceConfig[] = [
  {
    id: 'youtube-india',
    name: 'YouTube Top 100 — India',
    platform: 'youtube',
    provider: 'soundcharts',
    url: 'https://soundcharts.com/en/charts/youtube/india',
    country: 'IN',
    category: 'Trending Videos & Songs',
    description: 'Official YouTube weekly trending songs across India',
    limit: 100,
    enabled: true,
  },
  {
    id: 'spotify-india',
    name: 'Spotify Top 100 — India',
    platform: 'spotify',
    provider: 'soundcharts',
    url: 'https://soundcharts.com/en/charts/spotify/india',
    country: 'IN',
    category: 'Top Viral Hits',
    description: 'Most streamed songs on Spotify India daily charts',
    limit: 100,
    enabled: true,
  },
  {
    id: 'gaana-worldwide',
    name: 'Gaana Top Charts — Worldwide',
    platform: 'gaana',
    provider: 'soundcharts',
    url: 'https://soundcharts.com/en/charts/gaana/worldwide',
    country: 'GLOBAL',
    category: 'Bollywood & Classics',
    description: 'Top trending Bollywood and regional hits on Gaana',
    limit: 50,
    enabled: true,
  },
];

export function getSourceById(id: string): ChartSourceConfig | undefined {
  return CHART_SOURCES.find((s) => s.id === id);
}

export function getAllSources(): ChartSourceConfig[] {
  return CHART_SOURCES.filter((s) => s.enabled);
}
