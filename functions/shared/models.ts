import { fetchWithTimeout, guardApiRequest, readJsonBody, RequestBodyTooLargeError, validateExternalUrlForRequest, type ApiSecurityEnv } from './security';

type AiApiType = 'chat' | 'responses' | 'anthropic';

interface AiEnv extends ApiSecurityEnv {
  AI_API_KEY?: string;
  AI_BASE_URL?: string;
  AI_API_TYPE?: string;
  AI_MODELS_URL?: string;
}

interface ModelsPayload {
  aiConfig?: {
    provider?: 'builtin' | 'openai-compatible';
    apiType?: AiApiType;
    baseUrl?: string;
    apiKey?: string;
  };
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function normalizeApiType(value: unknown): AiApiType {
  return value === 'responses' || value === 'anthropic' ? value : 'chat';
}

function resolveModelsUrl(baseUrl: string, explicitUrl = '') {
  const source = explicitUrl.trim() || baseUrl.trim();
  const normalized = source
    .replace(/\/+$/, '')
    .replace(/\/(chat\/completions|responses|messages)$/i, '');
  if (!normalized) return '';
  return /\/models$/i.test(normalized) ? normalized : `${normalized}/models`;
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
  const ids = source
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      if (!item || typeof item !== 'object') return '';
      const candidate = item as Record<string, unknown>;
      return typeof candidate.id === 'string'
        ? candidate.id.trim()
        : typeof candidate.name === 'string'
          ? candidate.name.trim()
          : '';
    })
    .filter(Boolean);
  return [...new Set(ids)].sort((a, b) => a.localeCompare(b));
}

export async function handleModelsPost(context: { request: Request; env: AiEnv }) {
  const blocked = await guardApiRequest(context.request, context.env);
  if (blocked) return blocked;
  let payload: ModelsPayload;
  try {
    payload = await readJsonBody<ModelsPayload>(context.request);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return jsonResponse({ error: '请求内容过大。' }, 413);
    return jsonResponse({ error: '请求内容不是有效的 JSON。' }, 400);
  }

  const config = payload.aiConfig;
  const isBuiltin = !config || config.provider === 'builtin';
  const baseUrl = isBuiltin ? context.env.AI_BASE_URL?.trim() || '' : config.baseUrl?.trim() || '';
  const apiKey = isBuiltin ? context.env.AI_API_KEY?.trim() || '' : config.apiKey?.trim() || '';
  const apiType = normalizeApiType(isBuiltin ? context.env.AI_API_TYPE : config.apiType);
  const modelsUrl = resolveModelsUrl(baseUrl, isBuiltin ? context.env.AI_MODELS_URL : '');

  if (!baseUrl || !apiKey) return jsonResponse({ error: '请先完整填写接口地址和 API Key。' }, 400);
  if (!modelsUrl) return jsonResponse({ error: '接口地址无效。' }, 400);

  let url: URL;
  try {
    url = await validateExternalUrlForRequest(modelsUrl, context.request.url);
  } catch {
    return jsonResponse({ error: '接口地址无效。正式环境仅支持公网 HTTPS 地址。' }, 400);
  }

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (apiType === 'anthropic') {
    headers['x-api-key'] = apiKey;
    headers['anthropic-version'] = '2023-06-01';
  } else {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  try {
    const response = await fetchWithTimeout(url.toString(), { method: 'GET', headers }, 15_000);
    const result = await response.json().catch(() => null) as unknown;
    if (!response.ok) return jsonResponse({ error: '获取模型失败，请检查接口地址和密钥。' }, 502);
    const models = collectModelIds(result);
    if (!models.length) return jsonResponse({ error: '接口没有返回可用模型。' }, 502);
    return jsonResponse({ models });
  } catch {
    return jsonResponse({ error: '暂时无法连接模型接口，请稍后再试。' }, 502);
  }
}
