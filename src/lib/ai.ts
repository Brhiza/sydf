import type { PromptSchoolChoices } from './promptSchools';
import { buildAiSystemPrompt, buildAiUserPrompt, sanitizeAiConversation } from './aiPrompt';
import { buildInterpretationProviderBody, extractProviderText } from './aiProvider';

export type AiInterpretationMode = 'ask' | 'divination' | 'chart' | 'compatibility' | 'fengshui';

export type AiAnswerPreference = 'chat' | 'fortune-master' | 'professional';
export type DisplayLevel = 'basic' | 'beginner' | 'master';
export type AiChannelProvider = 'builtin' | 'openai-compatible';
export type AiChannelPreset = 'deepseek' | 'openai' | 'qwen' | 'kimi' | 'zhipu' | 'anthropic';
export type AiApiType = 'chat' | 'responses' | 'anthropic';

export interface AiPreferences {
  answerPreference: AiAnswerPreference;
  displayLevel: DisplayLevel;
  promptSchoolChoices?: PromptSchoolChoices;
}

export interface AiCustomConfig {
  enabled: boolean;
  provider?: AiChannelProvider;
  apiType?: AiApiType;
  baseUrl: string;
  model: string;
  apiKey: string;
}

export interface AiChannel {
  id: string;
  name: string;
  provider: AiChannelProvider;
  preset?: AiChannelPreset;
  apiType: AiApiType;
  baseUrl: string;
  model: string;
  models: string[];
  modelsFetchedAt?: number;
  apiKey: string;
}

export interface AiProfileContext {
  label: string;
  name: string;
  gender: 'male' | 'female';
  date: string;
  dateType: 'solar' | 'lunar';
  isLeapMonth: boolean;
  time: string;
  locationName: string;
  timeBasis: 'clock' | 'trueSolar';
}

export interface AiReadingContext {
  summary: string;
  data: unknown;
  prompt?: string;
}

export interface AiConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiInterpretationRequest {
  mode: AiInterpretationMode;
  question: string;
  method?: string;
  profile?: AiProfileContext;
  reading?: AiReadingContext;
  conversation?: AiConversationMessage[];
  preferences?: AiPreferences;
  aiConfig?: AiCustomConfig;
}

export interface AiInterpretationResponse {
  content: string;
  model?: string;
  provider?: string;
}

export interface DirectAiConfig {
  apiType: AiApiType;
  apiKey: string;
  model: string;
  url: string;
}

// 服务端最多等待 90 秒，客户端再多留 5 秒接收 Cloudflare 返回的结果。
const AI_INTERPRETATION_TIMEOUT_MS = 95_000;

async function fetchWithClientTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
  timeoutMessage: string,
) {
  const controller = new AbortController();
  const callerSignal = init.signal;
  let timedOut = false;
  const abortFromCaller = () => controller.abort(callerSignal?.reason);
  if (callerSignal?.aborted) abortFromCaller();
  else callerSignal?.addEventListener('abort', abortFromCaller, { once: true });
  const timeout = globalThis.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (timedOut) throw new Error(timeoutMessage);
    throw error;
  } finally {
    globalThis.clearTimeout(timeout);
    callerSignal?.removeEventListener('abort', abortFromCaller);
  }
}

export function buildAiInterpretationRequestBody(payload: AiInterpretationRequest) {
  const { profile, reading: sourceReading, ...request } = payload;
  const prompt = sourceReading?.prompt?.trim();
  const summary = sourceReading?.summary?.trim();
  const reading = prompt ? { prompt } : summary ? { summary } : undefined;
  return {
    ...request,
    ...(payload.mode === 'chart' && profile ? { profile } : {}),
    ...(reading ? { reading } : {}),
  };
}

function normalizeApiType(value: unknown): AiApiType {
  return value === 'responses' || value === 'anthropic' ? value : 'chat';
}

