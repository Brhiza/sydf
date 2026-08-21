import { describe, expect, it } from 'vitest';
import { applyJoytouchCompatibility, readStoredJoytouchCompatibility } from './joytouchCompatibility';

describe('卓易通显示兼容', () => {
  it('未明确开启时保持普通版本样式', () => {
    expect(readStoredJoytouchCompatibility({ getItem: () => null })).toBe(false);
    expect(readStoredJoytouchCompatibility({ getItem: () => '{bad json' })).toBe(false);
    expect(readStoredJoytouchCompatibility({ getItem: () => JSON.stringify({ joytouchCompatibility: false }) })).toBe(false);
  });

  it('只在明确开启时添加专用样式类', () => {
    const classes = new Set<string>();
    const root = { classList: { toggle: (name: string, enabled: boolean) => enabled ? classes.add(name) : classes.delete(name) } } as unknown as HTMLElement;
    applyJoytouchCompatibility(true, root);
    expect(classes.has('joytouch-compat')).toBe(true);
    applyJoytouchCompatibility(false, root);
    expect(classes.has('joytouch-compat')).toBe(false);
  });
});
