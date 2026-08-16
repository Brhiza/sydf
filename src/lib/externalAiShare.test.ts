import { describe, expect, it } from 'vitest';
import { buildAndroidTextShareIntent, externalAiShareUrl, isIosDevice } from './externalAiShare';

describe('移动端外部 AI 分享', () => {
  it('把完整提示词定向分享给豆包', () => {
    const intent = buildAndroidTextShareIntent('doubao', '【问题】\n这件事怎么处理？');

    expect(intent).toContain('action=android.intent.action.SEND');
    expect(intent).toContain('type=text/plain');
    expect(intent).toContain('package=com.larus.nova');
    expect(intent).toContain(`S.android.intent.extra.TEXT=${encodeURIComponent('【问题】\n这件事怎么处理？')}`);
    expect(intent).toContain(`S.browser_fallback_url=${encodeURIComponent('https://www.doubao.com/chat/')}`);
  });

  it('把完整提示词定向分享给 DeepSeek', () => {
    const intent = externalAiShareUrl('deepseek', '盘面资料', 'Mozilla/5.0 (Linux; Android 16)');

    expect(intent).toContain('package=com.deepseek.chat');
    expect(intent).toContain(`S.android.intent.extra.TEXT=${encodeURIComponent('盘面资料')}`);
  });

  it('非安卓环境使用对应的在线 AI 地址', () => {
    expect(externalAiShareUrl('doubao', '提示词', 'Mozilla/5.0 (iPhone)')).toBe('https://www.doubao.com/chat/');
    expect(externalAiShareUrl('deepseek', '提示词', 'Mozilla/5.0 (Windows NT 10.0)')).toBe('https://chat.deepseek.com/');
  });

  it('识别 iPhone 和使用桌面标识的 iPad', () => {
    expect(isIosDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)')).toBe(true);
    expect(isIosDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X)', 'MacIntel', 5)).toBe(true);
    expect(isIosDevice('Mozilla/5.0 (Windows NT 10.0)', 'Win32', 0)).toBe(false);
  });
});