export function isCustomAiConfig(aiConfig: AiCustomConfig | undefined) {
  return aiConfig?.provider === 'openai-compatible'
    || (aiConfig?.provider === undefined && aiConfig?.enabled === true);
}

function trimApiEndpoint(baseUrl: string) {
  return baseUrl.trim().replace(/\/+$/, '').replace(/\/(chat\/completions|responses|messages|models)$/i, '');
}

function resolveDirectAiUrl(baseUrl: string, apiType: AiApiType) {
  const normalized = baseUrl.trim().replace(/\/+$/, '');
  const path = apiType === 'responses' ? 'responses' : apiType === 'anthropic' ? 'messages' : 'chat/completions';
  if (new RegExp(`/${path.replace('/', '\\/')}$`, 'i').test(normalized)) return normalized;
  return `${trimApiEndpoint(normalized)}/${path}`;
}

function resolveDirectModelsUrl(baseUrl: string) {
  const normalized = trimApiEndpoint(baseUrl);
  return normalized ? `${normalized}/models` : '';
}

function validateDirectUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('接口地址无效，请填写完整的 HTTP 或 HTTPS 地址。');
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('接口地址无效，请填写完整的 HTTP 或 HTTPS 地址。');
  }
  return url.toString();
}

export function getDirectAiConfig(aiConfig: AiCustomConfig, requireModel = true): DirectAiConfig {
  const apiType = normalizeApiType(aiConfig.apiType);
  const apiKey = aiConfig.apiKey.trim();
  const model = aiConfig.model.trim();
  const baseUrl = aiConfig.baseUrl.trim();
  if (!baseUrl || !apiKey || (requireModel && !model)) {
    throw new Error(requireModel
      ? '请完整填写第三方 AI 的接口地址、模型名称和 API Key。'
      : '请先完整填写接口地址和 API Key。');
  }
  return {
    apiType,
    apiKey,
    model,
    url: validateDirectUrl(requireModel ? resolveDirectAiUrl(baseUrl, apiType) : resolveDirectModelsUrl(baseUrl)),
  };
}

function directRequestHeaders(config: Pick<DirectAiConfig, 'apiType' | 'apiKey'>, json = false) {
  const headers: Record<string, string> = json
    ? { 'Content-Type': 'application/json' }
    : { Accept: 'application/json' };
  if (config.apiType === 'anthropic') {
    headers['x-api-key'] = config.apiKey;
    headers['anthropic-version'] = '2023-06-01';
    headers['anthropic-dangerous-direct-browser-access'] = 'true';
  } else {
    headers.Authorization = `Bearer ${config.apiKey}`;
  }
  return headers;
}

function getProviderErrorMessage(payload: unknown, status: number, fallback: string) {
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    if (typeof record.error === 'string' && record.error.trim()) return record.error.trim().slice(0, 500);
    if (record.error && typeof record.error === 'object') {
      const nested = record.error as Record<string, unknown>;
      if (typeof nested.message === 'string' && nested.message.trim()) return nested.message.trim().slice(0, 500);
    }
    if (typeof record.message === 'string' && record.message.trim()) return record.message.trim().slice(0, 500);
  }
  return `${fallback}（${status}）。`;
}

export function shouldFallbackToProxy(error: unknown, timeoutMessage: string) {
  return error instanceof TypeError || (error instanceof Error && error.message === timeoutMessage);
}

const aiProxyFallbackCache = new Set<string>();

