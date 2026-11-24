import { ChartExtractor } from './base.js';
import { ChartSourceConfig, RawChartItem } from '../types/index.js';
import { cleanSongTitle, cleanArtistName } from '../utils/textCleaner.js';

export class SoundchartsExtractor implements ChartExtractor {
  readonly name = 'soundcharts';

  canHandle(config: ChartSourceConfig): boolean {
    return config.provider === 'soundcharts' || config.url.includes('soundcharts.com');
  }

  async extract(config: ChartSourceConfig): Promise<RawChartItem[]> {
    const items: RawChartItem[] = [];

    try {
      const res = await fetch(config.url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}: ${res.statusText}`);
      }

      const html = await res.text();
      const regex = /<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi;
      let match;

      while ((match = regex.exec(html)) !== null) {
        try {
          const parsed = JSON.parse(match[1]);
          if (parsed['@type'] === 'ItemList' && Array.isArray(parsed.itemListElement)) {
            for (const entry of parsed.itemListElement) {
              const rec = entry.item;
              if (rec && rec.name) {
                const rank = typeof entry.position === 'number' ? entry.position : items.length + 1;
                const rawTitle = rec.name;
                const rawArtist = rec.byArtist?.name || 'Unknown Artist';

                items.push({
                  rank,
                  title: cleanSongTitle(rawTitle),
                  artist: cleanArtistName(rawArtist),
                  externalUrl: rec.url ? `https://soundcharts.com${rec.url}` : undefined,
                });

                if (config.limit && items.length >= config.limit) {
                  break;
                }
              }
            }
          }
        } catch {
          // Skip non-ItemList json-ld blocks
        }
      }

      console.log(`[SoundchartsExtractor] Extracted ${items.length} tracks from ${config.name}`);
    } catch (err: any) {
      console.error(`[SoundchartsExtractor] Failed to extract ${config.url}:`, err.message);
    }

    return items;
  }
}
