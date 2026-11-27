import fs from 'node:fs';
import path from 'node:path';
import { Request, Response, Router } from 'express';

export interface AndroidReleasePayload {
  latestVersion: string;
  minSupportedVersion: string;
  displayVersion: string;
  releaseTag: string;
  downloadUrl: string;
  forceUpdate: boolean;
  isActive: boolean;
  releaseNotes: string[];
  publishedAt: string;
  checksumSha256?: string;
}

export interface AppVersionConfig {
  updatedAt: string;
  android: AndroidReleasePayload;
  channels?: Record<string, Partial<AndroidReleasePayload>>;
}

interface CachedFileConfig {
  mtimeMs: number;
  config: AppVersionConfig;
}

const DEFAULT_CONFIG: AppVersionConfig = {
  updatedAt: new Date(0).toISOString(),
  android: {
    latestVersion: process.env.APP_ANDROID_LATEST_VERSION || '5.0',
    minSupportedVersion: process.env.APP_ANDROID_MIN_VERSION || '5.0',
    displayVersion: process.env.APP_ANDROID_DISPLAY_VERSION || '5.0.0',
    releaseTag: process.env.APP_ANDROID_RELEASE_TAG || 'v5.0.0',
    downloadUrl: process.env.APP_ANDROID_APK_URL || '',
    forceUpdate: process.env.APP_ANDROID_FORCE_UPDATE === 'true',
    isActive: process.env.APP_ANDROID_RELEASE_ACTIVE === 'true',
    releaseNotes: [],
    publishedAt: new Date(0).toISOString(),
  },
};

function sanitizeString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

function normalizeAndroidPayload(
  raw: Partial<AndroidReleasePayload> | undefined,
  base: AndroidReleasePayload
): AndroidReleasePayload {
  if (!raw || typeof raw !== 'object') {
    return base;
  }

  return {
    latestVersion: sanitizeString(raw.latestVersion, base.latestVersion),
    minSupportedVersion: sanitizeString(raw.minSupportedVersion, base.minSupportedVersion),
    displayVersion: sanitizeString(raw.displayVersion, base.displayVersion),
    releaseTag: sanitizeString(raw.releaseTag, base.releaseTag),
    downloadUrl: typeof raw.downloadUrl === 'string' ? raw.downloadUrl.trim() : base.downloadUrl,
    forceUpdate: typeof raw.forceUpdate === 'boolean' ? raw.forceUpdate : base.forceUpdate,
    isActive: typeof raw.isActive === 'boolean' ? raw.isActive : base.isActive,
    releaseNotes: Array.isArray(raw.releaseNotes)
      ? raw.releaseNotes.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      : base.releaseNotes,
    publishedAt: sanitizeString(raw.publishedAt, base.publishedAt),
    checksumSha256:
      typeof raw.checksumSha256 === 'string' && raw.checksumSha256.trim().length > 0
        ? raw.checksumSha256.trim()
        : base.checksumSha256,
  };
}

/**
 * Serves Android native APK version metadata for in-app upgrade prompts.
 * Reloads `<CACHE_DIR>/app-release.json` dynamically when modified on disk.
 */
export function createAppVersionRouter(cacheDir: string): Router {
  const router = Router();
  const configPath = path.resolve(cacheDir, 'app-release.json');
  let cached: CachedFileConfig | null = null;

  const loadConfig = (): AppVersionConfig => {
    try {
      if (!fs.existsSync(configPath)) {
        return DEFAULT_CONFIG;
      }

      const stat = fs.statSync(configPath);
      if (cached && cached.mtimeMs === stat.mtimeMs) {
        return cached.config;
      }

      const parsed = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as Partial<AppVersionConfig>;
      const android = normalizeAndroidPayload(parsed.android, DEFAULT_CONFIG.android);
      const nextConfig: AppVersionConfig = {
        updatedAt: sanitizeString(parsed.updatedAt, stat.mtime.toISOString()),
        android,
        channels: parsed.channels,
      };

      cached = { mtimeMs: stat.mtimeMs, config: nextConfig };
      return nextConfig;
    } catch (err) {
      console.error('[AppVersionRouter] Failed to load app-release.json:', err);
      return DEFAULT_CONFIG;
    }
  };

  /**
   * GET /api/app-version
   * Optional query: ?channel=preview
   */
  router.get('/', (req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

    const config = loadConfig();
    const channel = typeof req.query.channel === 'string' ? req.query.channel.trim() : '';
    const channelOverride = channel && config.channels ? config.channels[channel] : undefined;
    const android = normalizeAndroidPayload(channelOverride, config.android);

    res.json({
      success: true,
      updatedAt: config.updatedAt,
      channel: channel || 'default',
      android,
    });
  });

  /**
   * PUT /api/app-version
   * Optional admin-key protected endpoint to update release metadata remotely.
   */
  router.put('/', (req: Request, res: Response) => {
    const adminKey = process.env.ADMIN_API_KEY?.trim();
    const providedKey = typeof req.headers['x-admin-key'] === 'string' ? req.headers['x-admin-key'].trim() : '';

    if (!adminKey || providedKey !== adminKey) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: valid x-admin-key header is required.',
      });
    }

    const body = (req.body || {}) as Partial<AppVersionConfig> & Partial<AndroidReleasePayload>;
    const current = loadConfig();
    const incomingAndroid = body.android ?? body;
    const nextAndroid = normalizeAndroidPayload(incomingAndroid, current.android);
    const nextConfig: AppVersionConfig = {
      updatedAt: new Date().toISOString(),
      android: nextAndroid,
      channels: body.channels ?? current.channels,
    };

    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, `${JSON.stringify(nextConfig, null, 2)}\n`, 'utf-8');
    cached = null;

    return res.json({
      success: true,
      updatedAt: nextConfig.updatedAt,
      android: nextConfig.android,
    });
  });

  return router;
}
