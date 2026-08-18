import {
  buildAiSystemPrompt,
  buildAiUserPrompt,
  sanitizeAiConversation,
  type AiPromptConversationMessage,
  type AiPromptPayload,
} from '../../src/lib/aiPrompt';
import { fetchWithTimeout, guardApiRequest, readJsonBody, RequestBodyTooLargeError, validateExternalUrl, type ApiSecurityEnv } from './security';

interface AiChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export type AiApiType = 'chat' | 'responses' | 'anthropic';

export interface AiProviderConfig {
  apiType: AiApiType;
  apiKey: string;
  model: string;
  url: string;
  headers?: Record<string, string>;
}

export interface AiEnv extends ApiSecurityEnv {
  AI_API_KEY?: string;
  AI_API_URL?: string;
  AI_BASE_URL?: string;
  AI_API_TYPE?: string;
  AI_MODEL?: string;
  AI_SYSTEM_PROMPT?: string;
  AI_TEMPERATURE?: string;
  AI_MAX_TOKENS?: string;
}

export interface AiRequestConfig {
  enabled?: boolean;
  provider?: 'builtin' | 'openai-compatible';
  apiType?: AiApiType;
  baseUrl?: string;
  model?: string;
  apiKey?: string;
}

interface InterpretationPayload extends AiPromptPayload {
  aiConfig?: AiRequestConfig;
}

const MAX_QUESTION_LENGTH = 4000;
// Cloudflare 公网链路约 100 秒会中止请求；预留边缘返回时间，同时允许较长的专业解读完成。
const UPSTREAM_REQUEST_TIMEOUT_MS = 90_000;
const RETRYABLE_UPSTREAM_STATUS = new Set([502, 503, 504]);
const DEFAULT_UPSTREAM_RETRY_DELAY_MS = 300;

class UpstreamResponseError extends Error {
  constructor(
    readonly status: number,
    readonly retryAfter?: string,
  ) {
    super(`upstream response error (${status})`);
    this.name = 'UpstreamResponseError';
  }
}

function jsonResponse(body: Record<string, unknown>, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
  });
}

function normalizeApiType(value: unknown): AiApiType {
  return value === 'responses' || value === 'anthropic' ? value : 'chat';
}

function resolveAiUrl(baseUrl: string, apiType: AiApiType) {
  const normalized = baseUrl.trim().replace(/\/$/, '');
  if (!normalized) return '';
  const path = apiType === 'responses' ? 'responses' : apiType === 'anthropic' ? 'messages' : 'chat/completions';
  if (new RegExp(`/${path.replace('/', '\\/')}$`, 'i').test(normalized)) return normalized;
  return `${normalized}/${path}`;
}

export function getCustomAiConfig(payload: { aiConfig?: AiRequestConfig }, requestUrl = 'https://shiyue.local'): AiProviderConfig | { error: string } | null {
  const aiConfig = payload.aiConfig;
  const explicitlyCustom = aiConfig?.provider === 'openai-compatible' || (aiConfig?.provider === undefined && aiConfig?.enabled === true);
  if (!explicitlyCustom) return null;
  const baseUrl = aiConfig?.baseUrl?.trim() || '';
  const model = aiConfig?.model?.trim() || '';
  const apiKey = aiConfig?.apiKey?.trim() || '';
  const apiType = normalizeApiType(aiConfig?.apiType);
  if (!baseUrl || !model || !apiKey) return { error: '请完整填写自定义 AI 的接口地址、模型名称和 API Key。' };
  try {
    const url = validateExternalUrl(resolveAiUrl(baseUrl, apiType), requestUrl);
    return { model, apiKey, apiType, url: url.toString() };
  } catch {
    return { error: '自定义 AI 接口地址无效。正式环境仅支持公网 HTTPS 地址。' };
  }
}

function extractChatText(result: unknown) {
  if (!result || typeof result !== 'object' || !('choices' in result) || !Array.isArray(result.choices)) return '';
  const first = result.choices[0];
  if (!first || typeof first !== 'object' || !('message' in first) || !first.message || typeof first.message !== 'object' || !('content' in first.message)) return '';
  const content = first.message.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map((item) => item && typeof item === 'object' && 'text' in item ? String(item.text) : '').join('');
  return '';
}

