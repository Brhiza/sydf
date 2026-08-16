import {
  isCustomAiConfig,
  rememberAiProxyFallback,
  shouldFallbackToProxy,
  shouldUseAiProxyFallback,
  type AiConversationMessage,
  type AiCustomConfig,
} from './ai';
import { requestDirectAgentSelection } from './agentDirect';
import type { DivinationKind } from './divination';

export type AgentChartKind = 'bazi' | 'ziwei' | 'astrolabe' | 'qizheng' | 'bazi-ziwei';
export type AgentQimenScope = 'hour' | 'day' | 'month' | 'year';
export type AgentBaziFortuneScope = 'natal' | 'full' | 'dayun' | 'year';
export type AgentZiweiFortuneScope = 'origin' | 'full' | 'decadal' | 'yearly';
export type AgentAstrolabeFortuneScope = 'natal' | 'full' | 'yearly' | 'monthly' | 'daily';

export interface AgentBaziFortune {
  scope: AgentBaziFortuneScope;
  year?: number;
  ganZhi?: string;
}

export interface AgentZiweiFortune {
  scope: AgentZiweiFortuneScope;
  year?: number;
}

export interface AgentAstrolabeFortune {
  scope: AgentAstrolabeFortuneScope;
  date?: string;
}

export type AgentToolSelection =
  | { mode: 'continue' }
  | {
    mode: 'chart';
    chartKind: AgentChartKind;
    baziFortune?: AgentBaziFortune;
    ziweiFortune?: AgentZiweiFortune;
    astrolabeFortune?: AgentAstrolabeFortune;
  }
  | { mode: 'divination'; divinationKind: DivinationKind; qimenScope?: AgentQimenScope; wuyunYear?: number; huangjiYear?: number };

interface AgentSelectionRequest {
  question: string;
  hasProfile: boolean;
  inspirationMode?: 'matter' | 'natal';
  previousTool?: string;
  activeTool?: string;
  castingPreference: 'auto' | 'manual';
  conversation?: AiConversationMessage[];
  aiConfig?: AiCustomConfig;
}

const chartKinds = new Set<AgentChartKind>(['bazi', 'ziwei', 'astrolabe', 'qizheng', 'bazi-ziwei']);
const divinationKinds = new Set<DivinationKind>(['meihua', 'liuyao', 'ssgw', 'xiaoliuren', 'jinkoujue', 'qimen', 'liuren', 'taiyi', 'wuyun-liuqi', 'huangji-jingshi', 'almanac']);
const directlyCastableKinds = new Set<DivinationKind>(['meihua', 'liuyao', 'xiaoliuren', 'jinkoujue', 'qimen', 'liuren', 'taiyi']);
const qimenScopes = new Set<AgentQimenScope>(['hour', 'day', 'month', 'year']);
const baziFortuneScopes = new Set<AgentBaziFortuneScope>(['natal', 'full', 'dayun', 'year']);
const ziweiFortuneScopes = new Set<AgentZiweiFortuneScope>(['origin', 'full', 'decadal', 'yearly']);
const astrolabeFortuneScopes = new Set<AgentAstrolabeFortuneScope>(['natal', 'full', 'yearly', 'monthly', 'daily']);
const explicitlyNamedTools: Array<{ tool: string; pattern: RegExp }> = [
  { tool: 'bazi', pattern: /八字|四柱/ },
  { tool: 'ziwei', pattern: /紫[微薇]|斗数/ },
  { tool: 'astrolabe', pattern: /西方占星|星盘|占星/ },
  { tool: 'qizheng', pattern: /七政四余|果老星宗/ },
  { tool: 'liuyao', pattern: /六爻/ },
  { tool: 'meihua', pattern: /梅花易数|梅花/ },
  { tool: 'xiaoliuren', pattern: /小六壬/ },
  { tool: 'jinkoujue', pattern: /金口诀/ },
  { tool: 'qimen', pattern: /奇门遁甲|奇门/ },
  { tool: 'liuren', pattern: /大六壬/ },
  { tool: 'taiyi', pattern: /太乙神数|太乙/ },
  { tool: 'wuyun-liuqi', pattern: /五运六气/ },
  { tool: 'huangji-jingshi', pattern: /皇极经世/ },
  { tool: 'almanac', pattern: /黄历|择日/ },
  { tool: 'ssgw', pattern: /三山国王|灵签|求签|抽签/ },
];

