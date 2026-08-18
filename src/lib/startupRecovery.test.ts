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
    sessionStorage,
    document: { getElementById: () => ({ childElementCount: 1 }) },
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
  return { window, listeners, stored, unregister, deleteCache, replace, replaceState, ScriptAsset };
}

describe('启动资源恢复', () => {
  it('旧哈希脚本加载失败时清理应用缓存、注销旧 SW 并保留原参数刷新', async () => {
    const context = createRecoveryContext();

    context.listeners.error[0]?.({ target: new context.ScriptAsset('https://sydf.cc/assets/app-old.js') });
    await vi.waitFor(() => expect(context.replace).toHaveBeenCalledTimes(1));

    expect(context.unregister).toHaveBeenCalledTimes(1);
    expect(context.deleteCache).toHaveBeenCalledWith('workbox-precache-old');
    expect(context.deleteCache).toHaveBeenCalledWith('shiyue-app-assets-v1');
    expect(context.deleteCache).not.toHaveBeenCalledWith('shiyue-divination-theme-images-v6');
    const reloadUrl = new URL(String(context.replace.mock.calls[0]?.[0]));
    expect(reloadUrl.searchParams.get('__update')).toBe('old');
    expect(reloadUrl.searchParams.get('__recover')).toMatch(/^\d+$/);
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
