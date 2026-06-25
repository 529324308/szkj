import { env } from '../config/env.js';
import { buildKnowledgeChatPrompt } from '../prompts/knowledgeChatPrompt.js';
import { chatWithLocalModel, listLocalModels } from '../services/llmService.js';
import { retrievePolicyEvidence } from '../services/knowledgeRetrievalService.js';
import { sendJson } from '../utils/http.js';
import { readJsonBody } from '../utils/requestBody.js';

export async function handleKnowledgeModelsRequest(_req, res) {
  const models = await listLocalModels();
  sendJson(res, 200, {
    ok: true,
    defaultModel: models.defaultModel,
    models: models.models
  });
}

export async function handleKnowledgeChatRequest(req, res) {
  const body = await readJsonBody(req);
  const question = String(body?.question || body?.input?.text || '').trim();
  const messages = Array.isArray(body?.messages) ? body.messages : [];
  const requestedModel = String(body?.model || '').trim();

  if (!question && messages.length === 0) {
    sendJson(res, 400, {
      ok: false,
      error: {
        code: 'INVALID_REQUEST',
        message: 'question or messages is required.'
      }
    });
    return;
  }

  const effectiveQuestion = question || messages[messages.length - 1]?.content || '';
  const retrieval = await retrievePolicyEvidence(effectiveQuestion, {
    topK: 4
  });

  const groundedPrompt = [
    buildKnowledgeChatPrompt(),
    '',
    retrieval.citations.length > 0
      ? `已明确检索到 ${retrieval.citations.length} 条政策资料，请基于这些资料直接回答，不要再说“未检索到依据”。`
      : '当前没有检索到直接资料，请明确说明依据不足。',
    '回答时优先概括，不要逐字复制长段原文。',
    '如果资料已经包含范围、公开形式、申请流程、收费、监督救济等内容，请直接按这些要点总结。',
    '',
    retrieval.contextText || '未检索到可用资料。'
  ].join('\n');

  const result = await chatWithLocalModel({
    question,
    messages,
    model: requestedModel || env.ollamaDefaultModel,
    role: retrieval.citations.length > 0 ? 'reasoning' : 'chat',
    systemPrompt: groundedPrompt
  });

  sendJson(res, 200, {
    ok: true,
    mode: retrieval.citations.length > 0 ? 'ragflow_grounded' : 'llm_only',
    answer: result.content,
    thinking: result.thinking,
    model: result.model,
    citations: retrieval.citations,
    sourcePreview: retrieval.sourcePreview,
    done: result.done
  });
}
