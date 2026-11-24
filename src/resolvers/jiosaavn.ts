import { JioSaavnMatch } from '../types/index.js';
import {
  decodeHtmlEntities,
  calculateTokenSimilarity,
  hasArtistOverlap,
  cleanSongTitle,
} from '../utils/textCleaner.js';

export async function resolveJioSaavn(
  title: string,
  artist: string
): Promise<JioSaavnMatch | null> {
  const cleanQ = `${cleanSongTitle(title)} ${artist}`.trim();
  const url = `https://www.jiosaavn.com/api.php?__call=search.getResults&_format=json&_marker=0&api_version=4&ctx=web6dot0&q=${encodeURIComponent(cleanQ)}&p=1&n=6`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!res.ok) return null;

    const data = (await res.json()) as any;
    const results = data?.results || [];
    if (!Array.isArray(results) || results.length === 0) return null;

    let bestMatch: JioSaavnMatch | null = null;
    let highestScore = 0;

    for (const item of results) {
      const candidateTitle = decodeHtmlEntities(item.song || item.title || '');
      const candidateArtist = decodeHtmlEntities(item.singers || item.primary_artists || item.artist || '');
      const candidateAlbum = decodeHtmlEntities(item.album || '');

      const titleSim = calculateTokenSimilarity(title, candidateTitle);
      const artistMatches = hasArtistOverlap(artist, candidateArtist);

      // Score formula: 60% title similarity, 40% artist match bonus
      let score = titleSim * 0.65 + (artistMatches ? 0.35 : 0);

      // Penalty for live or karaoke versions if not in original query
      const candLower = candidateTitle.toLowerCase();
      if ((candLower.includes('karaoke') || candLower.includes('tribute')) && !title.toLowerCase().includes('karaoke')) {
        score -= 0.4;
      }

      if (score > highestScore && score >= 0.45) {
        highestScore = score;

        // Upgrade 150x150 cover to 500x500 crystal clear HD
        let cover = item.image || '';
        if (cover) {
          cover = cover.replace(/150x150/g, '500x500').replace(/50x50/g, '500x500');
        }

        const duration = parseInt(item.duration, 10) || 210;

        bestMatch = {
          id: item.id,
          name: candidateTitle,
          artist: candidateArtist,
          album: candidateAlbum,
          duration,
          cover,
          mediaUrl: item.encrypted_media_url,
          quality: 'Lossless',
          hasLyrics: Boolean(item.has_lyrics === 'true' || item.has_lyrics === true),
          score: Math.min(1.0, Math.max(0, score)),
        };
      }
    }

    return bestMatch;
  } catch (err: any) {
    console.warn(`[JioSaavnResolver] Error resolving "${title} - ${artist}":`, err.message);
    return null;
  }
}
