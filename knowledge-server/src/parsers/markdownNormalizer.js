export function toMarkdownDocument({
  title = '',
  metadata = {},
  content = '',
  sourcePath = '',
  sourceUrl = '',
  ocrText = '',
  aiExtract = null
} = {}) {
  const lines = [];

  lines.push(`# ${title || 'Untitled Document'}`);
  lines.push('');
  lines.push('## Metadata');
  lines.push('');

  for (const [key, value] of Object.entries({
    sourcePath,
    sourceUrl,
    ...metadata
  })) {
    if (value === undefined || value === null || value === '') continue;
    lines.push(`- ${key}: ${String(value)}`);
  }

  lines.push('');
  lines.push('## Content');
  lines.push('');
  lines.push(content || 'No content extracted.');
  lines.push('');

  if (ocrText) {
    lines.push('## OCR Text');
    lines.push('');
    lines.push(ocrText);
    lines.push('');
  }

  if (aiExtract) {
    lines.push('## AI Extract');
    lines.push('');
    lines.push('```json');
    lines.push(JSON.stringify(aiExtract, null, 2));
    lines.push('```');
    lines.push('');
  }

  return lines.join('\n');
}

export function normalizeMultilineText(text = '') {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
