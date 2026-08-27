import { describe, expect, it } from 'vitest';
import { createThemeAssetManifest, DEFAULT_PACKAGED_THEME } from './themeAssetPackages';

describe('主题资源包清单', () => {
  it('覆盖所有主题和自定义牌组，并保留默认主题', () => {
    const manifest = createThemeAssetManifest('public');
    expect(DEFAULT_PACKAGED_THEME).toBe('yue');
    expect(Object.keys(manifest.packages).sort()).toEqual([
      'deck:danjie-leopard', 'deck:doubao', 'deck:gg-bond', 'deck:pleasant-goat', 'deck:sacred-milk-dragon',
      'theme:lan-yu', 'theme:mo', 'theme:shanhaijing', 'theme:shi', 'theme:xian', 'theme:yue',
    ]);
    expect(manifest.packages['theme:yue']?.files.length).toBeGreaterThan(300);
    expect(manifest.packages['theme:yue']?.fingerprint).toMatch(/^[a-f0-9]{20}$/);
  });

  it('每个文件使用内容哈希，未改动资源可跨版本复用', () => {
    const first = createThemeAssetManifest('public');
    const second = createThemeAssetManifest('public');
    expect(second).toEqual(first);
  });
});
