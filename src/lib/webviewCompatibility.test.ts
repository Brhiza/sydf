import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyWebviewCompatibility, detectWebviewCapabilities } from './webviewCompatibility';

afterEach(() => vi.unstubAllGlobals());

describe('WebView 能力检测', () => {
  it('对缺少新 CSS 能力的内核启用兼容类', () => {
    vi.stubGlobal('CSS', { supports: vi.fn(() => false) });
    const classes = new Set<string>();
    const root = {
      classList: {
        toggle(name: string, active: boolean) {
          if (active) classes.add(name);
          else classes.delete(name);
        },
      },
    } as HTMLElement;
    const result = applyWebviewCompatibility(root);
    expect(result.colorMix).toBe(false);
    expect(classes.has('legacy-webview')).toBe(true);
    expect(classes.has('no-colorMix')).toBe(true);
    expect(classes.has('no-hasSelector')).toBe(true);
  });

  it('CSS.supports 不可用时安全降级', () => {
    vi.stubGlobal('CSS', undefined);
    expect(detectWebviewCapabilities()).toEqual({
      colorMix: false,
      dynamicViewport: false,
      hasSelector: false,
      backdropFilter: false,
    });
  });
});
