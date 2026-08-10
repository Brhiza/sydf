import { Marked, Renderer, type TokenizerAndRendererExtension } from 'marked';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeLinkHref(value: string) {
  const href = value.trim().replace(/[\u0000-\u001F\u007F]/g, '');
  if (!href) return '';
  if (href.startsWith('#') || href.startsWith('/') || href.startsWith('./') || href.startsWith('../')) return href;
  try {
    const protocol = new URL(href, 'https://shiyue.local').protocol;
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(protocol) ? href : '';
  } catch {
    return '';
  }
}

const renderer = new Renderer();

// AI 常会省略粗体结束标记后的空格，例如“**重点。**后续”。
// CommonMark 会把这种中日韩文本视为普通字符，这里只放宽中日韩正文边界，
// 避免全局替换 Markdown 标记或改变英文、代码片段等标准语义。
const cjkStrongExtension: TokenizerAndRendererExtension = {
  name: 'cjkStrong',
  level: 'inline',
  start(source) {
    const asteriskIndex = source.indexOf('**');
    const underscoreIndex = source.indexOf('__');
    const indexes = [asteriskIndex, underscoreIndex].filter((index) => index >= 0);
    return indexes.length ? Math.min(...indexes) : undefined;
  },
  tokenizer(source) {
    const match = /^(\*\*|__)(?!\s)([^\n]*?\S)\1(?=[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}])/u.exec(source);
    if (!match) return undefined;

    return {
      type: 'cjkStrong',
      raw: match[0],
      text: match[2],
      tokens: this.lexer.inlineTokens(match[2]),
    };
  },
  renderer(token) {
    return `<strong>${this.parser.parseInline(token.tokens || [])}</strong>`;
  },
  childTokens: ['tokens'],
};

const markdown = new Marked({ extensions: [cjkStrongExtension] });

// AI 返回的原始 HTML 不属于聊天协议，直接丢弃，避免通过 v-html 注入脚本或样式。
renderer.html = () => '';
renderer.image = ({ text }) => escapeHtml(text || '图片');
renderer.link = function ({ href, title, tokens }) {
  const label = this.parser.parseInline(tokens);
  const safeHref = safeLinkHref(href);
  if (!safeHref) return label;
  const titleAttribute = title ? ` title="${escapeHtml(title)}"` : '';
  return `<a href="${escapeHtml(safeHref)}"${titleAttribute} target="_blank" rel="noopener noreferrer">${label}</a>`;
};

export function renderChatMarkdown(source: string) {
  if (!source.trim()) return '';
  return markdown.parse(source, {
    async: false,
    breaks: true,
    gfm: true,
    renderer,
  });
}
