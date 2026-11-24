import { Router, Request, Response } from 'express';
import { ChartService } from '../services/chartService.js';
import { matchAndResolveTrack } from '../resolvers/matcher.js';
import { cleanSongTitle, cleanArtistName } from '../utils/textCleaner.js';

export function createChartRouter(chartService: ChartService): Router {
  const router = Router();

  /**
   * GET /api/charts
   * Returns list of all available charts and their summary metadata
   */
  router.get('/', (_req: Request, res: Response) => {
    const summaries = chartService.getSummaries();
    res.json({
      success: true,
      count: summaries.length,
      charts: summaries,
    });
  });

  /**
   * GET /api/charts/all
   * Returns all charts with full resolved track lists
   */
  router.get('/all', (_req: Request, res: Response) => {
    const all = chartService.getAllCharts();
    res.json({
      success: true,
      count: all.length,
      charts: all,
    });
  });

  /**
   * GET /api/charts/:id
   * Returns full resolved tracks for a specific chart (e.g., 'spotify-india', 'youtube-india')
   */
  router.get('/:id', (req: Request, res: Response) => {
    const id = String(req.params.id);
    const chart = chartService.getChart(id);

    if (!chart) {
      // Check if it's a known source that hasn't been extracted yet
      const summaries = chartService.getSummaries();
      const exists = summaries.find((s) => s.id === id);

      if (exists) {
        return res.status(202).json({
          success: false,
          message: `Chart "${id}" exists but has not been resolved yet. Trigger POST /api/charts/${id}/refresh to resolve now.`,
        });
      }

      return res.status(404).json({
        success: false,
        error: `Chart with ID "${id}" not found. Available: ${summaries.map((s) => s.id).join(', ')}`,
      });
    }

    res.json({
      success: true,
      chart,
    });
  });

  /**
   * POST /api/charts/:id/refresh
   * Triggers an immediate refresh of a single chart
   */
  router.post('/:id/refresh', async (req: Request, res: Response) => {
    const id = String(req.params.id);

    try {
      // Start refresh asynchronously or respond when done
      const isAsync = req.query.async === 'true';

      if (isAsync) {
        chartService.refreshChart(id).catch((err) => console.error(`Async refresh error for ${id}:`, err));
        return res.json({
          success: true,
          message: `Refresh started in background for "${id}". Check GET /api/charts/${id} shortly.`,
        });
      }

      const refreshed = await chartService.refreshChart(id);
      res.json({
        success: true,
        message: `Successfully refreshed "${id}" with ${refreshed.tracks.length} tracks.`,
        chart: refreshed,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.message || 'Failed to refresh chart',
      });
    }
  });

  /**
   * POST /api/charts/refresh
   * Triggers a refresh of all registered charts
   */
  router.post('/refresh', async (req: Request, res: Response) => {
    const isAsync = req.query.async === 'true';

    if (isAsync) {
      chartService.refreshAll().catch((err) => console.error('Async refresh all error:', err));
      return res.json({
        success: true,
        message: 'Refresh of all charts started in background.',
      });
    }

    try {
      await chartService.refreshAll();
      res.json({
        success: true,
        message: 'Successfully refreshed all charts.',
        charts: chartService.getAllCharts(),
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  });

  /**
   * GET /api/resolve?title=...&artist=...
   * On-demand resolver endpoint: matches any song against JioSaavn & YouTube
   */
  router.get('/tools/resolve', async (req: Request, res: Response) => {
    const title = req.query.title as string;
    const artist = (req.query.artist as string) || '';

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter "title" is required.',
      });
    }

    try {
      const resolved = await matchAndResolveTrack(
        {
          rank: 1,
          title: cleanSongTitle(title),
          artist: cleanArtistName(artist),
        },
        'spotify'
      );

      res.json({
        success: true,
        track: resolved,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  });

  return router;
}
