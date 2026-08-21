import { describe, expect, it } from 'vitest';
import { applyJoytouchCompatibility, isOpenedSidebarRenderBroken, readStoredJoytouchCompatibilityMode, shouldEnableJoytouchCompatibility } from './joytouchCompatibility';

describe('卓易通显示兼容', () => {
  it('新安装默认自动判断，旧布尔设置可平滑迁移', () => {
    expect(readStoredJoytouchCompatibilityMode({ getItem: () => null })).toBe('auto');
    expect(readStoredJoytouchCompatibilityMode({ getItem: () => '{bad json' })).toBe('auto');
    expect(readStoredJoytouchCompatibilityMode({ getItem: () => JSON.stringify({ joytouchCompatibility: true }) })).toBe('compatibility');
    expect(readStoredJoytouchCompatibilityMode({ getItem: () => JSON.stringify({ joytouchCompatibility: false }) })).toBe('standard');
  });

  it('自动模式只在 APK 的明确风险环境下降级', () => {
    const modern = { nativeAndroid: true, userAgent: 'Android WebView', cssSupports: () => true };
    expect(shouldEnableJoytouchCompatibility('auto', modern)).toBe(false);
    expect(shouldEnableJoytouchCompatibility('auto', { ...modern, nativeAndroid: false, userAgent: 'HarmonyOS ArkWeb' })).toBe(false);
    expect(shouldEnableJoytouchCompatibility('auto', { ...modern, userAgent: 'HarmonyOS ArkWeb' })).toBe(true);
    expect(shouldEnableJoytouchCompatibility('auto', { ...modern, cssSupports: () => false })).toBe(true);
    expect(shouldEnableJoytouchCompatibility('auto', { nativeAndroid: true, userAgent: 'Old Android WebView' })).toBe(true);
    expect(shouldEnableJoytouchCompatibility('auto', { nativeAndroid: false, userAgent: 'Old Android WebView' })).toBe(false);
    expect(shouldEnableJoytouchCompatibility('standard', { ...modern, userAgent: 'HarmonyOS ArkWeb' })).toBe(false);
  });

  it('能识别打开后仍留在屏幕外的侧栏', () => {
    expect(isOpenedSidebarRenderBroken({ left: 0, right: 260, width: 260 })).toBe(false);
    expect(isOpenedSidebarRenderBroken({ left: -273, right: -13, width: 260 })).toBe(true);
  });

  it('按结果切换专用样式类', () => {
    const classes = new Set<string>();
    const root = { classList: { toggle: (name: string, enabled: boolean) => enabled ? classes.add(name) : classes.delete(name) } } as unknown as HTMLElement;
    applyJoytouchCompatibility(true, root);
    expect(classes.has('joytouch-compat')).toBe(true);
    applyJoytouchCompatibility(false, root);
    expect(classes.has('joytouch-compat')).toBe(false);
  });
});