export function getImmediateActiveDivinationSelection(question: string, activeTool: string | undefined, hasConversation: boolean): AgentToolSelection | null {
  if (hasConversation || !directlyCastableKinds.has(activeTool as DivinationKind)) return null;
  const namedTools = explicitlyNamedTools.filter(({ pattern }) => pattern.test(question)).map(({ tool }) => tool);
  if (namedTools.some((tool) => tool !== activeTool)) return null;
  return { mode: 'divination', divinationKind: activeTool as DivinationKind };
}

function validYear(value: unknown) {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1900 && value <= 2199 ? value : undefined;
}

function validAstrolabeDate(value: unknown, scope: AgentAstrolabeFortuneScope) {
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  if (scope === 'yearly' && /^(?:19|20|21)\d{2}$/.test(text)) return text;
  if (scope === 'monthly' && /^(?:19|20|21)\d{2}-(?:0[1-9]|1[0-2])$/.test(text)) return text;
  if ((scope === 'daily' || scope === 'full') && /^(?:19|20|21)\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/.test(text)) {
    const [year, month, day] = text.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) return text;
  }
  return undefined;
}

function parseSelection(value: unknown): AgentToolSelection {
  if (!value || typeof value !== 'object') throw new Error('AI 工具选择结果无法识别。');
  const selection = value as Record<string, unknown>;
  if (selection.mode === 'continue') return { mode: 'continue' };
  if (selection.mode === 'chart' && chartKinds.has(selection.chartKind as AgentChartKind)) {
    const rawFortune = selection.baziFortune;
    const fortune = rawFortune && typeof rawFortune === 'object'
      ? rawFortune as Record<string, unknown>
      : null;
    const scope = fortune && baziFortuneScopes.has(fortune.scope as AgentBaziFortuneScope)
      ? fortune.scope as AgentBaziFortuneScope
      : null;
    const year = validYear(fortune?.year);
    const ganZhi = typeof fortune?.ganZhi === 'string' && /^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]$/.test(fortune.ganZhi)
      ? fortune.ganZhi
      : undefined;
    const rawZiweiFortune = selection.ziweiFortune;
    const ziweiFortune = rawZiweiFortune && typeof rawZiweiFortune === 'object'
      ? rawZiweiFortune as Record<string, unknown>
      : null;
    const ziweiScope = ziweiFortune && ziweiFortuneScopes.has(ziweiFortune.scope as AgentZiweiFortuneScope)
      ? ziweiFortune.scope as AgentZiweiFortuneScope
      : null;
    const ziweiYear = validYear(ziweiFortune?.year);
    const rawAstrolabeFortune = selection.astrolabeFortune;
    const astrolabeFortune = rawAstrolabeFortune && typeof rawAstrolabeFortune === 'object'
      ? rawAstrolabeFortune as Record<string, unknown>
      : null;
    const astrolabeScope = astrolabeFortune && astrolabeFortuneScopes.has(astrolabeFortune.scope as AgentAstrolabeFortuneScope)
      ? astrolabeFortune.scope as AgentAstrolabeFortuneScope
      : null;
    const astrolabeDate = astrolabeScope ? validAstrolabeDate(astrolabeFortune?.date, astrolabeScope) : undefined;
    return {
      mode: 'chart',
      chartKind: selection.chartKind as AgentChartKind,
      ...(scope && (selection.chartKind === 'bazi' || selection.chartKind === 'bazi-ziwei')
        ? { baziFortune: { scope, ...((scope === 'year' || scope === 'dayun') && year ? { year } : {}), ...(scope === 'dayun' && ganZhi ? { ganZhi } : {}) } }
        : {}),
      ...(ziweiScope && (selection.chartKind === 'ziwei' || selection.chartKind === 'bazi-ziwei')
        ? { ziweiFortune: { scope: ziweiScope, ...((ziweiScope === 'yearly' || ziweiScope === 'decadal') && ziweiYear ? { year: ziweiYear } : {}) } }
        : {}),
      ...(astrolabeScope && selection.chartKind === 'astrolabe'
        ? { astrolabeFortune: { scope: astrolabeScope, ...(astrolabeDate ? { date: astrolabeDate } : {}) } }
        : {}),
    };
  }
  if (selection.mode === 'divination' && divinationKinds.has(selection.divinationKind as DivinationKind)) {
    const qimenScope = selection.divinationKind === 'qimen' && qimenScopes.has(selection.qimenScope as AgentQimenScope)
      ? selection.qimenScope as AgentQimenScope
      : undefined;
    const wuyunYear = selection.divinationKind === 'wuyun-liuqi'
      && typeof selection.wuyunYear === 'number'
      && Number.isInteger(selection.wuyunYear)
      && selection.wuyunYear >= 1900
      && selection.wuyunYear <= 2199
      ? selection.wuyunYear
      : undefined;
    const huangjiYear = selection.divinationKind === 'huangji-jingshi'
      && typeof selection.huangjiYear === 'number'
      && Number.isInteger(selection.huangjiYear)
      && selection.huangjiYear >= 1900
      && selection.huangjiYear <= 2199
      ? selection.huangjiYear
      : undefined;
    return {
      mode: 'divination',
      divinationKind: selection.divinationKind as DivinationKind,
      ...(qimenScope ? { qimenScope } : {}),
      ...(wuyunYear ? { wuyunYear } : {}),
      ...(huangjiYear ? { huangjiYear } : {}),
    };
  }
  throw new Error('AI 没有选择可用的术式。');
}

