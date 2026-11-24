export type PlatformType = 'youtube' | 'spotify' | 'gaana' | 'apple_music' | 'billboard';
export type ProviderType = 'soundcharts' | 'kworb' | 'custom';

export interface ChartSourceConfig {
  id: string;                      // Unique ID (e.g., 'youtube-india', 'spotify-india')
  name: string;                    // Display name (e.g., 'YouTube Top 100 - India')
  platform: PlatformType;          // Target platform badge
  provider: ProviderType;          // Scraper/extractor provider
  url: string;                     // Extraction URL
  country?: string;                // Country code (e.g., 'IN', 'GLOBAL')
  category?: string;               // Music category
  description?: string;            // Brief description
  limit?: number;                  // Number of tracks to extract (default 50-100)
  enabled: boolean;                // Whether to auto-extract
}

export interface RawChartItem {
  rank: number;
  title: string;
  artist: string;
  coverUrl?: string;
  externalUrl?: string;
}

export interface JioSaavnMatch {
  id: string;
  name: string;
  artist: string;
  album: string;
  duration: number;
  cover: string;
  streamUrl?: string;
  mediaUrl?: string;
  quality: 'Lossless' | '320kbps' | '160kbps';
  hasLyrics: boolean;
  score: number;                   // Match confidence 0.0 - 1.0
}

export interface YouTubeMatch {
  videoId: string;
  name: string;
  channelName: string;
  duration: number;
  thumbnail: string;
  streamUrl: string;
  quality: 'Opus 160kbps' | 'M4A';
  score: number;                   // Match confidence 0.0 - 1.0
}

export interface ResolvedChartTrack {
  rank: number;
  originalTitle: string;
  originalArtist: string;
  title: string;
  artist: string;
  album: string;
  cover: string;
  duration: number;
  matchScore: number;              // Overall match score
  platform: PlatformType;
  streams: {
    saavn?: JioSaavnMatch;
    youtube?: YouTubeMatch;
  };
  preferredSource: 'jiosaavn' | 'youtube';
}

export interface ChartPayload {
  id: string;
  name: string;
  platform: PlatformType;
  country?: string;
  lastUpdated: string;
  totalTracks: number;
  sourceUrl: string;
  tracks: ResolvedChartTrack[];
}

export interface ChartSummary {
  id: string;
  name: string;
  platform: PlatformType;
  country?: string;
  totalTracks: number;
  lastUpdated: string;
  topTrack?: {
    rank: number;
    title: string;
    artist: string;
    cover: string;
  };
}
