import { ChartSourceConfig, RawChartItem } from '../types/index.js';

export interface ChartExtractor {
  readonly name: string;
  canHandle(config: ChartSourceConfig): boolean;
  extract(config: ChartSourceConfig): Promise<RawChartItem[]>;
}
