async function main() {
  const response = await fetch('http://127.0.0.1:3001/api/knowledge/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      question: '政府信息公开指南主要规定了什么内容？'
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  if (!data.ok) {
    throw new Error(data?.error?.message || 'knowledge chat failed');
  }

  if (!Array.isArray(data.citations) || data.citations.length === 0) {
    throw new Error('No citations were returned.');
  }

  console.log('[T10] Mode:', data.mode);
  console.log('[T10] Citation count:', data.citations.length);
  console.log('[T10] First citation title:', data.citations[0]?.title || '');
  console.log('[T10] Answer preview:', String(data.answer || '').slice(0, 160));
  console.log('[T10] Smoke test passed.');
}

main().catch((error) => {
  console.error('[T10] Smoke test failed:', error.message);
  process.exitCode = 1;
});
