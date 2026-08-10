import { renderChatMarkdown } from './markdown';

export interface ChatExportItem {
  role: 'user' | 'assistant' | 'reading';
  label: string;
  content: string;
}

const MAX_IMAGE_HEIGHT = 30000;
const MAX_IMAGE_CHARACTERS = 30000;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function exportTimestamp(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
}

export function buildChatDocument(items: ChatExportItem[], date = new Date()) {
  const messages = items.map((item) => `
    <section class="message ${item.role}">
      <div class="label">${escapeHtml(item.label)}</div>
      <div class="content">${renderChatMarkdown(item.content)}</div>
    </section>`).join('');
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>时月东方对话摘录</title>
  <style>
    body { color: #2f2936; font-family: "Microsoft YaHei", "PingFang SC", sans-serif; line-height: 1.75; margin: 36px auto; max-width: 760px; }
    h1 { font-size: 24px; margin: 0 0 4px; }
    .meta { color: #8d8494; font-size: 12px; margin-bottom: 28px; }
    .message { border-radius: 12px; margin: 0 0 16px; padding: 14px 16px; }
    .message.assistant { background: #f1ebf7; }
    .message.user { background: #e8def1; margin-left: 12%; }
    .message.reading { background: #f8f4fa; border: 1px solid #ded2e8; margin-left: 12%; }
    .label { color: #7a6d85; font-size: 12px; font-weight: 600; margin-bottom: 5px; }
    .content > :first-child { margin-top: 0; }
    .content > :last-child { margin-bottom: 0; }
    .content h1, .content h2, .content h3, .content h4 { font-size: 16px; margin: 14px 0 6px; }
    .content p, .content ul, .content ol, .content blockquote, .content pre, .content table { margin: 0 0 9px; }
    .content table { border-collapse: collapse; width: 100%; }
    .content th, .content td { border-bottom: 1px solid #ddd4e3; padding: 6px 8px; text-align: left; }
    .content pre { background: #f8f6fa; overflow-wrap: anywhere; padding: 10px; white-space: pre-wrap; }
    footer { color: #99909f; font-size: 11px; margin-top: 28px; text-align: center; }
  </style>
</head>
<body>
  <h1>时月东方 · 对话摘录</h1>
  <div class="meta">导出时间：${escapeHtml(date.toLocaleString('zh-CN', { hour12: false }))} · 共 ${items.length} 条</div>
  ${messages}
  <footer>生成内容完全基于 AI 模型，不构成任何形式建议</footer>
</body>
</html>`;
}

function markdownToPlainText(content: string) {
  const rendered = renderChatMarkdown(content).replace(/<\/(?:p|h[1-6]|li|blockquote|pre|tr)>/gi, '$&\n');
  const parsed = new DOMParser().parseFromString(rendered, 'text/html');
  return (parsed.body.textContent || content).replace(/\n{3,}/g, '\n\n').trim();
}

function wrapCanvasText(context: CanvasRenderingContext2D, content: string, maxWidth: number) {
  const lines: string[] = [];
  content.split(/\n/).forEach((paragraph) => {
    if (!paragraph) {
      lines.push('');
      return;
    }
    let line = '';
    for (const character of paragraph) {
      const candidate = line + character;
      if (line && context.measureText(candidate).width > maxWidth) {
        lines.push(line);
        line = character;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
  });
  return lines;
}

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.fill();
}

function dataUrlToBlob(dataUrl: string) {
  const [header, base64 = ''] = dataUrl.split(',');
  const mimeType = /data:([^;]+)/.exec(header)?.[1] || 'image/png';
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mimeType });
}

export function createChatShareImage(items: ChatExportItem[], date = new Date()) {
  const characterCount = items.reduce((total, item) => total + item.content.length, 0);
  if (!items.length) throw new Error('请先选择要分享的消息。');
  if (characterCount > MAX_IMAGE_CHARACTERS) throw new Error('所选内容过长，请减少消息后再生成图片。');

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('当前浏览器无法生成分享图片。');

  const width = 1080;
  const outerPadding = 70;
  const bubblePaddingX = 30;
  const bubblePaddingY = 25;
  const lineHeight = 43;
  const messageGap = 28;
  context.font = '28px "Microsoft YaHei", "PingFang SC", sans-serif';

  const layouts = items.map((item) => {
    const bubbleWidth = item.role === 'assistant' ? width - outerPadding * 2 : Math.round((width - outerPadding * 2) * .88);
    const lines = wrapCanvasText(context, markdownToPlainText(item.content), bubbleWidth - bubblePaddingX * 2);
    const contentHeight = Math.max(lineHeight, lines.length * lineHeight);
    return { item, bubbleWidth, lines, height: 30 + 16 + contentHeight + bubblePaddingY * 2 };
  });
  const height = 180 + layouts.reduce((total, layout) => total + layout.height + messageGap, 0) + 110;
  if (height > MAX_IMAGE_HEIGHT) throw new Error('所选内容生成的图片过长，请减少消息后重试。');

  canvas.width = width;
  canvas.height = height;
  context.fillStyle = '#faf8fb';
  context.fillRect(0, 0, width, height);

  context.fillStyle = '#332c3b';
  context.font = '600 40px "Microsoft YaHei", "PingFang SC", sans-serif';
  context.fillText('时月东方 · 对话摘录', outerPadding, 78);
  context.fillStyle = '#968c9d';
  context.font = '22px "Microsoft YaHei", "PingFang SC", sans-serif';
  context.fillText(`${date.toLocaleString('zh-CN', { hour12: false })} · ${items.length} 条消息`, outerPadding, 122);

  let top = 168;
  layouts.forEach(({ item, bubbleWidth, lines, height: bubbleHeight }) => {
    const left = item.role === 'assistant' ? outerPadding : width - outerPadding - bubbleWidth;
    context.fillStyle = item.role === 'assistant' ? '#f0e9f6' : item.role === 'reading' ? '#f7f2f9' : '#e5d9ef';
    roundedRect(context, left, top, bubbleWidth, bubbleHeight, 24);
    context.fillStyle = '#776a81';
    context.font = '600 22px "Microsoft YaHei", "PingFang SC", sans-serif';
    context.fillText(item.label, left + bubblePaddingX, top + bubblePaddingY + 22);
    context.fillStyle = '#332d39';
    context.font = '28px "Microsoft YaHei", "PingFang SC", sans-serif';
    lines.forEach((line, lineIndex) => {
      context.fillText(line, left + bubblePaddingX, top + bubblePaddingY + 62 + lineIndex * lineHeight);
    });
    top += bubbleHeight + messageGap;
  });

  context.fillStyle = '#a199a7';
  context.font = '20px "Microsoft YaHei", "PingFang SC", sans-serif';
  context.textAlign = 'center';
  context.fillText('AI 生成内容仅供参考，不构成任何形式建议', width / 2, height - 48);
  context.textAlign = 'left';
  return {
    blob: dataUrlToBlob(canvas.toDataURL('image/png')),
    filename: `时月东方-对话摘录-${exportTimestamp(date)}.png`,
  };
}

export function createChatDocument(items: ChatExportItem[], date = new Date()) {
  if (!items.length) throw new Error('请先选择要导出的消息。');
  const html = `\ufeff${buildChatDocument(items, date)}`;
  return {
    blob: new Blob([html], { type: 'application/msword;charset=utf-8' }),
    filename: `时月东方-对话摘录-${exportTimestamp(date)}.doc`,
  };
}

export function downloadChatFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
