import { ChartExtractor } from './base.js';
import { SoundchartsExtractor } from './soundcharts.js';
import { AppleMusicExtractor } from './appleMusic.js';
import { ChartSourceConfig } from '../types/index.js';

const extractors: ChartExtractor[] = [
  new SoundchartsExtractor(),
  new AppleMusicExtractor(),
];

export function registerExtractor(extractor: ChartExtractor): void {
  extractors.push(extractor);
}

export function getExtractor(config: ChartSourceConfig): ChartExtractor {
  const found = extractors.find((e) => e.canHandle(config));
  if (!found) {
    throw new Error(`No extractor registered for source: ${config.id} (${config.url})`);
  }
  return found;
}
