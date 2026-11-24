import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ChartService } from './services/chartService.js';
import { createChartRouter } from './routes/charts.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const CACHE_DIR = process.env.CACHE_DIR || './data';
const AUTO_REFRESH_HOURS = parseInt(process.env.AUTO_REFRESH_HOURS || '12', 10);

// Initialize Chart Service
const chartService = new ChartService(CACHE_DIR);

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'shorty-api',
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    cachedCharts: chartService.getSummaries(),
  });
});

// API Routes
app.use('/api/charts', createChartRouter(chartService));

// Root welcome
app.get('/', (_req, res) => {
  res.json({
    name: 'Shorty Charts & Stream Resolution API',
    version: '1.0.0',
    documentation: {
      health: 'GET /health',
      listCharts: 'GET /api/charts',
      getSpecificChart: 'GET /api/charts/:id (e.g. /api/charts/spotify-india, /api/charts/youtube-india, /api/charts/gaana-worldwide)',
      getAllCharts: 'GET /api/charts/all',
      refreshChart: 'POST /api/charts/:id/refresh?async=true',
      resolveSingleSong: 'GET /api/charts/tools/resolve?title=Guzarish&artist=Satinder Sartaaj',
    },
  });
});

// Start Server
app.listen(PORT, () => {
  console.log('================================================================');
  console.log(`🚀 Shorty API Server running at http://localhost:${PORT}`);
  console.log(`📡 Health Check:  http://localhost:${PORT}/health`);
  console.log(`📊 Charts List:   http://localhost:${PORT}/api/charts`);
  console.log(`🔄 Auto-Refresh:  Every ${AUTO_REFRESH_HOURS} hours`);
  console.log('================================================================');

  // Start background periodic scheduler
  chartService.startScheduler(AUTO_REFRESH_HOURS);
});
