import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const source = readFileSync(new URL('../../public/startup-recovery.js', import.meta.url), 'utf8');

function createContext(controlled: boolean, href = 'https://app.example/tools?tab=ai&__recover=old#settings') {
  const stored = new Map<string, string>();
  const update = vi.fn().mockResolvedValue(undefined);
  const unregister = vi.fn().mockResolvedValue(true);
  const deleteCache = vi.fn().mockResolvedValue(true);
  const replace = vi.fn();
  const replaceState = vi.fn();
  const location = { href, replace };
  const window = {
    caches: {},
    setTimeout: (callback: () => void) => { callback(); return 1; },
  } as Record<string, unknown>;
  const sessionStorage = {
    getItem: (key: string) => stored.get(key) || null,
    setItem: (key: string, value: string) => stored.set(key, value),
    removeItem: (key: string) => stored.delete(key),
  };
  runInNewContext(source, {
    window,
    navigator: {
      serviceWorker: {
        controller: controlled ? {} : null,
        getRegistrations: vi.fn().mockResolvedValue([{ update, unregister }]),
      },
    },
    caches: {
      keys: vi.fn().mockResolvedValue(['workbox-precache-old', 'shiyue-app-assets-v1', 'shiyue-divination-theme-images-v6']),
      delete: deleteCache,
    },
    sessionStorage,
    location,
    history: { state: null, replaceState },
    URL,
    Date,
    Promise,
  });
  return { window, stored, update, unregister, deleteCache, replace, replaceState };
}

describe('旧 Service Worker 启动退役', () => {
  it('发现旧控制器时只在当前来源更新、清理并重新加载一次', async () => {
    const context = createContext(true);

    await vi.waitFor(() => expect(context.replace).toHaveBeenCalledTimes(1));
    expect(context.update).toHaveBeenCalledTimes(1);
    expect(context.unregister).toHaveBeenCalledTimes(1);
    expect(context.deleteCache).toHaveBeenCalledWith('workbox-precache-old');
    expect(context.deleteCache).toHaveBeenCalledWith('shiyue-app-assets-v1');
    expect(context.deleteCache).not.toHaveBeenCalledWith('shiyue-divination-theme-images-v6');
    const reloadUrl = new URL(String(context.replace.mock.calls[0]?.[0]));
    expect(reloadUrl.origin).toBe('https://app.example');
    expect(reloadUrl.pathname).toBe('/tools');
    expect(reloadUrl.searchParams.get('tab')).toBe('ai');
    expect(reloadUrl.searchParams.has('__recover')).toBe(false);
    expect(reloadUrl.searchParams.has('__update')).toBe(true);
  });

  it('没有旧控制器时不执行恢复动作', async () => {
    const context = createContext(false);
    await Promise.resolve();

    expect(context.update).not.toHaveBeenCalled();
    expect(context.unregister).not.toHaveBeenCalled();
    expect(context.replace).not.toHaveBeenCalled();
  });

  it('恢复脚本不包含任何部署域名', () => {
    expect(source).not.toContain('sydf.cc');
    expect(source).not.toContain('pages.dev');
  });

  it('应用启动成功后清除旧状态和技术参数', () => {
    const context = createContext(false, 'https://app.example/?__update=new&__recover=1&__recovered=1&__recoveryAttempt=1');
    context.stored.set('shiyue:sw-retirement-v2', '1');
    context.stored.set('shiyue:startup-recovery', '{"attempts":2}');

    const bridge = context.window.__SHIYUE_STARTUP_RECOVERY__ as { markReady: () => void };
    bridge.markReady();

    expect(context.stored.size).toBe(0);
    expect(context.replaceState).toHaveBeenCalledWith(null, '', 'https://app.example/');
  });
});
