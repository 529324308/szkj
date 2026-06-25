import { buildDocumentExtractPrompt } from '../prompts/documentExtractPrompt.js';
import { extractJsonObject } from '../utils/json.js';
import { chatWithLocalModel } from './llmService.js';

export async function runAiDocumentExtraction({
  sourceType = 'document',
  title = '',
  metadata = {},
  content = '',
  ocrText = ''
} = {}) {
  const prompt = buildDocumentExtractPrompt({ sourceType });
  const payload = [
    `TITLE:\n${title || ''}`,
    '',
    `METADATA:\n${JSON.stringify(metadata || {}, null, 2)}`,
    '',
    `CONTENT:\n${content || ''}`,
    '',
    `OCR_TEXT:\n${ocrText || ''}`
  ].join('\n');

  try {
    const response = await chatWithLocalModel({
      question: payload,
      model: '',
      role: 'extract',
      systemPrompt: prompt
    });

    const structured = extractJsonObject(response.content);
    return {
      status: structured ? 'parsed' : 'failed',
      model: response.model,
      raw: response.content,
      thinking: response.thinking,
      structuredData: structured,
      reason: structured ? '' : 'Model response did not contain a valid JSON object.'
    };
  } catch (error) {
    return {
      status: 'failed',
      model: '',
      raw: '',
      thinking: '',
      structuredData: null,
      reason: error.message
    };
  }
}
