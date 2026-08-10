import type { AiConversationMessage, AiCustomConfig } from './ai';
import type { DivinationKind } from './divination';

export type AgentChartKind = 'bazi' | 'ziwei' | 'astrolabe' | 'qizheng' | 'bazi-ziwei';
export type AgentQimenScope = 'hour' | 'day' | 'month' | 'year';
export type AgentBaziFortuneScope = 'natal' | 'full' | 'dayun' | 'year';

export interface AgentBaziFortune {
  scope: AgentBaziFortuneScope;
  year?: number;
}

export type AgentToolSelection =
  | { mode: 'chart'; chartKind: AgentChartKind; baziFortune?: AgentBaziFortune }
  | { mode: 'divination'; divinationKind: DivinationKind; qimenScope?: AgentQimenScope; wuyunYear?: number; huangjiYear?: number };

interface AgentSelectionRequest {
  question: string;
  hasProfile: boolean;
  inspirationMode?: 'matter' | 'natal';
  previousTool?: string;
  castingPreference: 'auto' | 'manual';
  conversation?: AiConversationMessage[];
  aiConfig?: AiCustomConfig;
}

const chartKinds = new Set<AgentChartKind>(['bazi', 'ziwei', 'astrolabe', 'qizheng', 'bazi-ziwei']);
const divinationKinds = new Set<DivinationKind>(['meihua', 'liuyao', 'ssgw', 'jinkoujue', 'qimen', 'liuren', 'taiyi', 'wuyun-liuqi', 'huangji-jingshi', 'almanac']);
const qimenScopes = new Set<AgentQimenScope>(['hour', 'day', 'month', 'year']);
const baziFortuneScopes = new Set<AgentBaziFortuneScope>(['natal', 'full', 'dayun', 'year']);

