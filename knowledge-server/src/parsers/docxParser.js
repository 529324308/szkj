export function parseDocxDocument(filePath) {
  return {
    parser: 'docx',
    status: 'unsupported',
    title: '',
    metadata: {},
    content: '',
    markdown: '',
    imageFiles: [],
    error: `DOCX parser is not implemented yet for file: ${filePath}`
  };
}
