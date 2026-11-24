import { ChartExtractor } from './base.js';
import { ChartSourceConfig, RawChartItem } from '../types/index.js';
import { cleanSongTitle, cleanArtistName } from '../utils/textCleaner.js';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export class AppleMusicExtractor implements ChartExtractor {
  readonly name = 'apple_music';

  canHandle(config: ChartSourceConfig): boolean {
    return config.provider === 'apple_music' || config.url.includes('music.apple.com');
  }

  async extract(config: ChartSourceConfig): Promise<RawChartItem[]> {
    const isMultiPlaylistPage = config.url.includes('/new/top-charts/playlists');

    if (isMultiPlaylistPage) {
      return this.extractFromMultiPlaylistPage(config);
    }

    const isDirectPlaylist = config.url.includes('/playlist/');
    if (isDirectPlaylist) {
      return this.extractFromPlaylistPage(config.url, config.limit);
    }

    // Direct chart pages (songs, albums, music-videos)
    return this.extractFromChartPage(config.url, config.limit);
  }

  /**
   * Extracts tracks directly from a single Apple Music playlist page.
   */
  private async extractFromPlaylistPage(url: string, limit: number = 100): Promise<RawChartItem[]> {
    const items: RawChartItem[] = [];

    try {
      const json = await this.fetchSerializedServerData(url);
      if (!json) return items;

      const seenKeys = new Set<string>();

      const searchTracks = (node: any) => {
        if (!node || typeof node !== 'object') return;

        if (node.title && (node.artistName || node.subtitleLinks)) {
          const isSong =
            node.contentDescriptor?.kind === 'song' ||
            node.itemKind === 'trackLockup' ||
            node.trackNumber !== undefined ||
            (typeof node.artistName === 'string' && node.artistName !== 'Apple Music');

          if (isSong) {
            const rawTitle = node.title;
            const rawArtist =
              node.artistName ||
              (Array.isArray(node.subtitleLinks)
                ? node.subtitleLinks.map((s: any) => s.title).join(', ')
                : 'Unknown Artist');

            const key = `${rawTitle.toLowerCase()}-${rawArtist.toLowerCase()}`;
            if (!seenKeys.has(key)) {
              seenKeys.add(key);

              const artworkUrl = node.artwork?.dictionary?.url
                ?.replace('{w}', '600')
                ?.replace('{h}', '600')
                ?.replace('{f}', 'jpg');

              items.push({
                rank: items.length + 1,
                title: cleanSongTitle(rawTitle),
                artist: cleanArtistName(rawArtist),
                coverUrl: artworkUrl,
                externalUrl: node.contentDescriptor?.url,
              });

              if (items.length >= limit) return;
            }
          }
        }

        for (const key of Object.keys(node)) {
          if (items.length >= limit) break;
          searchTracks(node[key]);
        }
      };

      searchTracks(json);
      console.log(`[AppleMusicExtractor] Extracted ${items.length} tracks from playlist: ${url}`);
    } catch (err: any) {
      console.error(`[AppleMusicExtractor] Failed to extract playlist ${url}:`, err.message);
    }

    return items;
  }

  /**
   * Extracts tracks from chart pages: songs, albums, and music-videos.
   */
  private async extractFromChartPage(url: string, limit: number = 100): Promise<RawChartItem[]> {
    const items: RawChartItem[] = [];

    try {
      const json = await this.fetchSerializedServerData(url);
      if (!json) return items;

      const root = Array.isArray(json) ? json[0] : (json.data ? json.data[0] : json);
      const sections = root?.data?.sections || [];

      for (const sec of sections) {
        if (!Array.isArray(sec.items)) continue;

        for (const item of sec.items) {
          const rawTitle = item.title || item.titleLinks?.[0]?.title;
          const rawArtist =
            item.artistName ||
            (Array.isArray(item.subtitleLinks)
              ? item.subtitleLinks.map((s: any) => s.title).join(', ')
              : item.description) ||
            'Various Artists';

          if (!rawTitle) continue;

          const artworkUrl = item.artwork?.dictionary?.url
            ?.replace('{w}', '600')
            ?.replace('{h}', '600')
            ?.replace('{f}', 'jpg');

          const externalUrl = item.contentDescriptor?.url || item.destination?.url;

          items.push({
            rank: items.length + 1,
            title: cleanSongTitle(rawTitle),
            artist: cleanArtistName(rawArtist),
            coverUrl: artworkUrl,
            externalUrl,
          });

          if (items.length >= limit) break;
        }

        if (items.length >= limit) break;
      }

      console.log(`[AppleMusicExtractor] Extracted ${items.length} items from chart: ${url}`);
    } catch (err: any) {
      console.error(`[AppleMusicExtractor] Failed to extract chart ${url}:`, err.message);
    }

    return items;
  }

  /**
   * Special handler for https://music.apple.com/in/new/top-charts/playlists.
   * This page lists featured playlists, so we parse the playlists on this page
   * and extract top tracks from inside those playlists.
   */
  private async extractFromMultiPlaylistPage(config: ChartSourceConfig): Promise<RawChartItem[]> {
    const limit = config.limit || 50;
    const aggregatedItems: RawChartItem[] = [];
    const seenSongs = new Set<string>();

    try {
      const json = await this.fetchSerializedServerData(config.url);
      if (!json) return aggregatedItems;

      const root = Array.isArray(json) ? json[0] : (json.data ? json.data[0] : json);
      const sections = root?.data?.sections || [];

      // Discover playlist URLs on this page
      const playlistUrls: { title: string; url: string }[] = [];
      for (const sec of sections) {
        if (!Array.isArray(sec.items)) continue;
        for (const item of sec.items) {
          const pUrl =
            item.contentDescriptor?.url ||
            item.destination?.url ||
            item.segue?.destination?.contentDescriptor?.url;
          const title = item.titleLinks?.[0]?.title || item.title;
          if (pUrl && pUrl.includes('/playlist/')) {
            playlistUrls.push({ title, url: pUrl });
          }
        }
      }

      console.log(
        `[AppleMusicExtractor] Found ${playlistUrls.length} playlists on multi-playlist chart page. Extracting tracks from top playlists...`
      );

      // Extract tracks from the top playlists until limit is reached
      for (const p of playlistUrls.slice(0, 8)) {
        if (aggregatedItems.length >= limit) break;

        const playlistTracks = await this.extractFromPlaylistPage(p.url, 25);
        for (const track of playlistTracks) {
          const key = `${track.title.toLowerCase()}-${track.artist.toLowerCase()}`;
          if (!seenSongs.has(key)) {
            seenSongs.add(key);
            aggregatedItems.push({
              ...track,
              rank: aggregatedItems.length + 1,
            });

            if (aggregatedItems.length >= limit) break;
          }
        }
      }

      console.log(
        `[AppleMusicExtractor] Aggregated ${aggregatedItems.length} unique tracks from inside top playlists.`
      );
    } catch (err: any) {
      console.error(
        `[AppleMusicExtractor] Failed to extract from multi-playlist page ${config.url}:`,
        err.message
      );
    }

    return aggregatedItems;
  }

  /**
   * Fetches the page and extracts JSON from <script id="serialized-server-data">.
   */
  private async fetchSerializedServerData(url: string): Promise<any | null> {
    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'en-US,en;q=0.9',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}: ${res.statusText}`);
    }

    const html = await res.text();
    const match = html.match(/<script[^>]*id=["']serialized-server-data["'][^>]*>([\s\S]*?)<\/script>/i);
    if (!match || !match[1]) {
      throw new Error('Serialized server data script tag not found');
    }

    return JSON.parse(match[1]);
  }
}
