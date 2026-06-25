export function parsePdfDocument(filePath) {
  return {
    parser: 'pdf',
    status: 'unsupported',
    title: '',
    metadata: {},
    content: '',
    markdown: '',
    imageFiles: [],
    error: `PDF parser is not implemented yet for file: ${filePath}`
  };
}