function aiProxyFallbackCacheId(aiConfig: AiCustomConfig) {
  const source = trimApiEndpoint(aiConfig.baseUrl).toLowerCase();
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function aiProxyFallbackStorageKey(aiConfig: AiCustomConfig) {
  return `sydf:ai-proxy-fallback:${aiProxyFallbackCacheId(aiConfig)}`;
}

export function shouldUseAiProxyFallback(aiConfig: AiCustomConfig) {
  const cacheId = aiProxyFallbackCacheId(aiConfig);
  if (aiProxyFallbackCache.has(cacheId)) return true;
  try {
    if (globalThis.sessionStorage?.getItem(aiProxyFallbackStorageKey(aiConfig)) === '1') {
      aiProxyFallbackCache.add(cacheId);
      return true;
    }
  } catch {
    // 部分隐私模式会禁用 sessionStorage，内存缓存仍可避免本次页面重复直连。
  }
  return false;
}

export function rememberAiProxyFallback(aiConfig: AiCustomConfig) {
  aiProxyFallbackCache.add(aiProxyFallbackCacheId(aiConfig));
  try {
    globalThis.sessionStorage?.setItem(aiProxyFallbackStorageKey(aiConfig), '1');
  } catch {
    // 存储不可用时只保留当前页面内存状态。
  }
}

export async function requestDirectAiJson(
  config: DirectAiConfig,
  body: Record<string, unknown>,
  signal: AbortSignal | undefined,
  timeoutMs: number,
  timeoutMessage: string,
) {
  const response = await fetchWithClientTimeout(config.url, {
    method: 'POST',
    headers: directRequestHeaders(config, true),
    body: JSON.stringify(body),
    signal,
  }, timeoutMs, timeoutMessage);
  const result = await response.json().catch(() => null) as unknown;
  if (!response.ok) throw new Error(getProviderErrorMessage(result, response.status, '第三方 AI 返回错误，请检查模型、接口地址和密钥'));
  if (!result) throw new Error('AI 返回了无法识别的内容。');
  return result;
}

function collectModelIds(payload: unknown): string[] {
  if (!payload || typeof payload !== 'object') return [];
  const record = payload as Record<string, unknown>;
  const source = Array.isArray(payload)
    ? payload
    : Array.isArray(record.data)
      ? record.data
      : Array.isArray(record.models)
        ? record.models
        : [];
  const models = source.flatMap((item) => {
    if (typeof item === 'string') return item.trim() ? [item.trim()] : [];
    if (!item || typeof item !== 'object') return [];
    const candidate = item as Record<string, unknown>;
    const id = typeof candidate.id === 'string'
      ? candidate.id.trim()
      : typeof candidate.name === 'string'
        ? candidate.name.trim()
        : '';
    return id ? [id] : [];
  });
  return [...new Set(models)].sort((a, b) => a.localeCompare(b));
}

export async function requestAiModels(aiConfig: AiCustomConfig, signal?: AbortSignal): Promise<string[]> {
  if (isCustomAiConfig(aiConfig)) {
    const config = getDirectAiConfig(aiConfig, false);
    if (shouldUseAiProxyFallback(aiConfig)) return requestAiModelsViaProxy(aiConfig, signal);
    let response: Response;
    try {
      response = await fetchWithClientTimeout(config.url, {
        method: 'GET',
        headers: directRequestHeaders(config),
        signal,
      }, 20_000, '获取模型超时，请检查网络或接口地址后重试。');
    } catch (error) {
      if (shouldFallbackToProxy(error, '获取模型超时，请检查网络或接口地址后重试。')) {
        rememberAiProxyFallback(aiConfig);
        return requestAiModelsViaProxy(aiConfig, signal);
      }
      throw error;
    }
    const result = await response.json().catch(() => null) as unknown;
    if (!response.ok) throw new Error(getProviderErrorMessage(result, response.status, '获取模型失败，请检查接口地址和密钥'));
    const models = collectModelIds(result);
    if (!models.length) throw new Error('该接口没有返回可用模型。');
    return models;
  }
  return requestAiModelsViaProxy(aiConfig, signal);
}

async function requestAiModelsViaProxy(aiConfig: AiCustomConfig, signal?: AbortSignal): Promise<string[]> {
  const response = await fetchWithClientTimeout('/api/models', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ aiConfig }),
    signal,
  }, 20_000, '获取模型超时，请检查网络或接口地址后重试。');
  const result = await response.json().catch(() => null) as unknown;
  if (!response.ok) throw new Error(getErrorMessage(result, response.status));
  if (!result || typeof result !== 'object' || !('models' in result) || !Array.isArray(result.models)) throw new Error('模型列表返回格式无法识别。');
  const models = result.models.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())).map((item) => item.trim());
  if (!models.length) throw new Error('该接口没有返回可用模型。');
  return [...new Set(models)];
}

