import { describe, expect, it } from 'vitest';
import { buildChatDocument, createChatDocument, type ChatExportItem } from './chatExport';

const items: ChatExportItem[] = [
  { role: 'user', label: '我', content: '接下来十年财运怎么样？' },
  { role: 'assistant', label: 'AI 解答', content: '## 总体\n\n需要结合大运与流年。' },
];

describe('chat export', () => {
  it('builds a readable Word-compatible document', () => {
    const html = buildChatDocument(items, new Date('2026-08-11T08:30:00'));
    expect(html).toContain('时月东方 · 对话摘录');
    expect(html).toContain('共 2 条');
    expect(html).toContain('<h2>总体</h2>');
    expect(html).toContain('接下来十年财运怎么样？');
  });

  it('creates a document blob with a stable filename', () => {
    const result = createChatDocument(items, new Date('2026-08-11T08:30:00'));
    expect(result.filename).toBe('时月东方-对话摘录-20260811-0830.doc');
    expect(result.blob.type).toBe('application/msword;charset=utf-8');
  });

  it('rejects an empty document selection', () => {
    expect(() => createChatDocument([])).toThrow('请先选择要导出的消息。');
  });
});
