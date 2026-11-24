import { YouTubeMatch } from '../types/index.js';
import {
  calculateTokenSimilarity,
  cleanSongTitle,
  cleanArtistName,
} from '../utils/textCleaner.js';

/**
 * Major verified music record labels, distributor channels, and regional powerhouses.
 * Covers Pan-India (Hindi, Punjabi, South, Bhojpuri, Haryanvi, Bengali, Marathi, etc.)
 * and Global official music rights holders.
 */
const OFFICIAL_MUSIC_LABELS: string[] = [
  // --- Pan-India / Hindi (The Big Players & Regionals) ---
  't-series',
  'tseries',
  'super cassettes',
  't-series regional',
  't-series apna punjab',
  't-series telugu',
  't-series tamil',
  't-series kannada',
  't-series malayalam',
  't-series gujarati',
  't-series hamaarbhojpuri',
  't-series bhakti sagar',
  't-series bhavageethegalu',
  'zee music company',
  'zee music',
  'zee studios',
  'zee music south',
  'zee music kannada',
  'zee music marathi',
  'zee music devotional',
  'sony music india',
  'sony music south',
  'sonymusic',
  'sonymusicindiavevo',
  'saregama',
  'saregama music',
  'saregama tamil',
  'saregama telugu',
  'saregama kannada',
  'saregama malayalam',
  'saregama marathi',
  'saregama gujarati',
  'saregama bengali',
  'saregama hum bhojpuri',
  'saregama bhakti',
  'tips official',
  'tips industries',
  'tips music',
  'tips punjabi',
  'tips haryanvi',
  'tips marathi',
  'tips gujarati',
  'times music',
  'times music south',
  'times music spiritual',
  'times music marathi',
  'universal music india',
  'universal music',
  'warner music india',
  'warner music',
  'eros now',
  'eros now music',
  'venus worldwide',
  'venus music',
  'venus devotional',
  'shemaroo',
  'filmi gaane',
  'shemaroo bhakti',
  'shemaroo filmi gaane',
  'yash raj films',
  'yrf',
  'yrf music',
  'rajshri',
  'panorama music',
  'goldmines',
  'goldmines telefilms',
  'hungama music',
  'hungama',
  'artist aloud',
  'ultra bollywood',
  'ultra hindi',

  // --- Indie / Hip-Hop ---
  'azadi records',
  'gully gang',
  'gully gang entertainment',
  'mass appeal india',
  'mass appeal',
  'kalamkaar',

  // --- Punjabi ---
  'speed records',
  'white hill music',
  'white hill',
  'rhythm boyz',
  'rhythm boyz entertainment',
  'geet mp3',
  'desi melodies',
  'dm - desi melodies',
  'lokdhun',
  'lokdhun punjabi',
  'gold media',
  'jass records',
  'humble music',
  'saga music',
  'saga hits',
  'planet recordz',
  'fresh media records',
  'brown studios',
  'panj-aab records',
  'nav records',
  'brolli records',

  // --- Haryanvi / Rajasthani ---
  'sonotek',
  'sonotek music',
  'vr bros',
  'vr bros entertainment',
  'mor music',
  'ndee music',
  'veena music',
  'veena music rajasthani',

  // --- Bhojpuri ---
  'wave music',
  'worldwide records bhojpuri',
  'worldwide records',

  // --- Tamil ---
  'think music',
  'think music india',
  'think music tamil',
  'think music malayalam',
  'lahari music',
  'muzik247',
  'muzik247 tamil',
  'divo',
  'divo music',
  'mass audios',
  'star music india',
  'star music',
  'studio green',
  'sun tv music',
  'sun music',

  // --- Telugu ---
  'aditya music',
  'aditya music telugu',
  'mango music',
  'anand audio',
  'madhura audio',
  'volga video',
  'shreyas media',
  'millennium audios',
  'silly monks music',
  'silly monks',

  // --- Kannada ---
  'a2 music',
  'prk audio',
  'jhankar music',
  'akash audio',

  // --- Malayalam ---
  'manorama music',
  'satyam audios',
  'goodwill entertainments',
  'saina music',
  'east coast audios',
  'east coast',

  // --- Marathi ---
  'everest marathi',
  'video palace',
  'jackpot entertainment',

  // --- Gujarati ---
  'studio saraswati',
  'soor mandir',
  'soor mandir studio',
  'ekta sound',
  'ashok studio',

  // --- Bengali ---
  'eskay movies',
  'surinder films',
  'svf',
  'svf music',
  'dev entertainment',
  'dev entertainment ventures',
  'angel digital',
  'sangeet bangla',

  // --- Odia ---
  'tarang music',
  'amara muzik',
  'amara muzik odia',
  'sidharth music',
  'sarthak music',

  // --- Devotional / Spiritual ---
  'bhakti sagar',
  'shemaroo bhakti',
  'saregama bhakti',
  'zee music devotional',
  'venus devotional',
  'times music spiritual',

  // --- Distributors & Aggregators ---
  'believe',
  'believe music',
  'believe digital',
  'the orchard',
  'the orchard music',
  'the orchard enterprises',

  // --- Global Majors ---
  'def jam',
  'vevo',
  'republic records',
  'interscope',
  'atlantic records',
  'columbia records',
  'rca records',
  'island records',
  'capitol records',
  'big hit',
  'smtown',
  'jyp',
  'hybe',
  'disney music',
];

