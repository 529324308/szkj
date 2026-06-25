import { createAndRunCrawlJob } from '../src/services/crawlerJobService.js';
import { createAndRunParseJob } from '../src/services/parseRunService.js';
import { getAllPolicySources } from '../src/services/policySourceService.js';

function assert(condition, message) {
  if (!condition) {
    const error = new Error(message);
    error.code = 'SMOKE_ASSERT_FAILED';
    throw error;
  }
}

function looksGarbled(text = '') {
  const value = String(text || '');
  return value.includes('锛') || value.includes('鍏') || value.includes('娴') || value.includes('�');
}

async function main() {
  const sources = getAllPolicySources();
  assert(sources.length > 0, 'No policy sources configured.');

  const targetSource = sources[0];
  console.log(`[T6] Using policy source: ${targetSource.id} (${targetSource.name})`);

  const crawlJob = await createAndRunCrawlJob({
    sourceIds: [targetSource.id],
    maxItemsPerSource: 1,
    fetchDetails: true
  });

  console.log(`[T6] Crawl job completed: ${crawlJob.id}`);
  assert(crawlJob.summary.discoveredItems >= 1, 'Crawl job did not discover any detail items.');

  const parseRun = await createAndRunParseJob({
    crawlJobId: crawlJob.id
  });

  console.log(`[T6] Parse run completed: ${parseRun.id}`);
  assert(parseRun.summary.parsedFiles >= 1, 'Parse run did not parse any files.');

  const firstDocument = parseRun.documents[0];
  assert(firstDocument, 'Parse run returned no document results.');
  assert(firstDocument.markdownFile, 'Parsed document did not generate a markdown file.');
  assert(firstDocument.enhancement?.aiExtract?.status === 'parsed', 'AI extract did not succeed.');
  assert(!looksGarbled(firstDocument.title), `Parsed title still looks garbled: ${firstDocument.title}`);

  console.log('[T6] First parsed title:', firstDocument.title);
  console.log('[T6] OCR status:', firstDocument.enhancement?.ocr?.status || 'unknown');
  console.log('[T6] AI extract summary:', firstDocument.enhancement?.aiExtract?.structuredData?.summary || '');
  console.log('[T6] Smoke test passed.');
}

main().catch((error) => {
  console.error('[T6] Smoke test failed:', error.message);
  process.exitCode = 1;
});
