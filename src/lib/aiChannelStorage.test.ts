import { describe, expect, it } from 'vitest';
import type { AiChannel } from './ai';
import {
  applyStoredAiKeys,
  buildStoredAiKeys,
  normalizeStoredAiKeys,
} from './aiChannelStorage';

function createChannel(id: string, apiKey = ''): AiChannel {
  return {
    id,
    name: id,
    provider: 'openai-compatible',
    apiType: 'chat',
    baseUrl: 'https://api.example.com/v1',
    model: 'model-1',
    models: ['model-1'],
    apiKey,
  };
}

describe('AI 渠道本地存储', () => {
  it('只保存非内置渠道中填写过的密钥', () => {
    const builtin = { ...createChannel('builtin', 'ignored'), provider: 'builtin' as const };
    expect(buildStoredAiKeys([builtin, createChannel('primary', 'secret'), createChannel('empty')]))
      .toEqual({ primary: 'secret' });
  });

  it('优先恢复持久密钥，并迁移只有会话密钥的旧配置', () => {
    const primary = createChannel('primary');
    const backup = createChannel('backup');
    expect(applyStoredAiKeys(
      [primary, backup],
      { primary: 'persistent-secret' },
      { primary: 'old-session-secret', backup: 'backup-session-secret' },
    )).toBe(true);
    expect(primary.apiKey).toBe('persistent-secret');
    expect(backup.apiKey).toBe('backup-session-secret');
  });

  it('忽略损坏的本地密钥记录', () => {
    expect(normalizeStoredAiKeys({ valid: 'secret', empty: '', invalid: 123 })).toEqual({ valid: 'secret' });
    expect(normalizeStoredAiKeys([])).toEqual({});
  });
});
