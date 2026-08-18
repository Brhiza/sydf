import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const source = readFileSync(new URL('../../public/startup-recovery.js', import.meta.url), 'utf8');

function createRecoveryContext(href = 'https://sydf.cc/?__update=old') {
  const listeners: Record<string, Array<(event: Record<string, unknown>) => void>> = {};
  const stored = new Map<string, string>();
  const unregister = vi.fn().mockResolvedValue(true);
  const deleteCache = vi.fn().mockResolvedValue(true);
  const replace = vi.fn();
  const replaceState = vi.fn();
  const freshShell = '<!doctype html><html><body><div id="app"></div><script type="module" src="/assets/app-new.js"></script></body></html>';
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    headers: { get: () => 'text/html; charset=utf-8' },
    text: vi.fn().mockResolvedValue(freshShell),
  });
  const elements: Array<Record<string, unknown>> = [];
  class ScriptAsset {
    constructor(readonly src: string) {}
  }
  class LinkAsset {
    constructor(readonly href: string) {}
  }
  const location = {
    href,
    origin: new URL(href).origin,
    replace,
    reload: vi.fn(),
  };
  const app = { childElementCount: 0, replaceChildren: vi.fn() };
  const document = {
    getElementById: () => app,
    createElement: vi.fn((tag: string) => {
      const listeners: Record<string, () => void> = {};
      const element = {
        tag,
        style: {},
        appendChild: vi.fn(),
        setAttribute: vi.fn(),
        addEventListener: vi.fn((type: string, listener: () => void) => { listeners[type] = listener; }),
        click: () => listeners.click?.(),
      };
      elements.push(element);
      return element;
    }),
  };
  const window = {
    caches: {},
    addEventListener(type: string, listener: (event: Record<string, unknown>) => void) {
      (listeners[type] ||= []).push(listener);
    },
  } as Record<string, unknown>;
  const sessionStorage = {
    getItem: (key: string) => stored.get(key) || null,
    setItem: (key: string, value: string) => stored.set(key, value),
    removeItem: (key: string) => stored.delete(key),
  };
  runInNewContext(source, {
    window,
    navigator: { serviceWorker: { getRegistrations: vi.fn().mockResolvedValue([{ unregister }]) } },
    caches: {
      keys: vi.fn().mockResolvedValue(['workbox-precache-old', 'shiyue-app-assets-v1', 'shiyue-divination-theme-images-v6']),
      delete: deleteCache,
    },
    fetch: fetchMock,
    sessionStorage,
    document,
    HTMLScriptElement: ScriptAsset,
    HTMLLinkElement: LinkAsset,
    location,
    history: { state: null, replaceState },
    URL,
    Date,
    JSON,
    Number,
    String,
    Promise,
    setTimeout,
    clearTimeout,
  });
  return { window, listeners, stored, unregister, deleteCache, replace, replaceState, fetchMock, freshShell, elements, ScriptAsset };
}

describe('启动资源恢复', () => {
  it('旧哈希脚本加载失败时清理应用缓存、注销旧 SW 并验证最新页面壳后重新导航', async () => {
    const context = createRecoveryContext();

    context.listeners.error[0]?.({ target: new context.ScriptAsset('https://sydf.cc/assets/app-old.js') });
    await vi.waitFor(() => expect(context.replace).toHaveBeenCalledTimes(1));

    expect(context.unregister).toHaveBeenCalledTimes(1);
    expect(context.deleteCache).toHaveBeenCalledWith('workbox-precache-old');
    expect(context.deleteCache).toHaveBeenCalledWith('shiyue-app-assets-v1');
    expect(context.deleteCache).not.toHaveBeenCalledWith('shiyue-divination-theme-images-v6');
    expect(context.fetchMock).toHaveBeenCalledTimes(1);
    const reloadUrl = new URL(String(context.fetchMock.mock.calls[0]?.[0]));
    expect(reloadUrl.searchParams.has('__update')).toBe(false);
    expect(reloadUrl.searchParams.get('__recover')).toMatch(/^\d+$/);
  });

  it('最新页面壳请求失败时仍带随机参数导航兜底', async () => {
    const context = createRecoveryContext();
    context.fetchMock.mockRejectedValueOnce(new Error('offline'));

    context.listeners.error[0]?.({ target: new context.ScriptAsset('https://sydf.cc/assets/app-old.js') });
    await vi.waitFor(() => expect(context.replace).toHaveBeenCalledTimes(1));

    const reloadUrl = new URL(String(context.replace.mock.calls[0]?.[0]));
    expect(reloadUrl.searchParams.has('__update')).toBe(false);
    expect(reloadUrl.searchParams.get('__recover')).toMatch(/^\d+$/);
  });

  it('自动恢复达到上限后，重新加载按钮会再次清理并强制获取最新页面', async () => {
    const context = createRecoveryContext();
    context.stored.set('shiyue:startup-recovery', JSON.stringify({ attempts: 3, at: Date.now() }));

    context.listeners.error[0]?.({ target: new context.ScriptAsset('https://sydf.cc/assets/app-old.js') });
    const retryButton = context.elements.find((element) => element.tag === 'button') as { click: () => void } | undefined;
    expect(retryButton).toBeDefined();

    retryButton?.click();
    await vi.waitFor(() => expect(context.replace).toHaveBeenCalledTimes(1));

    expect(context.unregister).toHaveBeenCalledTimes(1);
    expect(context.deleteCache).toHaveBeenCalledWith('workbox-precache-old');
    expect(context.fetchMock).toHaveBeenCalledTimes(1);
  });

  it('应用成功启动后清除恢复次数并整理地址', () => {
    const context = createRecoveryContext('https://sydf.cc/?__update=new&__recover=123');
    context.stored.set('shiyue:startup-recovery', JSON.stringify({ attempts: 1, at: Date.now() }));

    const bridge = context.window.__SHIYUE_STARTUP_RECOVERY__ as { markReady: () => void };
    bridge.markReady();

    expect(context.stored.has('shiyue:startup-recovery')).toBe(false);
    expect(context.replaceState).toHaveBeenCalledTimes(1);
    const cleanedUrl = new URL(String(context.replaceState.mock.calls[0]?.[2]));
    expect(cleanedUrl.searchParams.get('__update')).toBe('new');
    expect(cleanedUrl.searchParams.has('__recover')).toBe(false);
  });
});