function extractResponsesText(result: unknown) {
  if (!result || typeof result !== 'object') return '';
  const record = result as Record<string, unknown>;
  if (typeof record.output_text === 'string') return record.output_text;
  if (!Array.isArray(record.output)) return '';
  return record.output.map((item) => {
    if (!item || typeof item !== 'object') return '';
    const content = (item as Record<string, unknown>).content;
    if (!Array.isArray(content)) return '';
    return content.map((part) => {
      if (!part || typeof part !== 'object') return '';
      const block = part as Record<string, unknown>;
      return block.type === 'output_text' && typeof block.text === 'string' ? block.text : '';
    }).join('');
  }).join('');
}

function extractAnthropicText(result: unknown) {
  if (!result || typeof result !== 'object') return '';
  const content = (result as Record<string, unknown>).content;
  if (!Array.isArray(content)) return '';
  return content.map((item) => {
    if (!item || typeof item !== 'object') return '';
    const block = item as Record<string, unknown>;
    return block.type === 'text' && typeof block.text === 'string' ? block.text : '';
  }).join('');
}

async function requestProvider(
  config: AiProviderConfig,
  systemPrompt: string,
  providerMessages: AiPromptConversationMessage[],
  messages: AiChatMessage[],
  temperature: number,
  maxTokens: number,
) {
  const body = config.apiType === 'responses'
    ? { model: config.model, instructions: systemPrompt, input: providerMessages, store: false, max_output_tokens: maxTokens }
    : config.apiType === 'anthropic'
      ? { model: config.model, system: systemPrompt, messages: providerMessages, max_tokens: maxTokens, temperature }
      : { model: config.model, messages, temperature, max_tokens: maxTokens };
  const result = await requestProviderJson(config, body);
  const content = config.apiType === 'responses'
    ? extractResponsesText(result)
    : config.apiType === 'anthropic'
      ? extractAnthropicText(result)
      : extractChatText(result);
  if (!content.trim()) throw new Error('empty upstream response');
  return content.trim();
}

export async function requestProviderJson(config: AiProviderConfig, body: Record<string, unknown>, signal?: AbortSignal) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...config.headers,
  };
  if (config.apiType === 'anthropic') {
    headers['x-api-key'] = config.apiKey;
    headers['anthropic-version'] = '2023-06-01';
  } else {
    headers.Authorization = `Bearer ${config.apiKey}`;
  }
  const requestBody = JSON.stringify(body);
  const deadline = Date.now() + UPSTREAM_REQUEST_TIMEOUT_MS;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) throw new DOMException('upstream timeout', 'TimeoutError');
    const response = await fetchWithTimeout(config.url, {
      method: 'POST',
      headers,
      body: requestBody,
      signal,
    }, remainingMs);
    if (response.ok) {
      const result = await response.json().catch(() => null) as unknown;
      if (!result) throw new Error('empty upstream response');
      return result;
    }

    await response.arrayBuffer().catch(() => undefined);
    const retryAfter = response.headers.get('Retry-After')?.trim() || undefined;
    if (attempt === 0 && RETRYABLE_UPSTREAM_STATUS.has(response.status)) {
      const seconds = Number(retryAfter);
      const requestedDelay = Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : DEFAULT_UPSTREAM_RETRY_DELAY_MS;
      const delayMs = Math.min(1500, Math.max(DEFAULT_UPSTREAM_RETRY_DELAY_MS, requestedDelay));
      if (deadline - Date.now() > delayMs + 1000) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }
    }
    throw new UpstreamResponseError(response.status, retryAfter);
  }
  throw new Error('upstream response error');
}

function isTimeoutError(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'name' in error && error.name === 'TimeoutError');
}

