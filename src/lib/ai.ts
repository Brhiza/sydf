export type AiInterpretationMode = 'ask' | 'divination' | 'chart' | 'compatibility' | 'fengshui';

export type AiAnswerPreference = 'chat' | 'fortune-master' | 'professional';
export type DisplayLevel = 'basic' | 'beginner' | 'master';
export type AiChannelProvider = 'builtin' | 'openai-compatible';
export type AiChannelPreset = 'deepseek' | 'openai' | 'qwen' | 'kimi' | 'zhipu' | 'anthropic';
export type AiApiType = 'chat' | 'responses' | 'anthropic';

export interface AiPreferences {
  answerPreference: AiAnswerPreference;
  displayLevel: DisplayLevel;
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

export function buildAiInterpretationRequestBody(payload: AiInterpretationRequest) {
  const reading = payload.reading
    ? {
        summary: payload.reading.summary,
        ...(payload.reading.prompt ? { prompt: payload.reading.prompt } : {}),
      }
    : undefined;
  return {
    ...payload,
    ...(reading ? { reading } : {}),
  };
}

export async function requestAiModels(aiConfig: AiCustomConfig, signal?: AbortSignal): Promise<string[]> {
  const response = await fetch('/api/models', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ aiConfig }),
    signal,
  });
  const result = await response.json().catch(() => null) as unknown;
  if (!response.ok) throw new Error(getErrorMessage(result, response.status));
  if (!result || typeof result !== 'object' || !('models' in result) || !Array.isArray(result.models)) throw new Error('模型列表返回格式无法识别。');
  const models = result.models.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())).map((item) => item.trim());
  if (!models.length) throw new Error('该接口没有返回可用模型。');
  return [...new Set(models)];
}

function getErrorMessage(payload: unknown, status: number) {
  if (payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string') return payload.error;
  return status === 404 ? 'AI 解读服务尚未接入当前预览环境。' : `AI 解读暂时不可用（${status}）。`;
}

export async function requestAiInterpretation(payload: AiInterpretationRequest, signal?: AbortSignal): Promise<AiInterpretationResponse> {
  const response = await fetch('/api/interpret', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // 排盘原始对象可能带有数万字的计算链和审计依据。模型只需要已经筛选过的 prompt；
    // 在网络边界统一剔除 data，避免调用方遗漏清理。
    body: JSON.stringify(buildAiInterpretationRequestBody(payload)),
    signal,
  });
  const result = await response.json().catch(() => null) as unknown;
  if (!response.ok) throw new Error(getErrorMessage(result, response.status));
  if (!result || typeof result !== 'object' || !('content' in result) || typeof result.content !== 'string' || !result.content.trim()) {
    throw new Error('AI 返回了无法识别的内容。');
  }
  return result as AiInterpretationResponse;
}
