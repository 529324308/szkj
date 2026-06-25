import { readFileSync } from 'node:fs';
import { TextDecoder } from 'node:util';
import { normalizeMultilineText, toMarkdownDocument } from './markdownNormalizer.js';

export function parseHtmlDocument(filePath, options = {}) {
  const html = readHtmlWithDetectedEncoding(filePath);
  const cleaned = removeNoise(html);
  const title = extractTitle(cleaned) || options.fallbackTitle || 'Untitled HTML Document';
  const meta = extractMeta(cleaned);
  const content = extractBodyText(cleaned);
  const normalizedContent = normalizeMultilineText(content);

  return {
    parser: 'html',
    status: 'parsed',
    title,
    metadata: meta,
    content: normalizedContent,
    imageFiles: [],
    markdown: toMarkdownDocument({
      title,
      metadata: meta,
      content: normalizedContent,
      sourcePath: filePath,
      sourceUrl: options.sourceUrl || ''
    })
  };
}

function readHtmlWithDetectedEncoding(filePath) {
  const buffer = readFileSync(filePath);
  const asciiHead = buffer.slice(0, 8192).toString('latin1');
  const detectedCharset = detectHtmlCharset(asciiHead);
  const candidates = buildCharsetCandidates(detectedCharset);

  for (const charset of candidates) {
    try {
      const decoder = new TextDecoder(charset, { fatal: false });
      const text = decoder.decode(buffer);
      if (looksReasonableDecodedText(text)) {
        return text;
      }
    } catch {
      // Try the next charset candidate.
    }
  }

  return buffer.toString('utf8');
}

function detectHtmlCharset(headText) {
  const metaCharsetMatch = headText.match(/<meta[^>]+charset=["']?\s*([^"'>\s/]+)/i);
  if (metaCharsetMatch?.[1]) {
    return normalizeCharset(metaCharsetMatch[1]);
  }

  const contentTypeMatch = headText.match(/content=["'][^"']*charset=([^"'>;\s]+)/i);
  if (contentTypeMatch?.[1]) {
    return normalizeCharset(contentTypeMatch[1]);
  }

  return '';
}

function normalizeCharset(value) {
  const charset = String(value || '').trim().toLowerCase();
  if (!charset) return '';
  if (charset === 'gb2312' || charset === 'gbk') return 'gbk';
  if (charset === 'gb18030') return 'gb18030';
  if (charset === 'utf8') return 'utf-8';
  return charset;
}

function buildCharsetCandidates(detectedCharset) {
  const candidates = [];

  if (detectedCharset) {
    candidates.push(detectedCharset);
  }

  for (const item of ['utf-8', 'gb18030', 'gbk']) {
    if (!candidates.includes(item)) {
      candidates.push(item);
    }
  }

  return candidates;
}

function looksReasonableDecodedText(text) {
  if (!text) return false;
  const replacementCount = (text.match(/\uFFFD/g) || []).length;
  const visibleLength = text.replace(/\s+/g, '').length;
  if (visibleLength === 0) return false;
  return replacementCount < Math.max(5, visibleLength * 0.01);
}

function removeNoise(html) {
  return String(html || '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
}

function extractTitle(html) {
  const h1Match = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1Match) {
    const text = stripHtml(h1Match[1]);
    if (text) return text;
  }

  const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch) {
    const text = stripHtml(titleMatch[1]);
    if (text) return text;
  }

  return '';
}

function extractMeta(html) {
  const metadata = {};
  const metaPattern = /<meta\b[^>]*name=(?:"([^"]+)"|'([^']+)')[^>]*content=(?:"([^"]*)"|'([^']*)')[^>]*>/gi;
  let match;

  while ((match = metaPattern.exec(html)) !== null) {
    const name = (match[1] || match[2] || '').trim();
    const value = (match[3] || match[4] || '').trim();
    if (!name || !value) continue;
    metadata[name] = decodeHtmlEntities(value);
  }

  return metadata;
}

function extractBodyText(html) {
  const bodyMatch = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  const source = bodyMatch ? bodyMatch[1] : html;

  return decodeHtmlEntities(
    source
      .replace(/<(div|section|article|p|li|tr|h1|h2|h3|h4|h5|h6|br)\b[^>]*>/gi, '\n')
      .replace(/<\/(div|section|article|p|li|tr|h1|h2|h3|h4|h5|h6)>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/[ \t]+/g, ' ')
  );
}

function stripHtml(value) {
  return decodeHtmlEntities(
    String(value || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

function decodeHtmlEntities(value) {
  return String(value || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}