interface RawCandidate {
  videoId: string;
  title: string;
  channel: string;
  durationSec: number;
  isVerifiedArtist: boolean;
  isVerified: boolean;
}

export async function resolveYouTube(
  title: string,
  artist: string
): Promise<YouTubeMatch | null> {
  const cleanT = cleanSongTitle(title);
  const cleanA = cleanArtistName(artist);
  // Clean query without appending 'official music video' so YouTube ranks official tracks naturally
  const cleanQ = `${cleanT} ${cleanA}`.trim();

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

    const data = (await res.json()) as any;
    const candidates: RawCandidate[] = [];

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
        if (durParts.length === 2 && !isNaN(durParts[0]) && !isNaN(durParts[1])) {
          durationSec = durParts[0] * 60 + durParts[1];
        } else if (
          durParts.length === 3 &&
          !isNaN(durParts[0]) &&
          !isNaN(durParts[1]) &&
          !isNaN(durParts[2])
        ) {
          durationSec = durParts[0] * 3600 + durParts[1] * 60 + durParts[2];
        }

        // Detect verified official artist channel (music note badge)
        const isVerifiedArtist = Boolean(
          vr.ownerBadges?.some(
            (b: any) =>
              b.metadataBadgeRenderer?.style === 'BADGE_STYLE_TYPE_VERIFIED_ARTIST' ||
              b.metadataBadgeRenderer?.icon?.iconType === 'AUDIO_BADGE'
          )
        );

        // Detect verified channel (check mark badge)
        const isVerified = Boolean(
          vr.ownerBadges?.some(
            (b: any) =>
              b.metadataBadgeRenderer?.style === 'BADGE_STYLE_TYPE_VERIFIED' ||
              b.metadataBadgeRenderer?.icon?.iconType === 'CHECK_CIRCLE_THICK'
          )
        );

        candidates.push({
          videoId: vr.videoId,
          title: rawTitle,
          channel: channelName,
          durationSec,
          isVerifiedArtist,
          isVerified,
        });
      }

      for (const k of Object.keys(node)) {
        if (candidates.length >= 16) break;
        scanNodes(node[k]);
      }
    }

    scanNodes(data);

    if (candidates.length === 0) return null;

    // Normalization tokens for scoring
    const cleanTitleNorm = cleanT.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
    const cleanArtistNorm = cleanA.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
    const titleWords = cleanTitleNorm.split(/\s+/).filter((w) => w.length > 1);
    const artistWords = cleanArtistNorm.split(/\s+/).filter((w) => w.length > 2);

    let bestMatch: YouTubeMatch | null = null;
    let highestScore = -999;

    for (const cand of candidates) {
      const candTitleLow = cand.title.toLowerCase();
      const candChanLow = cand.channel.toLowerCase();

      let score = 0;

      // 1. Title match (0 to 0.40)
      const hasAllTitleWords =
        titleWords.length > 0 && titleWords.every((w) => candTitleLow.includes(w));
      if (hasAllTitleWords) {
        score += 0.40;
      } else {
        const titleSim = calculateTokenSimilarity(cleanTitleNorm, candTitleLow);
        score += titleSim * 0.25;
      }

      // 2. Channel & Artist authenticity (0 to 0.50)
      const isOfficialLabel = OFFICIAL_MUSIC_LABELS.some((lbl) =>
        candChanLow.includes(lbl)
      );
      const isTopicChannel =
        candChanLow.endsWith('- topic') || candChanLow.includes('topic');
      const artistInChannel = artistWords.some((tok) => candChanLow.includes(tok));
      const artistInTitle = artistWords.some((tok) => candTitleLow.includes(tok));

      if (isOfficialLabel) {
        // High priority for official record labels (T-Series, Sony, Zee, Saregama, etc.)
        score += 0.45;
      } else if (cand.isVerifiedArtist && artistInChannel) {
        // High priority for verified official artist channel
        score += 0.50;
      } else if (isTopicChannel && artistInChannel) {
        // Official YouTube Music auto-generated audio release
        score += 0.45;
      } else if (cand.isVerifiedArtist) {
        score += 0.25;
      } else if (artistInChannel) {
        score += 0.25;
      } else if (cand.isVerified) {
        score += 0.10;
      }

      if (artistInTitle) {
        score += 0.10;
      }

      // 3. Official video/audio indicators (+0.15)
      if (
        candTitleLow.includes('official video') ||
        candTitleLow.includes('official music video') ||
        candTitleLow.includes('official audio') ||
        candTitleLow.includes('original sound') ||
        candTitleLow.includes('full song')
      ) {
        score += 0.15;
      }

      // 4. Heavy penalties for fan re-uploads, slowed, covers, reaction videos
      if (candTitleLow.includes('slowed') || candTitleLow.includes('reverb')) score -= 0.70;
      if (candTitleLow.includes('cover') || candTitleLow.includes('parody') || candTitleLow.includes('fan made')) score -= 0.60;
      if (candTitleLow.includes('karaoke') || candTitleLow.includes('instrumental') || candTitleLow.includes('bgm') || candTitleLow.includes('ringtone')) score -= 0.70;
      if (candTitleLow.includes('reaction') || candTitleLow.includes('review') || candTitleLow.includes('1 hour') || candTitleLow.includes('loop')) score -= 0.80;
      if (candTitleLow.includes('status') || candTitleLow.includes('shorts') || candTitleLow.includes('sped up') || candTitleLow.includes('nightcore') || candTitleLow.includes('bass boost') || candTitleLow.includes('8d')) score -= 0.60;
      if (candTitleLow.includes('dance cover') || candTitleLow.includes('choreography')) score -= 0.60;

      // Penalize lyrical/lyrics videos unless from official label or verified artist
      if (candTitleLow.includes('lyrics') || candTitleLow.includes('lyrical')) {
        if (!isOfficialLabel && !cand.isVerifiedArtist) {
          score -= 0.50;
        } else {
          score -= 0.05; // Slightly prefer music video over lyrical even on official channel
        }
      }

      // Duration sanity check: reject shorts/teasers (< 60s) or compilation/interviews (> 600s)
      if (cand.durationSec < 60) score -= 0.60;
      if (cand.durationSec > 600) score -= 0.60;

      if (score > highestScore && score >= 0.35) {
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
