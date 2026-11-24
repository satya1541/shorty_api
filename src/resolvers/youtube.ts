import { YouTubeMatch } from '../types/index.js';
import {
  calculateTokenSimilarity,
  hasArtistOverlap,
  cleanSongTitle,
} from '../utils/textCleaner.js';

export async function resolveYouTube(
  title: string,
  artist: string
): Promise<YouTubeMatch | null> {
  const cleanQ = `${cleanSongTitle(title)} ${artist} official music video`.trim();

  try {
    const res = await fetch('https://www.youtube.com/youtubei/v1/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: 'WEB',
            clientVersion: '2.20240101.01.00',
            hl: 'en',
            gl: 'IN',
          },
        },
        query: cleanQ,
        params: 'EgIQAQ%3D%3D', // Videos only
      }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const candidates: Array<{ videoId: string; title: string; channel: string; durationSec: number }> = [];

    function scanNodes(node: any) {
      if (!node || typeof node !== 'object') return;
      if (node.videoRenderer?.videoId) {
        const vr = node.videoRenderer;
        const rawTitle = vr.title?.runs?.[0]?.text || vr.title?.simpleText || '';
        const channelName =
          vr.ownerText?.runs?.[0]?.text || vr.shortBylineText?.runs?.[0]?.text || '';
        const durText = vr.lengthText?.simpleText || '3:30';

        const durParts = durText.split(':').map((p: string) => parseInt(p, 10));
        let durationSec = 210;
        if (durParts.length === 2) {
          durationSec = durParts[0] * 60 + durParts[1];
        } else if (durParts.length === 3) {
          durationSec = durParts[0] * 3600 + durParts[1] * 60 + durParts[2];
        }

        candidates.push({
          videoId: vr.videoId,
          title: rawTitle,
          channel: channelName,
          durationSec,
        });
      }

      for (const k of Object.keys(node)) {
        if (candidates.length >= 8) break;
        scanNodes(node[k]);
      }
    }

    scanNodes(data);

    if (candidates.length === 0) return null;

    let bestMatch: YouTubeMatch | null = null;
    let highestScore = 0;

    for (const cand of candidates) {
      const titleSim = calculateTokenSimilarity(title, cand.title);
      const artistMatches = hasArtistOverlap(artist, cand.channel) || hasArtistOverlap(artist, cand.title);

      let score = titleSim * 0.6 + (artistMatches ? 0.4 : 0);

      // Penalize reaction, shorts, 1 hour loop, parody videos
      const lowTitle = cand.title.toLowerCase();
      if (lowTitle.includes('reaction') || lowTitle.includes('1 hour') || lowTitle.includes('loop')) {
        score -= 0.5;
      }

      if (score > highestScore && score >= 0.4) {
        highestScore = score;
        bestMatch = {
          videoId: cand.videoId,
          name: cand.title,
          channelName: cand.channel,
          duration: cand.durationSec,
          thumbnail: `https://i.ytimg.com/vi/${cand.videoId}/hqdefault.jpg`,
          streamUrl: `https://www.youtube.com/watch?v=${cand.videoId}`,
          quality: 'Opus 160kbps',
          score: Math.min(1.0, Math.max(0, score)),
        };
      }
    }

    return bestMatch;
  } catch (err: any) {
    console.warn(`[YouTubeResolver] Error resolving "${title} - ${artist}":`, err.message);
    return null;
  }
}