function responseError(payload: unknown, status: number) {
  if (payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string') return payload.error;
  return status === 404 ? '工具选择服务尚未接入当前环境。' : 'AI 暂时无法选择术式。';
}

export async function requestAgentToolSelection(payload: AgentSelectionRequest, signal?: AbortSignal, timeoutMs = 15_000): Promise<AgentToolSelection> {
  if (isCustomAiConfig(payload.aiConfig)) {
    if (shouldUseAiProxyFallback(payload.aiConfig!)) return requestAgentToolSelectionViaProxy(payload, signal, timeoutMs);
    const { aiConfig, ...directPayload } = payload;
    try {
      return await requestDirectAgentSelection(directPayload, aiConfig!, signal, timeoutMs);
    } catch (error) {
      if (shouldFallbackToProxy(error, 'AI 选择工具等待超时，请重试。')) {
        rememberAiProxyFallback(aiConfig!);
        return requestAgentToolSelectionViaProxy(payload, signal, timeoutMs);
      }
      throw error;
    }
  }
  return requestAgentToolSelectionViaProxy(payload, signal, timeoutMs);
}

async function requestAgentToolSelectionViaProxy(payload: AgentSelectionRequest, signal?: AbortSignal, timeoutMs = 15_000): Promise<AgentToolSelection> {
  const controller = new AbortController();
  let timedOut = false;
  const abortFromCaller = () => controller.abort(signal?.reason);
  if (signal?.aborted) abortFromCaller();
  else signal?.addEventListener('abort', abortFromCaller, { once: true });
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  try {
    const response = await fetch('/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const result = await response.json().catch(() => null) as unknown;
    if (!response.ok) throw new Error(responseError(result, response.status));
    if (!result || typeof result !== 'object' || !('selection' in result)) throw new Error('AI 工具选择结果无法识别。');
    return parseSelection(result.selection);
  } catch (error) {
    if (timedOut) throw new Error('AI 选择工具等待超时，请重试。');
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abortFromCaller);
  }
}
