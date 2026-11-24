/**
 * Text Cleaner and String Similarity Utilities for Smart Song Matching
 */

export function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'");
}

export function cleanSongTitle(raw: string): string {
  if (!raw) return '';
  let title = decodeHtmlEntities(raw);

  // Strip anything after pipe '|' (e.g. "Song Name | Movie | Singer")
  if (title.includes('|')) {
    title = title.split('|')[0];
  }

  // Remove common YouTube/promotional junk in brackets
  title = title
    .replace(/\s*[\(\[]\s*(official\s*(music\s*)?video|audio|lyric(s)?|visualizer|remix|4k|hd|full\s*song|video\s*song)[\)\]]/gi, '')
    .replace(/\s*[\(\[]\s*from\s+["'][^"']+["']\s*[\)\]]/gi, '')
    .replace(/\s*-\s*from\s+["'][^"']+["']/gi, '')
    .replace(/\s*-\s*Remix/gi, ' Remix')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return title;
}

export function cleanArtistName(raw: string): string {
  if (!raw) return '';
  let artist = decodeHtmlEntities(raw);

  artist = artist
    .replace(/&/g, ', ')
    .replace(/feat\.|ft\./gi, ', ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return artist;
}

/**
 * Calculates Token Jaccard Similarity between two strings (0.0 to 1.0)
 */
export function calculateTokenSimilarity(s1: string, s2: string): number {
  const norm1 = s1.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  const norm2 = s2.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();

  if (norm1 === norm2) return 1.0;
  if (!norm1 || !norm2) return 0.0;

  const tokens1 = new Set(norm1.split(/\s+/).filter(Boolean));
  const tokens2 = new Set(norm2.split(/\s+/).filter(Boolean));

  let intersection = 0;
  for (const t of tokens1) {
    if (tokens2.has(t)) intersection++;
  }

  const union = new Set([...tokens1, ...tokens2]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Checks if key artist name tokens appear in the candidate artist string
 */
export function hasArtistOverlap(targetArtist: string, candidateArtist: string): boolean {
  const t1 = targetArtist.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter((w) => w.length > 2);
  const cand = candidateArtist.toLowerCase();

  if (t1.length === 0) return true;
  return t1.some((tok) => cand.includes(tok));
}
