import {
  buildCurrentBaziFortuneSelection,
  buildFortuneSelectionContext,
  type BaziChartResult,
  type BaziFortuneSelectionValue,
} from 'mingyu-core/bazi';
import {
  buildAstrolabePrompt,
  buildBaziPrompt,
  formatZiweiPayloadForPrompt,
  type BaziPromptTopic,
} from 'mingyu-core/prompt';
import type { AstrolabeData } from 'mingyu-core/types';
import { compactReadingPrompt } from './aiPrompt';
import type { QizhengChartData, ReadingResult, ZiweiChartData } from './divination';

export type ChartPromptKind = 'bazi' | 'ziwei' | 'astrolabe' | 'qizheng';

export interface BaziFortuneRequest {
  scope: 'natal' | 'full' | 'dayun' | 'year';
  cycleIndex?: number;
  year?: number;
  ganZhi?: string;
}

export interface ChartReadingPromptOptions {
  question?: string;
  baziFortune?: BaziFortuneRequest | null;
  currentTime?: Date;
}

type AstrolabePromptData = AstrolabeData & {
  fortuneScope?: {
    displayText?: string;
    displayLabel?: string;
    promptText?: string;
  };
  annualScope?: {
    displayText?: string;
    displayLabel?: string;
    promptText?: string;
  };
};

function includesAny(value: string, keywords: readonly string[]) {
  return keywords.some((keyword) => value.includes(keyword));
}

function inferBaziTopic(question: string): BaziPromptTopic {
  if (includesAny(question, ['换工作', '跳槽', '转岗', '离职'])) return 'job-change';
  if (includesAny(question, ['创业', '合伙开业'])) return 'startup-partnership';
  if (includesAny(question, ['投资', '合伙投资'])) return 'investment-partnership';
  if (includesAny(question, ['事业', '工作', '职业', '升职', '职场'])) return 'career';
  if (includesAny(question, ['财运', '财富', '收入', '赚钱', '资产'])) return 'wealth';
  if (includesAny(question, ['复合'])) return 'reconciliation-decision';
  if (includesAny(question, ['婚姻', '结婚', '姻缘', '配偶'])) return 'marriage';
  if (includesAny(question, ['感情', '恋爱', '关系'])) return 'relationship';
  if (includesAny(question, ['子女', '孩子', '生育', '求子'])) return 'children';
  if (includesAny(question, ['父母', '父亲', '母亲'])) return 'parents';
  if (includesAny(question, ['家庭', '六亲', '兄弟', '姐妹'])) return 'family';
  if (includesAny(question, ['健康', '疾病', '身体', '疾厄'])) return 'health';
  if (includesAny(question, ['考试', '上岸', '录取'])) return 'exam-landing';
  if (includesAny(question, ['学业', '学习', '读书'])) return 'study';
  if (includesAny(question, ['天赋', '擅长', '能力'])) return 'talent';
  if (includesAny(question, ['近况', '近期', '最近'])) return 'recent';
  return 'general';
}

