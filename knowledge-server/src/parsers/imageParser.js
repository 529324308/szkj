export function parseImageDocument(filePath, options = {}) {
  return {
    parser: 'image',
    status: 'parsed',
    title: options.fallbackTitle || 'Image Document',
    metadata: {
      sourceType: 'image'
    },
    content: '',
    markdown: '',
    imageFiles: [filePath]
  };
}
