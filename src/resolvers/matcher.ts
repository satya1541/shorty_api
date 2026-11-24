import { RawChartItem, ResolvedChartTrack, PlatformType } from '../types/index.js';
import { resolveJioSaavn } from './jiosaavn.js';
import { resolveYouTube } from './youtube.js';

export async function matchAndResolveTrack(
  item: RawChartItem,
  platform: PlatformType
): Promise<ResolvedChartTrack> {
  // Query both platforms concurrently for maximum speed
  const [saavnMatch, ytMatch] = await Promise.all([
    resolveJioSaavn(item.title, item.artist),
    resolveYouTube(item.title, item.artist),
  ]);

  // Determine best title & artist display
  // Prioritize clean metadata from JioSaavn or original chart item; avoid raw YouTube video title noise
  const title = saavnMatch?.name || item.title;
  const artist = saavnMatch?.artist || item.artist;
  const album = saavnMatch?.album || (platform ? `${platform.toUpperCase()} Top Chart` : 'Top Chart');

  // Cover priority: JioSaavn 500x500 HD > YouTube HQ Thumbnail > Soundcharts cover > placeholder
  const cover =
    saavnMatch?.cover ||
    ytMatch?.thumbnail ||
    item.coverUrl ||
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80';

  const duration = saavnMatch?.duration || ytMatch?.duration || 210;

  // Calculate overall match score
  const saavnScore = saavnMatch?.score || 0;
  const ytScore = ytMatch?.score || 0;
  const matchScore = Math.max(saavnScore, ytScore);

  // Preference: Saavn has Lossless 320kbps + lyrics, so prefer Saavn if matched with good score
  const preferredSource = saavnMatch && saavnScore >= 0.5 ? 'jiosaavn' : 'youtube';

  return {
    rank: item.rank,
    originalTitle: item.title,
    originalArtist: item.artist,
    title,
    artist,
    album,
    cover,
    duration,
    matchScore: Math.round(matchScore * 100) / 100,
    platform,
    streams: {
      saavn: saavnMatch || undefined,
      youtube: ytMatch || undefined,
    },
    preferredSource,
  };
}