export function inferBaziFortuneRequest(question: string, currentTime = new Date()): BaziFortuneRequest | null {
  const text = question.replace(/[\s，。！？、；：,.!?;:（）()【】\[\]“”"']/g, '');
  const currentYear = currentTime.getFullYear();
  if (includesAny(text, ['完整命书', '一生命书', '一生运势', '终身运势', '完整大运流年', '完整岁运', '一生大运', '终身大运', '未来几年', '未来数年']) || /未来[一二三四五六七八九十\d]+年/.test(text)) {
    return { scope: 'full' };
  }
  const explicitYear = text.match(/(?:19|20|21)\d{2}年?/)?.[0];
  if (explicitYear) return { scope: 'year', year: Number(explicitYear.slice(0, 4)) };
  if (includesAny(text, ['明年'])) return { scope: 'year', year: currentYear + 1 };
  if (includesAny(text, ['后年'])) return { scope: 'year', year: currentYear + 2 };
  if (includesAny(text, ['去年'])) return { scope: 'year', year: currentYear - 1 };
  if (includesAny(text, ['前年'])) return { scope: 'year', year: currentYear - 2 };
  if (includesAny(text, ['今年', '本年', '当前流年', '本流年'])) return { scope: 'year', year: currentYear };
  if (includesAny(text, ['流年'])) return { scope: 'year', year: currentYear };
  if (includesAny(text, ['当前大运', '本大运', '这步大运', '大运'])) return { scope: 'dayun' };
  if (includesAny(text, ['本命', '原局', '命局', '先天'])) return { scope: 'natal' };
  return null;
}

function completeBaziFortuneSelection(
  result: BaziChartResult,
  requested: BaziFortuneRequest,
  currentTime: Date,
): BaziFortuneSelectionValue {
  if (requested.scope === 'natal' || requested.scope === 'full') return { scope: requested.scope };
  if (requested.scope === 'year') {
    return {
      scope: 'year',
      ...(requested.cycleIndex === undefined ? {} : { cycleIndex: requested.cycleIndex }),
      year: requested.year ?? currentTime.getFullYear(),
    };
  }
  if (requested.cycleIndex !== undefined) return { scope: 'dayun', cycleIndex: requested.cycleIndex };
  const requestedCycleIndex = result.luckInfo.cycles.findIndex((cycle) => {
    if (requested.ganZhi && cycle.ganZhi === requested.ganZhi) return true;
    if (!requested.year) return false;
    const years = cycle.resolvedYears?.length ? cycle.resolvedYears : cycle.years;
    return years?.some((item) => item.year === requested.year);
  });
  if (requestedCycleIndex >= 0) return { scope: 'dayun', cycleIndex: requestedCycleIndex };
  const currentSelection = buildCurrentBaziFortuneSelection(result, currentTime);
  return currentSelection?.cycleIndex === undefined
    ? { scope: 'natal' }
    : { scope: 'dayun', cycleIndex: currentSelection.cycleIndex };
}

function buildBaziReadingPrompt(result: BaziChartResult, options: ChartReadingPromptOptions) {
  const currentTime = options.currentTime ?? new Date();
  const requested = options.baziFortune ?? inferBaziFortuneRequest(options.question || '', currentTime) ?? { scope: 'natal' as const };
  const selection = completeBaziFortuneSelection(result, requested, currentTime);
  let fortuneSelectionContext = null;
  try {
    fortuneSelectionContext = buildFortuneSelectionContext(result, selection);
  } catch {
    // 缓存中的旧盘可能不覆盖所问年份；仍保留本命资料，不伪造岁运上下文。
  }
  return compactReadingPrompt(buildBaziPrompt({
    result,
    currentTime,
    question: options.question,
    topic: inferBaziTopic(options.question || ''),
    fortuneScope: selection.scope,
    fortuneSelectionContext,
    fortuneFocus: fortuneSelectionContext?.displayLabel,
  }));
}

function formatZiweiPrompt(result: ZiweiChartData) {
  if (result.prompt?.trim()) return result.prompt.trim();
  return compactReadingPrompt(formatZiweiPayloadForPrompt(result.payloadByScope.origin || result.payload));
}

function formatAstrolabePrompt(result: AstrolabePromptData, options: ChartReadingPromptOptions) {
  const chartPrompt = compactReadingPrompt(buildAstrolabePrompt({
    chart: result,
    currentTime: options.currentTime,
    question: options.question,
  }));
  const fortuneScope = result.fortuneScope || result.annualScope;
  return [
    chartPrompt,
    fortuneScope?.promptText ? `【${fortuneScope.displayLabel || '推运资料'}】\n${fortuneScope.promptText}` : '',
  ].filter(Boolean).join('\n\n');
}

export function buildChartReadingPrompt(kind: ChartPromptKind, result: ReadingResult, options: ChartReadingPromptOptions = {}) {
  if (kind === 'bazi') return buildBaziReadingPrompt(result as BaziChartResult, options);
  if (kind === 'ziwei') return formatZiweiPrompt(result as ZiweiChartData);
  if (kind === 'qizheng') return compactReadingPrompt((result as QizhengChartData).prompt);
  return formatAstrolabePrompt(result as AstrolabePromptData, options);
}

function limitCombinedSection(value: string, maxLength = 12500) {
  if (value.length <= maxLength) return value;
  const sliced = value.slice(0, maxLength);
  const lastBreak = sliced.lastIndexOf('\n');
  return `${lastBreak > maxLength * 0.8 ? sliced.slice(0, lastBreak) : sliced}\n（其余低优先级明细已省略）`;
}

export function buildBaziZiweiCombinedPrompt(
  bazi: BaziChartResult,
  ziwei: ZiweiChartData,
  options: ChartReadingPromptOptions = {},
) {
  const baziPrompt = buildChartReadingPrompt('bazi', bazi, options);
  const ziweiPrompt = buildChartReadingPrompt('ziwei', ziwei);
  return compactReadingPrompt([
    `【八字盘面】\n${limitCombinedSection(baziPrompt)}`,
    `【紫微盘面】\n${limitCombinedSection(ziweiPrompt)}`,
  ].join('\n\n'));
}
