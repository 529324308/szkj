import { listApprovedDocuments } from './reviewIngestService.js';
import { getDatasetIdByKey, getDocumentChunks, listSyncRecords, searchDataset } from './ragflowService.js';

const POLICY_DATASET_KEY = 'natural_resources_policy';

export async function retrievePolicyEvidence(question, options = {}) {
  const datasetId = getDatasetIdByKey(POLICY_DATASET_KEY);
  const topK = Math.max(1, Math.min(6, Number(options.topK) || 4));

  if (!datasetId) {
    return emptyRetrieval('no_dataset', '');
  }

  try {
    const ragflowResult = await searchDataset({
      datasetId,
      question,
      topK,
      similarityThreshold: 0,
      keyword: false
    });
    const chunks = Array.isArray(ragflowResult?.data?.chunks) ? ragflowResult.data.chunks : [];
    if (chunks.length > 0) {
      const ragflowCitations = buildCitationsFromChunks(chunks);
      const supplemented = chunks.length < topK
        ? [...ragflowCitations, ...(await manualChunkRetrieve(question, datasetId, { topK: topK * 2 })).citations]
        : ragflowCitations;
      const citations = enrichAndLimitCitations(supplemented, topK);
      return {
        mode: 'ragflow_search',
        datasetId,
        citations,
        contextText: buildContextText(citations),
        sourcePreview: citations[0] || null
      };
    }
  } catch {
    // Fall back to manual chunk retrieval below.
  }

  return manualChunkRetrieve(question, datasetId, { topK });
}

async function manualChunkRetrieve(question, datasetId, { topK = 4 } = {}) {
  const syncRecords = listSyncRecords().filter(
    (item) => item.datasetId === datasetId && item.status === 'completed' && item.remoteDocumentId
  );
  const approvedMap = new Map(listApprovedDocuments().map((item) => [item.id, item]));
  const allChunks = [];

  for (const record of syncRecords.slice(0, 10)) {
    const approved = approvedMap.get(record.documentId) || null;
    const response = await getDocumentChunks(datasetId, record.remoteDocumentId);
    const chunks = Array.isArray(response?.data?.chunks) ? response.data.chunks : [];

    for (const chunk of chunks) {
      const score = scoreChunk(question, chunk?.content || '');
      allChunks.push({
        chunk,
        score,
        approved,
        remoteDocumentId: record.remoteDocumentId
      });
    }
  }

  const ranked = allChunks
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK * 4);

  const citations = enrichAndLimitCitations(
    ranked.map(({ chunk, approved, score, remoteDocumentId }, index) => ({
      id: chunk?.id || `citation-${index + 1}`,
      remoteDocumentId,
      title: approved?.title || chunk?.docnm_kwd || 'Unknown document',
      sourceOrg: approved?.sourceOrg || '',
      publishDate: approved?.publishDate || '',
      sourceUrl: approved?.sourceUrl || '',
      chunkId: chunk?.id || '',
      quote: normalizeSnippet(chunk?.content || ''),
      score,
      parser: approved?.aiExtract?.model || ''
    })),
    topK
  );

  return {
    mode: 'manual_chunk_retrieval',
    datasetId,
    citations,
    contextText: buildContextText(citations),
    sourcePreview: citations[0] || null
  };
}

function buildCitationsFromChunks(chunks) {
  const syncRecords = listSyncRecords().filter((item) => item.status === 'completed' && item.remoteDocumentId);
  const approvedMap = new Map(listApprovedDocuments().map((item) => [item.id, item]));
  const remoteMap = new Map(
    syncRecords.map((item) => [
      item.remoteDocumentId,
      {
        sync: item,
        approved: approvedMap.get(item.documentId) || null
      }
    ])
  );

  return chunks.map((chunk, index) => {
    const matched = remoteMap.get(chunk?.document_id) || {};
    const approved = matched.approved || null;
    return {
      id: chunk?.id || `citation-${index + 1}`,
      remoteDocumentId: chunk?.document_id || '',
      title: approved?.title || chunk?.docnm_kwd || 'Unknown document',
      sourceOrg: approved?.sourceOrg || '',
      publishDate: approved?.publishDate || '',
      sourceUrl: approved?.sourceUrl || '',
      chunkId: chunk?.id || '',
      quote: normalizeSnippet(chunk?.content || ''),
      score: Number(chunk?.similarity || chunk?.score || 1),
      parser: approved?.aiExtract?.model || ''
    };
  });
}

function enrichAndLimitCitations(citations, limit) {
  const seen = new Set();
  const result = [];

  for (const item of citations) {
    const key = `${item.remoteDocumentId}|${item.chunkId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
    if (result.length >= limit) break;
  }

  return result;
}

function buildContextText(citations) {
  return citations
    .map(
      (item, index) =>
        `资料${index + 1}\n标题：${item.title}\n来源机构：${item.sourceOrg || '未知'}\n发布日期：${item.publishDate || '未知'}\n内容摘录：${item.quote}`
    )
    .join('\n\n');
}

function scoreChunk(question, content) {
  const queryTokens = tokenize(question);
  const textTokens = tokenize(content);
  if (queryTokens.length === 0 || textTokens.length === 0) return 0;

  const tokenSet = new Set(textTokens);
  let score = 0;
  for (const token of queryTokens) {
    if (tokenSet.has(token)) score += 1;
  }

  return score / queryTokens.length;
}

function tokenize(text) {
  const normalized = String(text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

  const tokens = normalized
    .split(/\s+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2);

  const cjkSequence = normalized.replace(/\s+/g, '');
  if (/[\u4e00-\u9fff]/.test(cjkSequence)) {
    for (let i = 0; i < cjkSequence.length - 1; i += 1) {
      const gram = cjkSequence.slice(i, i + 2);
      if (/[\u4e00-\u9fff]/.test(gram)) {
        tokens.push(gram);
      }
    }
  }

  return [...new Set(tokens)];
}

function normalizeSnippet(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);
}

function emptyRetrieval(mode, datasetId) {
  return {
    mode,
    datasetId,
    citations: [],
    contextText: '',
    sourcePreview: null
  };
}
