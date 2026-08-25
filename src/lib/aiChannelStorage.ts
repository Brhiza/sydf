import type { AiChannel } from './ai';

export const AI_KEY_STORAGE_KEY = 'shiyue-ai-keys-v1';

export function normalizeStoredAiKeys(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value)
    .filter((entry): entry is [string, string] => Boolean(entry[0]) && typeof entry[1] === 'string' && Boolean(entry[1])));
}

export function buildStoredAiKeys(channels: readonly Pick<AiChannel, 'id' | 'provider' | 'apiKey'>[]): Record<string, string> {
  return Object.fromEntries(channels
    .filter((channel) => channel.provider !== 'builtin' && Boolean(channel.apiKey))
    .map((channel) => [channel.id, channel.apiKey]));
}

export function applyStoredAiKeys(
  channels: AiChannel[],
  persistentKeys: Record<string, string>,
  sessionKeys: Record<string, string> = {},
): boolean {
  let migratedSessionKey = false;
  channels.forEach((channel) => {
    const persistentKey = persistentKeys[channel.id] || '';
    const sessionKey = sessionKeys[channel.id] || '';
    channel.apiKey = persistentKey || sessionKey;
    if (!persistentKey && sessionKey) migratedSessionKey = true;
  });
  return migratedSessionKey;
}
