import { describe, expect, it } from 'vitest';
import { addLegacyCssFallbacks } from './legacyCssCompat';

describe('旧版 WebView CSS 降级', () => {
  it('在 color-mix 前保留可解析的基础颜色', () => {
    expect(addLegacyCssFallbacks('.card{background:color-mix(in srgb, var(--surface) 80%, transparent);}'))
      .toContain('background:var(--surface);background:color-mix(');
  });

  it('为动态视口和安全区生成传统尺寸', () => {
    const output = addLegacyCssFallbacks('.dialog{height:calc(100dvh - env(safe-area-inset-bottom));}');
    expect(output).toContain('height:calc(100vh - 0px);height:calc(100dvh - env(safe-area-inset-bottom));');
  });

  it('为毛玻璃属性补充 WebKit 前缀', () => {
    expect(addLegacyCssFallbacks('.bar{backdrop-filter:blur(10px);}'))
      .toContain('-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);');
  });

  it('处理压缩 CSS 中规则末尾没有分号的声明', () => {
    expect(addLegacyCssFallbacks('.tag{color:color-mix(in srgb,#123 60%,white)}'))
      .toBe('.tag{color:#123;color:color-mix(in srgb,#123 60%,white)}');
  });
});
