import { describe, expect, it } from 'vitest';
import { renderChatMarkdown } from './markdown';

describe('聊天 Markdown', () => {
  it('渲染常用的标题、强调与列表，不保留 Markdown 符号', () => {
    const html = renderChatMarkdown('## 今日重点\n\n**先做重要的事**\n\n- 一项\n- 二项');
    expect(html).toContain('<h2>今日重点</h2>');
    expect(html).toContain('<strong>先做重要的事</strong>');
    expect(html).toContain('<li>一项</li>');
    expect(html).not.toContain('**');
  });

  it('兼容中文正文紧接粗体结束标记', () => {
    const html = renderChatMarkdown(
      '时间节奏\n\n比较稳妥的预期是：**以诚恳态度打好底子，等到对方状态回升，自然会有转机。**具体时间不必强推。',
    );

    expect(html).toContain(
      '<strong>以诚恳态度打好底子，等到对方状态回升，自然会有转机。</strong>具体时间',
    );
    expect(html).not.toContain('**');
  });

  it('兼容下划线粗体且保留内部行内 Markdown', () => {
    const html = renderChatMarkdown('__先看[重点](https://example.com)。__然后再行动。');

    expect(html).toContain('<strong>先看<a href="https://example.com"');
    expect(html).toContain('</a>。</strong>然后再行动');
    expect(html).not.toContain('__');
  });

  it('不处理代码片段里的粗体符号', () => {
    const html = renderChatMarkdown('`**不是粗体。**后续`');

    expect(html).toContain('<code>**不是粗体。**后续</code>');
  });

  it('移除原始 HTML、危险链接和外部图片', () => {
    const html = renderChatMarkdown('<script>alert(1)</script>\n[危险](javascript:alert(1))\n![追踪](https://example.com/a.png)');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('<img');
    expect(html).toContain('危险');
    expect(html).toContain('追踪');
  });
});
