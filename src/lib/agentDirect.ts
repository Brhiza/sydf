import {
  getDirectAiConfig,
  requestDirectAiJson,
  type AiApiType,
  type AiConversationMessage,
  type AiCustomConfig,
} from './ai';
import { getChatThinkingControl } from './aiProvider';
import type { AgentToolSelection } from './agent';

type AgentToolName =
  | 'continue_reading'
  | 'read_bazi'
  | 'read_ziwei'
  | 'read_bazi_ziwei'
  | 'read_astrolabe'
  | 'read_qizheng'
  | 'cast_liuyao'
  | 'cast_meihua'
  | 'cast_xiaoliuren'
  | 'cast_qimen'
  | 'cast_liuren'
  | 'cast_taiyi'
  | 'calculate_wuyun_liuqi'
  | 'calculate_huangji_jingshi'
  | 'cast_jinkoujue'
  | 'select_almanac_date'
  | 'draw_ssgw_sign';

interface DirectAgentPayload {
  question: string;
  hasProfile: boolean;
  inspirationMode?: 'matter' | 'natal';
  previousTool?: string;
  activeTool?: string;
  castingPreference: 'auto' | 'manual';
  conversation?: AiConversationMessage[];
}

interface AgentToolDefinition {
  name: AgentToolName;
  description: string;
  parameters: Record<string, unknown>;
}

const emptyParameters = Object.freeze({ type: 'object', properties: {}, additionalProperties: false });
const baziFortuneParameters = Object.freeze({
  type: 'object',
  properties: {
    fortune_scope: { type: 'string', enum: ['natal', 'full', 'dayun', 'year'], description: '本命用 natal，完整多年岁运用 full，某步大运用 dayun，目标流年用 year。' },
    target_year: { type: 'integer', minimum: 1900, maximum: 2199, description: '目标公历年份。' },
    target_dayun_ganzhi: { type: 'string', pattern: '^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]$', description: '明确点名某步大运时填写其干支。' },
  },
  required: ['fortune_scope'],
  additionalProperties: false,
});
const ziweiFortuneParameters = Object.freeze({
  type: 'object',
  properties: {
    fortune_scope: { type: 'string', enum: ['origin', 'full', 'decadal', 'yearly'], description: '原局用 origin，完整运限用 full，目标大限用 decadal，目标流年用 yearly。' },
    target_year: { type: 'integer', minimum: 1900, maximum: 2199, description: '目标公历年份。' },
  },
  required: ['fortune_scope'],
  additionalProperties: false,
});
const astrolabeFortuneParameters = Object.freeze({
  type: 'object',
  properties: {
    fortune_scope: { type: 'string', enum: ['natal', 'full', 'yearly', 'monthly', 'daily'], description: '本命用 natal，完整推运用 full，年、月、日运分别用 yearly、monthly、daily。' },
    target_date: { type: 'string', description: 'yearly 用 YYYY，monthly 用 YYYY-MM，daily/full 用 YYYY-MM-DD。' },
  },
  required: ['fortune_scope'],
  additionalProperties: false,
});
const yearParameters = Object.freeze({
  type: 'object',
  properties: { year: { type: 'integer', minimum: 1900, maximum: 2199, description: '目标公历年份。' } },
  required: ['year'],
  additionalProperties: false,
});

