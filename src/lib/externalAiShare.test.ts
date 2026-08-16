import { describe, expect, it } from 'vitest';
import { buildExternalAiShareData, getExternalAiAppUrl, isAndroidUserAgent, isIosDevice } from './externalAiShare';

describe('移动端外部 AI 分享', () => {
  it('把完整提示词交给系统分享菜单', () => {
    const data = buildExternalAiShareData('【问题】\n这件事怎么处理？');

    expect(data).toEqual({
      title: '时月东方解读提示词',
      text: '【问题】\n这件事怎么处理？',
    });
  });

  it('识别 iPhone 和使用桌面标识的 iPad', () => {
    expect(isIosDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)')).toBe(true);
    expect(isIosDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X)', 'MacIntel', 5)).toBe(true);
    expect(isIosDevice('Mozilla/5.0 (Windows NT 10.0)', 'Win32', 0)).toBe(false);
  });

  it('识别需要显示定向应用入口的移动端', () => {
    expect(isAndroidUserAgent('Mozilla/5.0 (Linux; Android 16)')).toBe(true);
    expect(isAndroidUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)')).toBe(false);
  });

  it('定向按钮使用对应应用入口', () => {
    expect(getExternalAiAppUrl('doubao')).toBe('doubao://');
    expect(getExternalAiAppUrl('deepseek')).toBe('dpsk://chat/new');
  });
});
