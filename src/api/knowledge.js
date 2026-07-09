const KNOWLEDGE_BASE_URL = '/knowledge-api';

async function parseResponseBody(response) {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return response.json().catch(() => null);
  }

  const text = await response.text().catch(() => '');
  if (!text) return null;

  const trimmed = text.trim();
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    return JSON.parse(trimmed);
  }

  return text;
}

async function knowledgeRequest(path, options = {}) {
  const headers = { ...options.headers };

  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  } else if (!headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${KNOWLEDGE_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await parseResponseBody(response);

  if (!response.ok) {
    const errorMessage = data && typeof data === 'object'
      ? data.message || data.error?.message || ''
      : '';
    const error = new Error(errorMessage || 'Knowledge request failed');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export function chatWithKnowledge(payload, options = {}) {
	const { model: _model, ...restPayload } = payload || {};
	return knowledgeRequest('/graphrag/chat', {
		method: 'POST',
		body: JSON.stringify(restPayload),
		signal: options.signal,
	});
}

export function routeKnowledgeFileFollowup(payload = {}, options = {}) {
	return knowledgeRequest('/graphrag/route-file-followup', {
		method: 'POST',
		body: JSON.stringify(payload),
		signal: options.signal,
	});
}

export function understandKnowledgeTurn(payload = {}, options = {}) {
	return knowledgeRequest('/graphrag/understand-turn', {
		method: 'POST',
		body: JSON.stringify(payload),
		signal: options.signal,
	});
}

export function listChatSessions(userId = 'local-user', options = {}) {
	const query = new URLSearchParams({ userId }).toString();
	return knowledgeRequest(`/chat/sessions?${query}`, {
		method: 'GET',
		signal: options.signal,
	});
}

export function saveChatSession(payload = {}, options = {}) {
	return knowledgeRequest('/chat/sessions', {
		method: 'POST',
		body: JSON.stringify(payload),
		signal: options.signal,
	});
}

export function deleteChatSession(sessionId, userId = 'local-user', options = {}) {
	const query = new URLSearchParams({ userId }).toString();
	return knowledgeRequest(`/chat/sessions/${encodeURIComponent(sessionId)}?${query}`, {
		method: 'DELETE',
		signal: options.signal,
	});
}

async function chatWithKnowledgeStreamOnce(payload, handlers = {}, options = {}) {
	const { model: _model, ...restPayload } = payload || {};
	const response = await fetch(`${KNOWLEDGE_BASE_URL}/graphrag/chat`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Accept: 'text/event-stream',
		},
		body: JSON.stringify({
			...restPayload,
			stream: true,
		}),
		signal: options.signal,
	});

	if (!response.ok) {
		const data = await parseResponseBody(response);
		const errorMessage = data && typeof data === 'object'
			? data.message || data.error?.message || ''
			: '';
		const error = new Error(errorMessage || 'Knowledge stream request failed');
		error.status = response.status;
		error.data = data;
		throw error;
	}

	if (!response.body) {
		throw new Error('Knowledge stream is not available');
	}

	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let buffer = '';
	let currentEvent = 'message';
	let resultPayload = null;
	const inactivityTimeoutMs = Math.max(30000, Number(options.inactivityTimeoutMs) || 120000);

	const dispatchEvent = (eventName, payload) => {
		if (eventName === 'progress' && typeof handlers.onProgress === 'function') {
			handlers.onProgress(payload);
		} else if (eventName === 'status' && typeof handlers.onStatus === 'function') {
			handlers.onStatus(payload);
		} else if (eventName === 'result') {
			resultPayload = payload;
			if (typeof handlers.onResult === 'function') {
				handlers.onResult(payload);
			}
		} else if (eventName === 'error') {
			const error = new Error(payload?.error?.message || payload?.message || 'Knowledge stream failed');
			error.data = payload;
			throw error;
		}
	};

	const consumeBlock = (block) => {
		const lines = block.split(/\r?\n/);
		let eventName = currentEvent;
		const dataLines = [];
		for (const line of lines) {
			if (!line) continue;
			if (line.startsWith('event:')) {
				eventName = line.slice(6).trim() || 'message';
				continue;
			}
			if (line.startsWith('data:')) {
				dataLines.push(line.slice(5).trim());
			}
		}
		if (dataLines.length === 0) return;
		const dataText = dataLines.join('\n');
		const payload = JSON.parse(dataText);
		dispatchEvent(eventName, payload);
		currentEvent = 'message';
	};

	while (true) {
		const readResult = await Promise.race([
			reader.read(),
			new Promise((_, reject) => setTimeout(() => {
				const error = new Error('Knowledge stream connection timed out.');
				error.code = 'KNOWLEDGE_STREAM_TIMEOUT';
				reject(error);
			}, inactivityTimeoutMs))
		]).catch(async (error) => {
			await reader.cancel().catch(() => {});
			throw error;
		});
		const { done, value } = readResult;
		buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
		let separatorIndex = buffer.indexOf('\n\n');
		while (separatorIndex >= 0) {
			const block = buffer.slice(0, separatorIndex).trim();
			buffer = buffer.slice(separatorIndex + 2);
			if (block) {
				consumeBlock(block);
			}
			separatorIndex = buffer.indexOf('\n\n');
		}
		if (done) {
			break;
		}
	}

	if (buffer.trim()) {
		consumeBlock(buffer.trim());
	}

	if (!resultPayload) {
		const error = new Error('本次请求已中断，未收到最终结果，请重试。');
		error.code = 'KNOWLEDGE_STREAM_INTERRUPTED';
		throw error;
	}

	return resultPayload;
}

export async function chatWithKnowledgeStream(payload, handlers = {}, options = {}) {
	const maxReconnectAttempts = Number.isFinite(Number(options.maxReconnectAttempts))
		? Math.max(0, Number(options.maxReconnectAttempts))
		: 5;
	let attempt = 0;
	let lastError = null;

	while (attempt <= maxReconnectAttempts) {
		try {
			return await chatWithKnowledgeStreamOnce(payload, handlers, options);
		} catch (error) {
			lastError = error;
			if (options.signal?.aborted || error?.name === 'AbortError') {
				throw error;
			}
			if (error?.status || error?.data?.error) {
				throw error;
			}
			attempt += 1;
			if (attempt > maxReconnectAttempts) {
				break;
			}
			if (typeof handlers.onReconnect === 'function') {
				handlers.onReconnect({
					type: 'openclaw_reconnecting',
					attempt,
					maxAttempts: maxReconnectAttempts,
					message: `Reconnecting... ${attempt}/${maxReconnectAttempts}`
				});
			}
			await new Promise((resolve) => setTimeout(resolve, Math.min(3000, 600 * attempt)));
		}
	}

	throw lastError || new Error('Knowledge stream request failed');
}

export async function analyzeKnowledgeFileStream(payload = {}, handlers = {}, options = {}) {
	const form = new FormData();
	form.append('instruction', payload.instruction || payload.message || payload.question || '');
	if (payload.topK) {
		form.append('topK', String(payload.topK));
	}
	if (payload.userId) {
		form.append('userId', String(payload.userId));
	}
	if (payload.convId || payload.conversationId || payload.chatId) {
		form.append('convId', String(payload.convId || payload.conversationId || payload.chatId));
	}
	for (const file of payload.files || []) {
		form.append('files', file, file.name);
	}
	const documentIds = Array.isArray(payload.documentIds) ? payload.documentIds.filter(Boolean) : [];
	if (documentIds.length > 0) {
		form.append('documentIds', JSON.stringify(documentIds));
	}

	const response = await fetch(`${KNOWLEDGE_BASE_URL}/graphrag/analyze-file`, {
		method: 'POST',
		headers: {
			Accept: 'text/event-stream',
		},
		body: form,
		signal: options.signal,
	});

	if (!response.ok) {
		const data = await parseResponseBody(response);
		const errorMessage = data && typeof data === 'object'
			? data.message || data.error?.message || ''
			: '';
		const error = new Error(errorMessage || 'Knowledge file analysis stream request failed');
		error.status = response.status;
		error.data = data;
		throw error;
	}

	if (!response.body) {
		throw new Error('Knowledge file analysis stream is not available');
	}

	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let buffer = '';
	let currentEvent = 'message';
	let resultPayload = null;

	const dispatchEvent = (eventName, payloadValue) => {
		if (eventName === 'progress' && typeof handlers.onProgress === 'function') {
			handlers.onProgress(payloadValue);
		} else if (eventName === 'status' && typeof handlers.onStatus === 'function') {
			handlers.onStatus(payloadValue);
		} else if (eventName === 'result') {
			resultPayload = payloadValue;
			if (typeof handlers.onResult === 'function') {
				handlers.onResult(payloadValue);
			}
		} else if (eventName === 'error') {
			const error = new Error(payloadValue?.error?.message || payloadValue?.message || 'Knowledge file analysis stream failed');
			error.data = payloadValue;
			throw error;
		}
	};

	const consumeBlock = (block) => {
		const lines = block.split(/\r?\n/);
		let eventName = currentEvent;
		const dataLines = [];
		for (const line of lines) {
			if (!line) continue;
			if (line.startsWith('event:')) {
				eventName = line.slice(6).trim() || 'message';
				continue;
			}
			if (line.startsWith('data:')) {
				dataLines.push(line.slice(5).trim());
			}
		}
		if (dataLines.length === 0) return;
		const dataText = dataLines.join('\n');
		const payloadValue = JSON.parse(dataText);
		dispatchEvent(eventName, payloadValue);
		currentEvent = 'message';
	};

	while (true) {
		const { done, value } = await reader.read();
		buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
		let separatorIndex = buffer.indexOf('\n\n');
		while (separatorIndex >= 0) {
			const block = buffer.slice(0, separatorIndex).trim();
			buffer = buffer.slice(separatorIndex + 2);
			if (block) {
				consumeBlock(block);
			}
			separatorIndex = buffer.indexOf('\n\n');
		}
		if (done) {
			break;
		}
	}

	if (buffer.trim()) {
		consumeBlock(buffer.trim());
	}

	if (!resultPayload) {
		const error = new Error('文件分析过程已中断，未收到最终结果，请重试。');
		error.code = 'KNOWLEDGE_FILE_STREAM_INTERRUPTED';
		throw error;
	}

	return resultPayload;
}

export function queryGraphRag(payload, options = {}) {
	return knowledgeRequest('/graphrag/query', {
		method: 'POST',
		body: JSON.stringify(payload),
		signal: options.signal,
	});
}

export function runOfficeAgentTask(payload = {}, options = {}) {
	const form = new FormData();
	form.append('instruction', payload.instruction || payload.message || payload.question || '');
	form.append('projectText', payload.projectText || '');
	form.append('chatProfile', 'office');
	if (payload.topK) {
		form.append('topK', String(payload.topK));
	}

	for (const file of payload.files || []) {
		form.append('files', file, file.name);
	}

	return knowledgeRequest('/knowledge/office-task', {
		method: 'POST',
		body: form,
		signal: options.signal,
	});
}

export function analyzeKnowledgeFile(payload = {}, options = {}) {
	const form = new FormData();
	form.append('instruction', payload.instruction || payload.message || payload.question || '');
	if (payload.topK) {
		form.append('topK', String(payload.topK));
	}

	for (const file of payload.files || []) {
		form.append('files', file, file.name);
	}

	return knowledgeRequest('/graphrag/analyze-file', {
		method: 'POST',
		body: form,
		signal: options.signal,
	});
}

export function collectMissingPolicyFiles(payload = {}, options = {}) {
	return knowledgeRequest('/graphrag/analyze-file/public-collect', {
		method: 'POST',
		body: JSON.stringify({
			query: payload.query || '',
			policyFiles: payload.policyFiles || payload.missingPolicyFiles || [],
		}),
		signal: options.signal,
	});
}

export function getKnowledgeModels() {
  return knowledgeRequest('/graphrag/health');
}

export function getKnowledgeHealth() {
  return knowledgeRequest('/graphrag/health');
}

export function searchKnowledge(params = {}) {
  const query = new URLSearchParams(params).toString();
  return knowledgeRequest(`/graphrag/query${query ? `?${query}` : ''}`);
}

export function compareKnowledgeEvidence(payload, options = {}) {
	const { model: _model, ...restPayload } = payload || {};
	return knowledgeRequest('/graphrag/compare', {
		method: 'POST',
		body: JSON.stringify(restPayload),
		signal: options.signal,
	});
}

export function replicateDocuments(payload = {}, options = {}) {
	const form = new FormData();
	form.append('instruction', payload.instruction || payload.message || '');
	form.append('projectText', payload.projectText || '');

	for (const file of payload.files || []) {
		form.append('files', file, file.name);
	}

	return knowledgeRequest('/template/replicate', {
		method: 'POST',
		body: form,
		signal: options.signal,
	});
}

export function archiveDocuments(payload = {}, options = {}) {
	const form = new FormData();
	form.append('instruction', payload.instruction || payload.message || '');
	form.append('projectText', payload.projectText || '');

	for (const file of payload.files || []) {
		form.append('files', file, file.name);
	}

	return knowledgeRequest('/archive/save', {
		method: 'POST',
		body: form,
		signal: options.signal,
	});
}

export function getKnowledgeDocument(documentId) {
  return knowledgeRequest(`/graphrag/document/${encodeURIComponent(documentId)}`);
}

export function getKnowledgeDocuments(params = {}, options = {}) {
	const query = new URLSearchParams(params).toString();
	return knowledgeRequest(`/graphrag/documents${query ? `?${query}` : ''}`, {
		signal: options.signal,
	});
}

export function deleteKnowledgeDocument(documentId, options = {}) {
	return knowledgeRequest(`/graphrag/document/${encodeURIComponent(documentId)}`, {
		method: 'DELETE',
		signal: options.signal,
	});
}

export function getKnowledgeDocumentPreview(documentId, params = {}, options = {}) {
	const query = new URLSearchParams(params).toString();
	return knowledgeRequest(`/graphrag/document/${encodeURIComponent(documentId)}/preview${query ? `?${query}` : ''}`, {
		signal: options.signal,
	});
}

export function getGraphRagIndexJobs(params = {}, options = {}) {
	const query = new URLSearchParams(params).toString();
	return knowledgeRequest(`/graphrag/index/jobs${query ? `?${query}` : ''}`, {
		signal: options.signal,
	});
}

export function createGraphRagIndexJob(payload = {}, options = {}) {
	return knowledgeRequest('/graphrag/index/jobs', {
		method: 'POST',
		body: JSON.stringify({
			trigger: payload.trigger || 'manual',
			scope: payload.scope || 'full_rebuild',
			documentIds: Array.isArray(payload.documentIds) ? payload.documentIds : [],
			reason: payload.reason || 'Manual rebuild from UI',
			executionMode: payload.executionMode || 'immediate',
		}),
		signal: options.signal,
	});
}

export function getGraphRagIndexJob(jobId, options = {}) {
	return knowledgeRequest(`/graphrag/index/jobs/${encodeURIComponent(jobId)}`, {
		signal: options.signal,
	});
}

export function importKnowledgeFiles(payload = {}, options = {}) {
	const form = new FormData();
	const files = Array.from(payload.files || []);
	const relativePaths = files.map((file, index) => payload.relativePaths?.[index] || file.webkitRelativePath || file.name);

	form.append('relativePaths', JSON.stringify(relativePaths));
	if (payload.reviewer) {
		form.append('reviewer', JSON.stringify(payload.reviewer));
	}

	for (const file of files) {
		form.append('files', file, file.name);
	}

	return knowledgeRequest('/graphrag/import', {
		method: 'POST',
		body: form,
		signal: options.signal,
	});
}

export function uploadKnowledgeStagingFiles(payload = {}, options = {}) {
	const form = new FormData();
	const files = Array.from(payload.files || []);
	const relativePaths = files.map((file, index) => payload.relativePaths?.[index] || file.webkitRelativePath || file.name);

	form.append('relativePaths', JSON.stringify(relativePaths));
	if (payload.reviewer) {
		form.append('reviewer', JSON.stringify(payload.reviewer));
	}

	for (const file of files) {
		form.append('files', file, file.name);
	}

	return knowledgeRequest('/graphrag/staging/upload', {
		method: 'POST',
		body: form,
		signal: options.signal,
	});
}

export function getKnowledgeStagingItems(params = {}, options = {}) {
	const query = new URLSearchParams(params).toString();
	return knowledgeRequest(`/graphrag/staging${query ? `?${query}` : ''}`, {
		signal: options.signal,
	});
}

export function deleteKnowledgeStagingItem(stagingId, options = {}) {
	return knowledgeRequest(`/graphrag/staging/${encodeURIComponent(stagingId)}`, {
		method: 'DELETE',
		signal: options.signal,
	});
}

export function stageKnowledgeDocumentsFromSource(payload = {}, options = {}) {
	return knowledgeRequest('/graphrag/staging/from-source', {
		method: 'POST',
		body: JSON.stringify({
			sourceIds: Array.isArray(payload.sourceIds) ? payload.sourceIds : [],
			documentIds: Array.isArray(payload.documentIds) ? payload.documentIds : [],
			source: payload.source || 'chat_upload',
			reviewer: payload.reviewer || null,
		}),
		signal: options.signal,
	});
}

export function ingestKnowledgeStagingItems(payload = {}, options = {}) {
	return knowledgeRequest('/graphrag/staging/ingest', {
		method: 'POST',
		body: JSON.stringify({
			stagingIds: Array.isArray(payload.stagingIds) ? payload.stagingIds : [],
			trigger: payload.trigger || 'manual',
		}),
		signal: options.signal,
	});
}

export function removeChatTemporaryDocument(documentId, options = {}) {
	return knowledgeRequest(`/graphrag/chat-temporary/${encodeURIComponent(documentId)}`, {
		method: 'DELETE',
		signal: options.signal,
	});
}

export function getKnowledgeImportJob(jobId, options = {}) {
	return knowledgeRequest(`/graphrag/import/${encodeURIComponent(jobId)}`, {
		signal: options.signal,
	});
}

export function getReviewPolicies(params = {}, options = {}) {
	const query = new URLSearchParams(params).toString();
	return knowledgeRequest(`/review/policies${query ? `?${query}` : ''}`, {
		signal: options.signal,
	});
}

export function getReviewPolicyContent(reviewId, options = {}) {
	return knowledgeRequest(`/review/policies/${encodeURIComponent(reviewId)}/content`, {
		signal: options.signal,
	});
}

export function approveReviewPolicy(reviewId, payload = {}, options = {}) {
	return knowledgeRequest(`/review/policies/${encodeURIComponent(reviewId)}/approve`, {
		method: 'POST',
		body: JSON.stringify(payload),
		signal: options.signal,
	});
}

export function rejectReviewPolicy(reviewId, payload = {}, options = {}) {
	return knowledgeRequest(`/review/policies/${encodeURIComponent(reviewId)}/reject`, {
		method: 'POST',
		body: JSON.stringify(payload),
		signal: options.signal,
	});
}