function parseSelection(value: unknown): AgentToolSelection {
  if (!value || typeof value !== 'object') throw new Error('AI 工具选择结果无法识别。');
  const selection = value as Record<string, unknown>;
  if (selection.mode === 'chart' && chartKinds.has(selection.chartKind as AgentChartKind)) {
    const rawFortune = selection.baziFortune;
    const fortune = rawFortune && typeof rawFortune === 'object'
      ? rawFortune as Record<string, unknown>
      : null;
    const scope = fortune && baziFortuneScopes.has(fortune.scope as AgentBaziFortuneScope)
      ? fortune.scope as AgentBaziFortuneScope
      : null;
    const year = typeof fortune?.year === 'number' && Number.isInteger(fortune.year) && fortune.year >= 1900 && fortune.year <= 2199
      ? fortune.year
      : undefined;
    return {
      mode: 'chart',
      chartKind: selection.chartKind as AgentChartKind,
      ...(scope && (selection.chartKind === 'bazi' || selection.chartKind === 'bazi-ziwei')
        ? { baziFortune: { scope, ...(scope === 'year' && year ? { year } : {}) } }
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

export async function requestAgentToolSelection(payload: AgentSelectionRequest, signal?: AbortSignal): Promise<AgentToolSelection> {
  const response = await fetch('/api/agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });
  const result = await response.json().catch(() => null) as unknown;
  if (!response.ok) throw new Error(responseError(result, response.status));
  if (!result || typeof result !== 'object' || !('selection' in result)) throw new Error('AI 工具选择结果无法识别。');
  return parseSelection(result.selection);
}

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function normalizedQuestion(question: string) {
  return question.toLocaleLowerCase().replace(/[\s，。！？、；：,.!?;:（）()【】\[\]“”"']/g, '');
}

function rejectsSign(text: string) {
  return includesAny(text, ['不想抽签', '不要抽签', '不抽签', '不想求签', '不要求签', '不用灵签', '不要灵签']);
}

export function selectLocalAgentTool(question: string): AgentToolSelection {
  const text = normalizedQuestion(question);
  const currentYear = new Date().getFullYear();
  const explicitYear = text.match(/(?:19|20|21)\d{2}年?/)?.[0];
  const targetYear = explicitYear
    ? Number(explicitYear.slice(0, 4))
    : text.includes('明年') ? currentYear + 1
      : text.includes('后年') ? currentYear + 2
        : text.includes('去年') ? currentYear - 1
          : text.includes('前年') ? currentYear - 2
            : includesAny(text, ['今年', '本年']) ? currentYear
              : undefined;
  const fullFortune = includesAny(text, ['完整大运流年', '完整岁运', '一生大运', '终身大运', '未来几年', '未来数年']) || /未来[一二三四五六七八九十\d]+年/.test(text);
  const baziFortune: AgentBaziFortune = fullFortune
    ? { scope: 'full' }
    : targetYear || text.includes('流年')
      ? { scope: 'year', year: targetYear ?? currentYear }
      : includesAny(text, ['当前大运', '本大运', '这步大运', '大运'])
        ? { scope: 'dayun' }
        : { scope: 'natal' };

  if (includesAny(text, ['八字紫微合参', '八紫合参', '两盘合参', '双盘合参'])) return { mode: 'chart', chartKind: 'bazi-ziwei', baziFortune };
  if (includesAny(text, ['三山国王', '灵签', '求签', '抽签', '签诗']) && !rejectsSign(text)) return { mode: 'divination', divinationKind: 'ssgw' };
  if (includesAny(text, ['七政四余', '果老星宗', '宿度', '罗睺', '计都', '月孛', '紫炁'])) return { mode: 'chart', chartKind: 'qizheng' };
  if (includesAny(text, ['紫微斗数', '紫微盘', '命宫', '身宫', '官禄宫', '财帛宫', '迁移宫', '福德宫', '田宅宫', '四化'])) return { mode: 'chart', chartKind: 'ziwei' };
  if (includesAny(text, ['西洋占星', '西方占星', '本命星盘', '星盘', '占星', '上升星座', '行星', '相位'])) return { mode: 'chart', chartKind: 'astrolabe' };
  if (includesAny(text, ['八字', '四柱', '五行', '十神', '日主', '喜用神', '用神', '命格', '大运', '流年'])) return { mode: 'chart', chartKind: 'bazi', baziFortune };
  if (includesAny(text, ['五运六气', '司天在泉', '司天', '在泉', '中运'])) return { mode: 'divination', divinationKind: 'wuyun-liuqi', wuyunYear: targetYear ?? currentYear };
  if (includesAny(text, ['皇极经世', '值年卦', '元会运世', '会内统卦', '六十年统卦'])) return { mode: 'divination', divinationKind: 'huangji-jingshi', huangjiYear: targetYear ?? currentYear };
  if (includesAny(text, ['太乙神数', '太乙局', '太乙'])) return { mode: 'divination', divinationKind: 'taiyi' };
  if (includesAny(text, ['大六壬', '六壬课', '六壬'])) return { mode: 'divination', divinationKind: 'liuren' };
  if (includesAny(text, ['金口诀', '金口决'])) return { mode: 'divination', divinationKind: 'jinkoujue' };
  if (includesAny(text, ['奇门遁甲', '奇门局', '奇门'])) return { mode: 'divination', divinationKind: 'qimen', qimenScope: 'hour' };
  if (includesAny(text, ['六爻', '纳甲'])) return { mode: 'divination', divinationKind: 'liuyao' };
  if (includesAny(text, ['梅花易数', '梅花起卦'])) return { mode: 'divination', divinationKind: 'meihua' };

  if (includesAny(text, ['择日', '吉日', '黄道吉日', '选日子', '哪天适合'])
    || (includesAny(text, ['日期', '日子', '什么时候办']) && includesAny(text, ['结婚', '领证', '搬家', '入宅', '开业', '签约', '出行', '手术', '装修', '面试', '入职', '上线', '买房', '租房', '提车']))) {
    return { mode: 'divination', divinationKind: 'almanac' };
  }

  const isConcreteEvent = includesAny(text, ['升职', '录取', '入职', '复合', '表白', '成交', '签约', '回款', '怀孕', '找到', '失物', '诉讼', '考试通过', '申请通过']);
  const asksOutcome = includesAny(text, ['是否', '能不能', '会不会', '可不可以', '成不成', '有没有可能', '结果如何', '能否']);
  const asksOverallTrend = includesAny(text, ['整体', '趋势', '长期', '一生', '终身', '命书', '完整命盘', '人生全局', '未来几年', '这几年']) || /未来[一二三四五六七八九十\d]+年/.test(text);
  if (isConcreteEvent && asksOutcome && !asksOverallTrend) return { mode: 'divination', divinationKind: 'liuyao' };

  const lifeDomains = ['事业', '财运', '财富', '婚姻', '感情', '健康', '家庭', '子女', '学业'].filter((keyword) => text.includes(keyword)).length;
  if (includesAny(text, ['全面分析', '综合分析', '完整命书', '整个人生', '人生全局']) || (asksOverallTrend && lifeDomains >= 2)) {
    return { mode: 'chart', chartKind: 'bazi-ziwei', baziFortune };
  }
  if (asksOverallTrend || includesAny(text, ['大运', '流年', '先天', '未来半年', '今年事业整体', '今年财运整体'])) {
    return { mode: 'chart', chartKind: 'bazi', baziFortune };
  }

  if (includesAny(text, ['方位', '方向', '行动策略', '何时行动', '什么时候行动', '谈判', '竞争', '布局', '出行路线', '寻找失物', '失物方位'])) {
    return { mode: 'divination', divinationKind: 'qimen', qimenScope: 'hour' };
  }
  if (includesAny(text, ['官司', '官非', '纠纷', '商业合作', '合伙博弈', '多人关系', '来龙去脉', '幕后原因', '职场博弈'])) {
    return { mode: 'divination', divinationKind: 'liuren' };
  }
  if (asksOutcome || includesAny(text, ['对方态度', '真实想法', '关系走向', '事情走向', '近期进展', '内心', '心理', '感情状态'])) {
    return { mode: 'divination', divinationKind: 'liuyao' };
  }
  return { mode: 'divination', divinationKind: 'meihua' };
}
