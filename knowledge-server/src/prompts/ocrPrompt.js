export function buildOcrPrompt() {
  return [
    '请读取这张图片中的文字内容。',
    '目标是 OCR 提取，不要求总结，不要求解释。',
    '如果图片中的文字很多，请尽量完整输出。',
    '如果图片无法识别，请明确输出：无法识别。'
  ].join('\n');
}
