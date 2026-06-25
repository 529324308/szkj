import path from 'node:path';
import { buildOcrPrompt } from '../prompts/ocrPrompt.js';
import { chatWithVisionModel } from './llmService.js';

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.bmp']);

export async function runOcrForFile(filePath) {
  const extension = path.extname(filePath).toLowerCase();

  if (!IMAGE_EXTENSIONS.has(extension)) {
    return {
      status: 'not_applicable',
      text: '',
      model: '',
      reason: `OCR is skipped for extension: ${extension || '(none)'}`
    };
  }

  try {
    const response = await chatWithVisionModel({
      prompt: buildOcrPrompt(),
      imagePaths: [filePath]
    });

    return {
      status: 'up',
      text: String(response.content || '').trim(),
      model: response.model,
      reason: ''
    };
  } catch (error) {
    return {
      status: 'failed',
      text: '',
      model: '',
      reason: error.message
    };
  }
}
