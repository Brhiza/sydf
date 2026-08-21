import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const styles = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const primitives = readFileSync(new URL('../design-system/primitives.css', import.meta.url), 'utf8');

function colorRulesFor(className: string) {
  return [...styles.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, selector, declarations]) => selector?.includes(className) && /(?:color|background|border|shadow|outline)\s*:/.test(declarations || ''))
    .map(([, selector, declarations]) => `${selector?.trim()} {${declarations}}`);
}

describe('主题界面样式', () => {
  const fixedYuePurple = /#(?:8064a6|e8ddf4|6f5a86|e6daf3|ded2ea|514261|f0eaf6|8e7c9d|fbf9fe|eee7f4|6b5c79|f3ebfa|d5c2e6|5c4c6d|e7dcf4|694d91|e0d6eb|f4f0f7|e3daeb|8d8198|ddd1e8|6a5a78|eee5f8|795ca0|8467a7|fbfaff|e1d7ec|9988a9|b39bd2|342e3e|cdb8dd|362f40|665675|d7bdec|f0e7f9|9e91ac|c1b2cf|f3edf8|e8def1|9d8da9|654b77|9a88a8|674b7a|e9e2f1|aaa0b4|9b8eaa|8c789d|e6dced|725694|6e607b|5e4b72|25222b|494450|2b2831|29262f|403c46|ded8e2|d7cddd|1e1c23)\b|rgba\(\s*(?:70\s*,\s*50\s*,\s*106|46\s*,\s*32\s*,\s*70|68\s*,\s*55\s*,\s*80|238\s*,\s*229\s*,\s*248|247\s*,\s*244\s*,\s*252|37\s*,\s*29\s*,\s*49)\s*,/i;

  it.each([
    '.tool-picker-button',
    '.tool-picker-panel',
    '.ask-library-button',
    '.topbar-ai-menu',
    '.inspiration-modal',
    '.inspiration-mode-tabs',
    '.inspiration-natal-item',
    '.inspiration-leaf',
    '.inspiration-search',
    '.case-switcher-menu',
    '.case-list-main',
    '.birth-calendar',
    '.solar-details',
    '.chat-composer',
    '.chat-message',
    '.ai-reading-title',
    '.ai-reading-card',
    '.case-record-row',
    '.chat-selection-toolbar',
    '.sidebar.mobile-sidebar-open',
  ])('%s 的交互颜色不再写死为月主题紫色', (className) => {
    const rules = colorRulesFor(className);
    expect(rules.length).toBeGreaterThan(0);
    expect(rules.join('\n')).not.toMatch(fixedYuePurple);
  });

  it('卓易通兼容样式不会影响普通安卓版本', () => {
    expect(styles).not.toMatch(/html\.native-android/);
    expect(primitives).not.toMatch(/html\.native-android/);
    expect(styles).toMatch(/html\.joytouch-compat \.mobile-nav-scrim\s*\{[^}]*background:\s*rgba\(/s);
    expect(styles).toMatch(/html\.joytouch-compat \.sidebar\.mobile-sidebar-open\s*\{[^}]*box-shadow:\s*none/s);
    expect(styles).toMatch(/html\.joytouch-compat \.sidebar\.mobile-sidebar-open\s*\{[^}]*left:\s*0/s);
    expect(primitives).toMatch(/html\.joytouch-compat \.ui-dialog-layer\s*\{[^}]*background:\s*rgba\(/s);
    expect(primitives).toMatch(/html\.joytouch-compat \.ui-dialog\s*\{[^}]*animation:\s*none/s);
  });
});