function getErrorMessage(payload: unknown, status: number) {
  if (payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string') return payload.error;
  if (status === 404) return 'AI 解读服务尚未接入当前预览环境。';
  if (status === 429) return '请求过于频繁，请稍后再试。';
  if (status === 502 || status === 503) return 'AI 服务当前繁忙，请稍后重试。';
  if (status === 504) return 'AI 解读等待超时，请稍后重试。';
  return `AI 解读暂时不可用（${status}）。`;
}

export async function requestAiInterpretation(payload: AiInterpretationRequest, signal?: AbortSignal): Promise<AiInterpretationResponse> {
  if (isCustomAiConfig(payload.aiConfig)) {
    const config = getDirectAiConfig(payload.aiConfig!);
    if (shouldUseAiProxyFallback(payload.aiConfig!)) return requestAiInterpretationViaProxy(payload, signal);
    const request = buildAiInterpretationRequestBody(payload);
    const systemPrompt = buildAiSystemPrompt(request);
    const conversation = sanitizeAiConversation(request.conversation);
    const providerMessages = [...conversation, { role: 'user' as const, content: buildAiUserPrompt(request) }];
    const messages = [{ role: 'system' as const, content: systemPrompt }, ...providerMessages];
    const body = buildInterpretationProviderBody(config, systemPrompt, providerMessages, messages, 0.55);
    let response: Response;
    try {
      response = await fetchWithClientTimeout(config.url, {
        method: 'POST',
        headers: directRequestHeaders(config, true),
        body: JSON.stringify(body),
        signal,
      }, AI_INTERPRETATION_TIMEOUT_MS, 'AI 解读等待超时，请稍后重试。');
    } catch (error) {
      if (shouldFallbackToProxy(error, 'AI 解读等待超时，请稍后重试。')) {
        rememberAiProxyFallback(payload.aiConfig!);
        return requestAiInterpretationViaProxy(payload, signal);
      }
      throw error;
    }
    const result = await response.json().catch(() => null) as unknown;
    if (!response.ok) throw new Error(getProviderErrorMessage(result, response.status, '第三方 AI 返回错误，请检查模型、接口地址和密钥'));
    const content = extractProviderText(result, config.apiType).content;
    if (!content.trim()) throw new Error('AI 返回了无法识别的内容。');
    const resultModel = result && typeof result === 'object' && 'model' in result && typeof result.model === 'string'
      ? result.model
      : config.model;
    return { content: content.trim(), model: resultModel, provider: 'custom' };
  }
  return requestAiInterpretationViaProxy(payload, signal);
}

async function requestAiInterpretationViaProxy(payload: AiInterpretationRequest, signal?: AbortSignal): Promise<AiInterpretationResponse> {
  const response = await fetchWithClientTimeout('/api/interpret', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // 排盘原始对象可能带有数万字的计算链和审计依据。模型只需要已经筛选过的 prompt；
    // 在网络边界统一剔除 data，避免调用方遗漏清理。
    body: JSON.stringify(buildAiInterpretationRequestBody(payload)),
    signal,
  }, AI_INTERPRETATION_TIMEOUT_MS, 'AI 解读等待超时，请稍后重试。');
  const result = await response.json().catch(() => null) as unknown;
  if (!response.ok) throw new Error(getErrorMessage(result, response.status));
  if (!result || typeof result !== 'object' || !('content' in result) || typeof result.content !== 'string' || !result.content.trim()) {
    throw new Error('AI 返回了无法识别的内容。');
  }
  return result as AiInterpretationResponse;
}