const agentTools: AgentToolDefinition[] = [
  { name: 'continue_reading', description: '沿用上一轮盘面。仅用于没有改变年份、日期、运限或术式的解释和追问。', parameters: emptyParameters },
  { name: 'read_bazi', description: '八字命盘。适合八字、四柱、格局、喜忌、大运流年或长期个人趋势。需要出生案例。', parameters: baziFortuneParameters },
  { name: 'read_ziwei', description: '紫微斗数原局与运限。适合命宫、十二宫、四化、大限或流年。需要出生案例。', parameters: ziweiFortuneParameters },
  { name: 'read_bazi_ziwei', description: '八字与紫微合参。适合完整命书、多个领域或多年趋势。需要出生案例。', parameters: baziFortuneParameters },
  { name: 'read_astrolabe', description: '西方占星本命盘与推运。仅用于明确提到星盘、占星、行星、宫位、相位或推运的问题。需要出生案例。', parameters: astrolabeFortuneParameters },
  { name: 'read_qizheng', description: '七政四余传统星命盘。仅用于明确提到七政四余或果老星宗的问题。需要出生案例。', parameters: emptyParameters },
  { name: 'cast_liuyao', description: '六爻。适合有明确对象和时间范围的单件成败、进展、关系、求职、交易或失物问题。', parameters: emptyParameters },
  { name: 'cast_meihua', description: '梅花易数。适合突发念头、宽泛问事或其他工具都不明显适合的问题。', parameters: emptyParameters },
  { name: 'cast_xiaoliuren', description: '小六壬。适合明确点名小六壬或希望快速判断眼前事项的问题。', parameters: emptyParameters },
  { name: 'cast_qimen', description: '奇门遁甲。适合行动时机、方位、出行、布局、谈判和决策策略。', parameters: { type: 'object', properties: { scope: { type: 'string', enum: ['hour', 'day', 'month', 'year'] } }, required: ['scope'], additionalProperties: false } },
  { name: 'cast_liuren', description: '大六壬。适合人物关系复杂、过程多变的商业、纠纷、职场或多人事件。', parameters: emptyParameters },
  { name: 'cast_taiyi', description: '太乙神数。仅用于明确提到太乙或宏观年度、群体与大势问题。', parameters: emptyParameters },
  { name: 'calculate_wuyun_liuqi', description: '五运六气年度盘。只在明确提到五运六气、司天、在泉或中运时使用。', parameters: yearParameters },
  { name: 'calculate_huangji_jingshi', description: '皇极经世公元值年卦。只在明确提到皇极经世或值年卦时使用。', parameters: yearParameters },
  { name: 'cast_jinkoujue', description: '金口诀。适合明确点名金口诀或快速判断人事、来意和方位。', parameters: emptyParameters },
  { name: 'select_almanac_date', description: '择日。适合结婚、搬家、开业、签约、出行、手术、装修、入职或上线等日期安排。', parameters: emptyParameters },
  { name: 'draw_ssgw_sign', description: '三山国王灵签。只有明确要求求签、抽签、灵签或三山国王时使用。', parameters: emptyParameters },
];

const allowedToolNames = new Set(agentTools.map((tool) => tool.name));
const systemPrompt = [
  '你是时月东方的术数工具路由器。必须调用且只调用一个最适合完成当前问题的工具。',
  '不要回答问题，不要询问用户，不要输出解释，不要因为缺少出生资料而改选较弱的工具。',
  '明确术式名称最高优先；长期或完整命运用命盘；单件成败用六爻；行动时空策略用奇门；复杂人事过程用大六壬；明确日期安排用择日；宽泛突发问事才用梅花。',
  '“今年能否发生某件具体事情”仍是单件问事；“今年某领域整体趋势”才是命盘趋势。',
  '连续对话只补充新年份、月份、日期、大运、大限或流年时，沿用上一轮命盘工具并更新目标时间；不要调用 continue_reading。',
  '只有问题不改变盘面时间、范围和术式，只是在解释上一轮结论时，才调用 continue_reading。',
].join('\n');

function buildRouterPrompt(payload: DirectAgentPayload) {
  const conversation = Array.isArray(payload.conversation)
    ? payload.conversation.slice(-6).flatMap((item) => {
      const content = item.content.trim().slice(0, 1600);
      return content ? [{ role: item.role, content }] : [];
    })
    : [];
  const context = [
    `当前公历日期：${new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date())}`,
    `出生案例：${payload.hasProfile ? '可用' : '尚未完善；如问题需要命盘，仍应选择命盘工具'}`,
    `起卦偏好：${payload.castingPreference === 'auto' ? '自动' : '手动'}`,
    payload.inspirationMode ? `问题来源：${payload.inspirationMode === 'natal' ? '命书类问题灵感' : '单件问事类问题灵感'}` : '',
    payload.activeTool ? `用户当前选择的工具：${payload.activeTool}；未明确切换时优先使用，明确点名其他术式时切换` : '',
    payload.previousTool ? `上一轮工具：${payload.previousTool}；只有明显是追问时才延续` : '',
  ].filter(Boolean).join('\n');
  const history = conversation.length
    ? `\n最近对话：\n${conversation.map((item) => `${item.role === 'user' ? '用户' : '助手'}：${item.content}`).join('\n')}`
    : '';
  return `${context}${history}\n当前问题：${payload.question.trim()}`;
}