function providerErrorResponse(error: unknown, customProvider: boolean) {
  if (isTimeoutError(error)) return jsonResponse({ error: 'AI 解读等待超时，请稍后重试。' }, 504);
  if (error instanceof UpstreamResponseError) {
    const retryHeaders: Record<string, string> = error.retryAfter && /^\d+$/.test(error.retryAfter)
      ? { 'Retry-After': error.retryAfter }
      : {};
    if (error.status === 429) {
      return jsonResponse({ error: 'AI 服务当前请求较多，请稍后重试。' }, 503, retryHeaders);
    }
    if (RETRYABLE_UPSTREAM_STATUS.has(error.status)) {
      return jsonResponse({ error: 'AI 服务当前繁忙，请稍后重试。' }, error.status === 504 ? 504 : 503, retryHeaders);
    }
    if (customProvider && [400, 401, 403, 404, 422].includes(error.status)) {
      return jsonResponse({ error: 'AI 服务返回了配置错误，请检查模型、接口地址和密钥。' }, 400);
    }
    if (!customProvider && [400, 401, 403, 404, 422].includes(error.status)) {
      return jsonResponse({ error: 'AI 服务配置暂时不可用，请稍后再试。' }, 503);
    }
  }
  return jsonResponse({
    error: customProvider
      ? 'AI 服务返回了错误，请检查模型、接口地址和密钥配置。'
      : 'AI 解读暂时失败，请稍后再试。',
  }, 502);
}

export function getBuiltinAiConfig(env: AiEnv): AiProviderConfig | null {
  const apiType = normalizeApiType(env.AI_API_TYPE);
  const apiKey = env.AI_API_KEY?.trim() || '';
  const model = env.AI_MODEL?.trim() || '';
  const baseUrl = (env.AI_BASE_URL || '').replace(/\/$/, '');
  const url = env.AI_API_URL || resolveAiUrl(baseUrl, apiType);
  return apiKey && model && url ? { apiType, apiKey, model, url } : null;
}

export async function handleInterpretPost(context: { request: Request; env: AiEnv }) {
  const blocked = await guardApiRequest(context.request, context.env);
  if (blocked) return blocked;
  let payload: InterpretationPayload;
  try {
    payload = await readJsonBody<InterpretationPayload>(context.request);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return jsonResponse({ error: '请求内容过大。' }, 413);
    return jsonResponse({ error: '请求内容不是有效的 JSON。' }, 400);
  }

  const question = payload.question?.trim();
  if (!question) return jsonResponse({ error: '请先写下你想问的事。' }, 400);
  if (question.length > MAX_QUESTION_LENGTH) return jsonResponse({ error: '问题内容过长，请精简后再试。' }, 400);

  const env = context.env;
  const customConfig = getCustomAiConfig(payload, context.request.url);
  if (customConfig && 'error' in customConfig) return jsonResponse({ error: customConfig.error }, 400);
  const provider = customConfig ? 'custom' : 'builtin';
  const systemPrompt = buildAiSystemPrompt(payload, env.AI_SYSTEM_PROMPT);
  const userPrompt = buildAiUserPrompt({ ...payload, question });
  const conversation = sanitizeAiConversation(payload.conversation);
  const providerMessages: AiPromptConversationMessage[] = [...conversation, { role: 'user', content: userPrompt }];
  const messages: AiChatMessage[] = [{ role: 'system', content: systemPrompt }, ...providerMessages];

  const temperature = Number.isFinite(Number(env.AI_TEMPERATURE)) ? Number(env.AI_TEMPERATURE) : 0.55;
  const preferenceTokenLimit = payload.preferences?.answerPreference === 'chat'
    ? 1100
    : payload.preferences?.answerPreference === 'professional'
      ? 3000
      : 2000;
  const configuredMaxTokens = Number(env.AI_MAX_TOKENS);
  const maxTokens = Number.isFinite(configuredMaxTokens) && configuredMaxTokens > 0
    ? Math.min(8000, Math.max(256, Math.round(configuredMaxTokens)))
    : preferenceTokenLimit;

  if (customConfig) {
    try {
      const content = await requestProvider(customConfig, systemPrompt, providerMessages, messages, temperature, maxTokens);
      return jsonResponse({ content, model: customConfig.model, provider });
    } catch (error) {
      return providerErrorResponse(error, true);
    }
  }

  const builtinConfig = getBuiltinAiConfig(env);
  if (!builtinConfig) return jsonResponse({ error: 'AI 服务尚未配置，请稍后再试。' }, 503);

  try {
    const content = await requestProvider(builtinConfig, systemPrompt, providerMessages, messages, temperature, maxTokens);
    return jsonResponse({ content, provider });
  } catch (error) {
    return providerErrorResponse(error, false);
  }
}
