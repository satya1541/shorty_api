import { ChartService } from '../services/chartService.js';
import { CHART_SOURCES } from '../config/sources.js';

async function main() {
  console.log('=== Starting Test Extraction & Resolution Run ===');
  const service = new ChartService('./data');

  // Test refreshing the first 1-2 charts with limit to verify resolution
  for (const source of CHART_SOURCES) {
    console.log(`\n------------------------------------------------`);
    console.log(`Processing: ${source.name} (${source.url})`);
    console.log(`------------------------------------------------`);
    
    // Temporarily set limit to 5 for quick CLI test
    const testConfig = { ...source, limit: 5 };
    const result = await service.refreshChart(source.id);
    
    console.log(`\nResults for ${source.id} (${result.tracks.length} tracks):`);
    result.tracks.slice(0, 5).forEach((t) => {
      const saavnStatus = t.streams.saavn ? `✅ Saavn: "${t.streams.saavn.name}" (${t.streams.saavn.quality})` : '❌ Saavn: Not found';
      const ytStatus = t.streams.youtube ? `✅ YouTube: "${t.streams.youtube.videoId}" (${t.streams.youtube.quality})` : '❌ YouTube: Not found';
      console.log(` #${t.rank}: "${t.title}" by ${t.artist} [Score: ${t.matchScore}]`);
      console.log(`     ${saavnStatus}`);
      console.log(`     ${ytStatus}`);
      console.log(`     Preferred: ${t.preferredSource.toUpperCase()}`);
    });
  }

  console.log('\n=== Test Run Completed Successfully! ===');
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