function toolDefinitions(apiType: AiApiType) {
  if (apiType === 'anthropic') return agentTools.map((tool) => ({ name: tool.name, description: tool.description, input_schema: tool.parameters }));
  if (apiType === 'responses') return agentTools.map((tool) => ({ type: 'function', name: tool.name, description: tool.description, parameters: tool.parameters }));
  return agentTools.map((tool) => ({ type: 'function', function: { name: tool.name, description: tool.description, parameters: tool.parameters } }));
}

function buildProviderBody(config: ReturnType<typeof getDirectAiConfig>, userPrompt: string) {
  const tools = toolDefinitions(config.apiType);
  if (config.apiType === 'responses') {
    return { model: config.model, instructions: systemPrompt, input: [{ role: 'user', content: userPrompt }], tools, tool_choice: 'required', store: false };
  }
  if (config.apiType === 'anthropic') {
    return { model: config.model, system: systemPrompt, messages: [{ role: 'user', content: userPrompt }], tools, tool_choice: { type: 'any' }, temperature: 0, max_tokens: 700 };
  }
  return { model: config.model, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], tools, tool_choice: 'required', temperature: 0, ...getChatThinkingControl(config) };
}

function normalizeArguments(value: unknown) {
  if (value && typeof value === 'object') return value as Record<string, unknown>;
  if (typeof value !== 'string' || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function extractToolCall(result: unknown, apiType: AiApiType) {
  if (!result || typeof result !== 'object') return null;
  const record = result as Record<string, unknown>;
  let name = '';
  let args: unknown = {};
  if (apiType === 'responses' && Array.isArray(record.output)) {
    const call = record.output.find((item) => item && typeof item === 'object' && (item as Record<string, unknown>).type === 'function_call') as Record<string, unknown> | undefined;
    name = typeof call?.name === 'string' ? call.name : '';
    args = call?.arguments;
  } else if (apiType === 'anthropic' && Array.isArray(record.content)) {
    const call = record.content.find((item) => item && typeof item === 'object' && (item as Record<string, unknown>).type === 'tool_use') as Record<string, unknown> | undefined;
    name = typeof call?.name === 'string' ? call.name : '';
    args = call?.input;
  } else if (Array.isArray(record.choices)) {
    const choice = record.choices[0] as Record<string, unknown> | undefined;
    const message = choice?.message as Record<string, unknown> | undefined;
    const calls = Array.isArray(message?.tool_calls) ? message.tool_calls : [];
    const call = calls[0] as Record<string, unknown> | undefined;
    const fn = call?.function as Record<string, unknown> | undefined;
    name = typeof fn?.name === 'string' ? fn.name : '';
    args = fn?.arguments;
  }
  if (!allowedToolNames.has(name as AgentToolName)) return null;
  return { name: name as AgentToolName, arguments: normalizeArguments(args) };
}

function validYear(value: unknown) {
  const year = Number(value);
  return Number.isInteger(year) && year >= 1900 && year <= 2199 ? year : undefined;
}

function validDate(value: unknown, scope: 'yearly' | 'monthly' | 'daily' | 'full') {
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  if (scope === 'yearly' && /^(?:19|20|21)\d{2}$/.test(text)) return text;
  if (scope === 'monthly' && /^(?:19|20|21)\d{2}-(?:0[1-9]|1[0-2])$/.test(text)) return text;
  if ((scope === 'daily' || scope === 'full') && /^(?:19|20|21)\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/.test(text)) {
    const [year, month, day] = text.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day) return text;
  }
  return undefined;
}

function selectionFromCall(call: { name: AgentToolName; arguments: Record<string, unknown> }): AgentToolSelection {
  const currentYear = Number(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date()).slice(0, 4));
  const baziScope = ['natal', 'full', 'dayun', 'year'].includes(String(call.arguments.fortune_scope))
    ? String(call.arguments.fortune_scope) as 'natal' | 'full' | 'dayun' | 'year'
    : 'natal';
  const targetYear = validYear(call.arguments.target_year);
  const ganZhi = typeof call.arguments.target_dayun_ganzhi === 'string' && /^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]$/.test(call.arguments.target_dayun_ganzhi)
    ? call.arguments.target_dayun_ganzhi
    : undefined;
  const baziFortune = { scope: baziScope, ...((baziScope === 'year' || baziScope === 'dayun') && targetYear ? { year: targetYear } : {}), ...(baziScope === 'dayun' && ganZhi ? { ganZhi } : {}) };
  if (call.name === 'continue_reading') return { mode: 'continue' };
  if (call.name === 'read_bazi') return { mode: 'chart', chartKind: 'bazi', baziFortune };
  if (call.name === 'read_bazi_ziwei') {
    const scope = ({ natal: 'origin', full: 'full', dayun: 'decadal', year: 'yearly' } as const)[baziScope];
    return { mode: 'chart', chartKind: 'bazi-ziwei', baziFortune, ziweiFortune: { scope, ...((scope === 'yearly' || scope === 'decadal') ? { year: targetYear ?? currentYear } : {}) } };
  }
  if (call.name === 'read_ziwei') {
    const scope = ['origin', 'full', 'decadal', 'yearly'].includes(String(call.arguments.fortune_scope))
      ? String(call.arguments.fortune_scope) as 'origin' | 'full' | 'decadal' | 'yearly'
      : 'origin';
    return { mode: 'chart', chartKind: 'ziwei', ziweiFortune: { scope, ...((scope === 'yearly' || scope === 'decadal') ? { year: targetYear ?? currentYear } : {}) } };
  }
  if (call.name === 'read_astrolabe') {
    const scope = ['natal', 'full', 'yearly', 'monthly', 'daily'].includes(String(call.arguments.fortune_scope))
      ? String(call.arguments.fortune_scope) as 'natal' | 'full' | 'yearly' | 'monthly' | 'daily'
      : 'natal';
    const date = scope === 'natal' ? undefined : validDate(call.arguments.target_date, scope);
    return { mode: 'chart', chartKind: 'astrolabe', astrolabeFortune: { scope, ...(date ? { date } : {}) } };
  }
  if (call.name === 'read_qizheng') return { mode: 'chart', chartKind: 'qizheng' };
  if (call.name === 'calculate_wuyun_liuqi') return { mode: 'divination', divinationKind: 'wuyun-liuqi', wuyunYear: validYear(call.arguments.year) ?? currentYear };
  if (call.name === 'calculate_huangji_jingshi') return { mode: 'divination', divinationKind: 'huangji-jingshi', huangjiYear: validYear(call.arguments.year) ?? currentYear };
  const divinationKind = ({
    cast_liuyao: 'liuyao', cast_meihua: 'meihua', cast_xiaoliuren: 'xiaoliuren', cast_qimen: 'qimen', cast_liuren: 'liuren', cast_taiyi: 'taiyi', cast_jinkoujue: 'jinkoujue', select_almanac_date: 'almanac', draw_ssgw_sign: 'ssgw',
  } as const)[call.name as 'cast_liuyao' | 'cast_meihua' | 'cast_xiaoliuren' | 'cast_qimen' | 'cast_liuren' | 'cast_taiyi' | 'cast_jinkoujue' | 'select_almanac_date' | 'draw_ssgw_sign'];
  const qimenScope = call.name === 'cast_qimen' && ['hour', 'day', 'month', 'year'].includes(String(call.arguments.scope))
    ? String(call.arguments.scope) as 'hour' | 'day' | 'month' | 'year'
    : undefined;
  return { mode: 'divination', divinationKind, ...(qimenScope ? { qimenScope } : {}) };
}

export async function requestDirectAgentSelection(
  payload: DirectAgentPayload,
  aiConfig: AiCustomConfig,
  signal?: AbortSignal,
  timeoutMs = 15_000,
) {
  const config = getDirectAiConfig(aiConfig);
  const result = await requestDirectAiJson(config, buildProviderBody(config, buildRouterPrompt(payload)), signal, timeoutMs, 'AI 选择工具等待超时，请重试。');
  const call = extractToolCall(result, config.apiType);
  if (!call) throw new Error('当前 AI 无法完成工具选择。');
  return selectionFromCall(call);
}
