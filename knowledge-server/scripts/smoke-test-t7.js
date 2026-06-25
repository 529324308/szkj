import { createAndRunCrawlJob } from '../src/services/crawlerJobService.js';
import { createAndRunParseJob } from '../src/services/parseRunService.js';
import { getAllPolicySources } from '../src/services/policySourceService.js';
import { approveReviewCandidate, createReviewCandidatesFromParseRun, listApprovedDocuments, updateReviewCandidateMetadata } from '../src/services/reviewIngestService.js';

function assert(condition, message) {
  if (!condition) {
    const error = new Error(message);
    error.code = 'SMOKE_ASSERT_FAILED';
    throw error;
  }
}

async function main() {
  const sources = getAllPolicySources();
  assert(sources.length > 0, 'No policy sources configured.');
  const source = sources[0];

  const crawlJob = await createAndRunCrawlJob({
    sourceIds: [source.id],
    maxItemsPerSource: 1,
    fetchDetails: true
  });
  console.log(`[T7] Crawl job completed: ${crawlJob.id}`);

  const parseRun = await createAndRunParseJob({
    crawlJobId: crawlJob.id
  });
  console.log(`[T7] Parse run completed: ${parseRun.id}`);

  const created = createReviewCandidatesFromParseRun(parseRun.id);
  const target = created[0];
  assert(target, 'No pending review candidate found for smoke test.');

  const updated = updateReviewCandidateMetadata(target.id, {
    reviewNote: 'metadata updated by smoke test',
    tags: ['reviewed', ...(target.tags || [])]
  });
  assert(updated.tags.includes('reviewed'), 'Review metadata update did not persist.');

  const approved = approveReviewCandidate(target.id, {
    reviewNote: 'approved by smoke test'
  });

  assert(approved.candidate.reviewStatus === 'approved', 'Review candidate was not approved.');
  assert(approved.document.id, 'Approved document id is missing.');
  assert(approved.document.finalMarkdownFile.endsWith('.md'), 'Approved markdown file path is invalid.');

  const approvedDocuments = listApprovedDocuments();
  assert(approvedDocuments.some((item) => item.id === approved.document.id), 'Approved document was not stored.');

  console.log('[T7] Review candidate approved:', approved.candidate.id);
  console.log('[T7] Approved document:', approved.document.id);
  console.log('[T7] Final markdown:', approved.document.finalMarkdownFile);
  console.log('[T7] Smoke test passed.');
}

main().catch((error) => {
  console.error('[T7] Smoke test failed:', error.message);
  process.exitCode = 1;
});
