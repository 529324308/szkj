import { readFileSync } from 'node:fs';
import { env } from '../config/env.js';

function normalizeModelEntry(item) {
  return {
    name: item?.name || item?.model || '',
    model: item?.model || item?.name || '',
    modifiedAt: item?.modified_at || '',
    size: item?.size || 0,
    family: item?.details?.family || '',
    parameterSize: item?.details?.parameter_size || '',
    quantizationLevel: item?.details?.quantization_level || '',
    capabilities: Array.isArray(item?.capabilities) ? item.capabilities : []
  };
}

async function ollamaFetch(pathname, options = {}) {
  const url = new URL(pathname, env.ollamaBaseUrl).toString();
  const response = await fetch(url, options);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Ollama request failed: HTTP ${response.status} ${text}`.trim());
  }

  return response;
}

export async function listLocalModels() {
  const response = await ollamaFetch('/api/tags');
  const data = await response.json();
  const models = Array.isArray(data?.models) ? data.models.map(normalizeModelEntry) : [];
  return {
    defaultModel: env.ollamaDefaultModel || models[0]?.name || '',
    roles: {
      chat: env.ollamaChatModel || env.ollamaDefaultModel || models[0]?.name || '',
      extract: env.ollamaExtractModel || env.ollamaChatModel || env.ollamaDefaultModel || models[0]?.name || '',
      reasoning: env.ollamaReasoningModel || env.ollamaChatModel || env.ollamaDefaultModel || models[0]?.name || '',
      vision: env.ollamaVisionModel || env.ollamaDefaultModel || models[0]?.name || '',
      embedding: env.ollamaEmbeddingModel || ''
    },
    models
  };
}

export async function getLlmHealthSnapshot() {
  try {
    const data = await listLocalModels();
    return {
      status: 'up',
      defaultModel: data.defaultModel,
      roles: data.roles,
      modelCount: data.models.length,
      models: data.models.map((item) => item.name)
    };
  } catch (error) {
    return {
      status: 'unreachable',
      message: error.message
    };
  }
}

export async function chatWithLocalModel({
  question,
  messages = [],
  model,
  systemPrompt = '',
  role = 'chat'
} = {}) {
  const fallbackModelData = await listLocalModels();
  const roleModelMap = {
    chat: env.ollamaChatModel,
    extract: env.ollamaExtractModel,
    reasoning: env.ollamaReasoningModel
  };
  const resolvedModel =
    model ||
    roleModelMap[role] ||
    env.ollamaDefaultModel ||
    fallbackModelData.models[0]?.name;

  if (!resolvedModel) {
    throw new Error('No local Ollama model is available.');
  }

  const normalizedMessages = [];

  if (systemPrompt) {
    normalizedMessages.push({
      role: 'system',
      content: systemPrompt
    });
  }

  if (Array.isArray(messages) && messages.length > 0) {
    for (const item of messages) {
      if (!item?.role || !item?.content) continue;
      normalizedMessages.push({
        role: item.role,
        content: item.content
      });
    }
  } else if (question) {
    normalizedMessages.push({
      role: 'user',
      content: question
    });
  }

  const response = await ollamaFetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: resolvedModel,
      messages: normalizedMessages,
      stream: false
    })
  });

  const data = await response.json();
  return {
    model: resolvedModel,
    content: data?.message?.content || '',
    thinking: data?.message?.thinking || data?.message?.reasoning || '',
    done: Boolean(data?.done)
  };
}

export async function chatWithVisionModel({
  prompt,
  imagePaths = [],
  model
} = {}) {
  const fallbackModelData = await listLocalModels();
  const resolvedModel =
    model ||
    env.ollamaVisionModel ||
    fallbackModelData.roles?.vision ||
    env.ollamaDefaultModel ||
    fallbackModelData.models[0]?.name;

  if (!resolvedModel) {
    throw new Error('No local Ollama vision model is available.');
  }

  if (!Array.isArray(imagePaths) || imagePaths.length === 0) {
    throw new Error('imagePaths is required for vision model calls.');
  }

  const images = imagePaths.map((filePath) => readFileSync(filePath).toString('base64'));
  const response = await ollamaFetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: resolvedModel,
      messages: [
        {
          role: 'user',
          content: prompt || '',
          images
        }
      ],
      stream: false
    })
  });

  const data = await response.json();
  return {
    model: resolvedModel,
    content: data?.message?.content || '',
    thinking: data?.message?.thinking || data?.message?.reasoning || '',
    done: Boolean(data?.done)
  };
}
