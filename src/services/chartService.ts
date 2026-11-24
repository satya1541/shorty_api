import fs from 'node:fs';
import path from 'node:path';
import { ChartPayload, ChartSummary, ChartSourceConfig } from '../types/index.js';
import { CHART_SOURCES, getSourceById, getAllSources } from '../config/sources.js';
import { getExtractor } from '../extractors/index.js';
import { matchAndResolveTrack } from '../resolvers/matcher.js';

export class ChartService {
  private cache = new Map<string, ChartPayload>();
  private dataDir: string;
  private isRefreshing = new Map<string, boolean>();

  constructor(dataDir: string = './data') {
    this.dataDir = path.resolve(dataDir);
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    this.loadFromDisk();
  }

  /**
   * Hydrate in-memory cache from persisted JSON files on disk
   */
  private loadFromDisk(): void {
    for (const source of CHART_SOURCES) {
      const filePath = path.join(this.dataDir, `${source.id}.json`);
      if (fs.existsSync(filePath)) {
        try {
          const raw = fs.readFileSync(filePath, 'utf-8');
          const payload = JSON.parse(raw) as ChartPayload;
          this.cache.set(source.id, payload);
          console.log(`[ChartService] Loaded ${payload.tracks.length} tracks for ${source.id} from disk`);
        } catch (err: any) {
          console.warn(`[ChartService] Failed to parse disk cache for ${source.id}:`, err.message);
        }
      }
    }
  }

  /**
   * Persist a chart to disk
   */
  private saveToDisk(sourceId: string, payload: ChartPayload): void {
    try {
      const filePath = path.join(this.dataDir, `${sourceId}.json`);
      fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
    } catch (err: any) {
      console.error(`[ChartService] Failed to save ${sourceId} to disk:`, err.message);
    }
  }

  /**
   * Get pre-resolved chart from in-memory cache (<1ms response time)
   */
  getChart(sourceId: string): ChartPayload | undefined {
    return this.cache.get(sourceId);
  }

  /**
   * Get all cached charts
   */
  getAllCharts(): ChartPayload[] {
    return Array.from(this.cache.values());
  }

  /**
   * Returns metadata summaries of all available charts for app tabs/carousels
   */
  getSummaries(): ChartSummary[] {
    return getAllSources().map((source) => {
      const cached = this.cache.get(source.id);
      const topTrack = cached?.tracks?.[0]
        ? {
            rank: 1,
            title: cached.tracks[0].title,
            artist: cached.tracks[0].artist,
            cover: cached.tracks[0].cover,
          }
        : undefined;

      return {
        id: source.id,
        name: source.name,
        platform: source.platform,
        country: source.country,
        totalTracks: cached?.tracks?.length || 0,
        lastUpdated: cached?.lastUpdated || 'Never',
        topTrack,
      };
    });
  }

  /**
   * Extracts and resolves a specific chart with controlled concurrency
   */
  async refreshChart(sourceId: string): Promise<ChartPayload> {
    if (this.isRefreshing.get(sourceId)) {
      console.log(`[ChartService] Chart ${sourceId} is already refreshing. Waiting for existing job...`);
      return this.cache.get(sourceId) || this.createEmptyPayload(sourceId);
    }

    const source = getSourceById(sourceId);
    if (!source) {
      throw new Error(`Unknown chart source ID: ${sourceId}`);
    }

    this.isRefreshing.set(sourceId, true);
    console.log(`[ChartService] >>> Starting refresh for ${source.name}...`);

    try {
      // 1. Extract raw items using registered extractor
      const extractor = getExtractor(source);
      const rawItems = await extractor.extract(source);

      if (rawItems.length === 0) {
        console.warn(`[ChartService] No tracks extracted for ${sourceId}. Keeping existing cache.`);
        return this.cache.get(sourceId) || this.createEmptyPayload(sourceId);
      }

      // 2. Resolve tracks against JioSaavn & YouTube in batches to avoid rate limits
      const resolvedTracks: ChartPayload['tracks'] = [];
      const BATCH_SIZE = 4;

      for (let i = 0; i < rawItems.length; i += BATCH_SIZE) {
        const batch = rawItems.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(
          batch.map((item) => matchAndResolveTrack(item, source.platform))
        );
        resolvedTracks.push(...results);
        console.log(`[ChartService] [${sourceId}] Resolved ${resolvedTracks.length}/${rawItems.length} tracks...`);
      }

      const payload: ChartPayload = {
        id: source.id,
        name: source.name,
        platform: source.platform,
        country: source.country,
        lastUpdated: new Date().toISOString(),
        totalTracks: resolvedTracks.length,
        sourceUrl: source.url,
        tracks: resolvedTracks,
      };

      // 3. Cache & Persist
      this.cache.set(source.id, payload);
      this.saveToDisk(source.id, payload);
      console.log(`[ChartService] <<< Successfully refreshed ${sourceId} (${resolvedTracks.length} tracks)`);

      return payload;
    } finally {
      this.isRefreshing.set(sourceId, false);
    }
  }

  /**
   * Refresh all enabled chart sources
   */
  async refreshAll(): Promise<void> {
    const sources = getAllSources();
    console.log(`[ChartService] Refreshing all ${sources.length} chart sources...`);

    for (const source of sources) {
      try {
        await this.refreshChart(source.id);
      } catch (err: any) {
        console.error(`[ChartService] Error refreshing ${source.id}:`, err.message);
      }
    }
  }

  /**
   * Start recurring background refresh timer
   */
  startScheduler(intervalHours: number = 12): void {
    const ms = intervalHours * 60 * 60 * 1000;
    console.log(`[ChartService] Scheduler initialized: auto-refreshes every ${intervalHours} hours.`);
    setInterval(() => {
      console.log(`[ChartService] Running scheduled background chart refresh...`);
      this.refreshAll().catch((err) => console.error('[ChartService] Scheduler refresh error:', err));
    }, ms);
  }

  private createEmptyPayload(sourceId: string): ChartPayload {
    const source = getSourceById(sourceId);
    return {
      id: sourceId,
      name: source?.name || sourceId,
      platform: source?.platform || 'youtube',
      country: source?.country,
      lastUpdated: new Date().toISOString(),
      totalTracks: 0,
      sourceUrl: source?.url || '',
      tracks: [],
    };
  }
}
