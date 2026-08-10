import {
  getBuiltinAiConfig,
  getCustomAiConfig,
  requestProviderJson,
  type AiApiType,
  type AiEnv,
  type AiProviderConfig,
  type AiRequestConfig,
} from './interpret';

type AgentToolName =
  | 'read_bazi'
  | 'read_ziwei'
  | 'read_bazi_ziwei'
  | 'read_astrolabe'
  | 'read_qizheng'
  | 'cast_liuyao'
  | 'cast_meihua'
  | 'cast_qimen'
  | 'cast_liuren'
  | 'cast_taiyi'
  | 'calculate_wuyun_liuqi'
  | 'calculate_huangji_jingshi'
  | 'cast_jinkoujue'
  | 'select_almanac_date'
  | 'draw_ssgw_sign';

interface AgentPayload {
  question?: string;
  hasProfile?: boolean;
  inspirationMode?: 'matter' | 'natal';
  previousTool?: string;
  castingPreference?: 'auto' | 'manual';
  conversation?: Array<{ role?: unknown; content?: unknown }>;
  aiConfig?: AiRequestConfig;
}

interface AgentToolDefinition {
  name: AgentToolName;
  description: string;
  parameters: Record<string, unknown>;
}

const MAX_QUESTION_LENGTH = 4000;
const emptyParameters = Object.freeze({ type: 'object', properties: {}, additionalProperties: false });
const baziFortuneParameters = Object.freeze({
  type: 'object',
  properties: {
    fortune_scope: {
      type: 'string',
      enum: ['natal', 'full', 'dayun', 'year'],
      description: '只看原局用 natal，完整多年岁运用 full，当前所在大运用 dayun，指定或当前流年用 year。',
    },
    target_year: {
      type: 'integer',
      minimum: 1900,
      maximum: 2199,
      description: 'fortune_scope 为 year 时填写公历年份；“今年、明年”等应换算成明确年份。',
    },
  },
  required: ['fortune_scope'],
  additionalProperties: false,
});
const wuyunLiuqiParameters = Object.freeze({
  type: 'object',
  properties: {
    year: {
      type: 'integer',
      minimum: 1900,
      maximum: 2199,
      description: '要查看的公历年份；“今年、明年”等必须换算成明确年份。',
    },
  },
  required: ['year'],
  additionalProperties: false,
});
const annualYearParameters = wuyunLiuqiParameters;
const agentTools: AgentToolDefinition[] = [
  { name: 'read_bazi', description: '调用八字命盘。适合明确询问八字、四柱、五行、十神、格局、喜忌、大运流年，或长期个人趋势。必须按问题指定本命、完整岁运、当前大运或目标流年。需要出生案例。', parameters: baziFortuneParameters },
  { name: 'read_ziwei', description: '调用紫微斗数命盘。适合明确询问紫微、命宫、身宫、十二宫、主星、四化、大限流年。需要出生案例。', parameters: emptyParameters },
  { name: 'read_bazi_ziwei', description: '调用八字与紫微合参。适合完整命书、综合人生、长期事业财富婚姻健康、多个领域或多年趋势的全面分析。必须为其中的八字部分指定本命或岁运范围。需要出生案例。', parameters: baziFortuneParameters },
  { name: 'read_astrolabe', description: '调用西方占星本命盘。仅用于明确提到星盘、占星、星座、行星、宫位、相位或上升等西方占星问题。需要出生案例。', parameters: emptyParameters },
  { name: 'read_qizheng', description: '调用七政四余传统星命盘。仅用于明确提到七政四余、果老星宗、宿度、罗睺、计都、月孛或紫炁的问题。需要出生案例。', parameters: emptyParameters },
  { name: 'cast_liuyao', description: '调用六爻。适合有明确对象和时间范围的单件问事，如能否、成败、结果、进展、对方态度、关系走向、求职录取、交易或失物。', parameters: emptyParameters },
  { name: 'cast_meihua', description: '调用梅花易数。适合突发念头、宽泛问事、临时取象，或其他工具都不明显适合的问题。', parameters: emptyParameters },
  { name: 'cast_qimen', description: '调用奇门遁甲。适合行动时机、方位、出行、布局、谈判、竞争、寻找失物、决策策略。scope 按问题时间跨度选择。', parameters: { type: 'object', properties: { scope: { type: 'string', enum: ['hour', 'day', 'month', 'year'], description: '当下行动用 hour，某日用 day，月度用 month，年度用 year。' } }, required: ['scope'], additionalProperties: false } },
  { name: 'cast_liuren', description: '调用大六壬。适合人物关系复杂、过程多变的现实事件，尤其商业合作、官非纠纷、职场博弈、多人事件和事情来龙去脉。', parameters: emptyParameters },
  { name: 'cast_taiyi', description: '调用太乙神数。仅用于明确提到太乙，或宏观年度、群体、地区与大势问题，不用于普通个人小事。', parameters: emptyParameters },
  { name: 'calculate_wuyun_liuqi', description: '调用五运六气年度盘。只在用户明确提到五运六气、司天、在泉或中运时使用，并按问题选择公历年份；不用于普通个人健康或泛泛运势问题。', parameters: wuyunLiuqiParameters },
  { name: 'calculate_huangji_jingshi', description: '调用皇极经世公元值年卦。只在用户明确提到皇极经世、值年卦、元会运世、会内统卦或六十年统卦时使用，并按问题选择公历年份；用于观察公共年度与长周期取象，不替代个人命盘。', parameters: annualYearParameters },
  { name: 'cast_jinkoujue', description: '调用金口诀。适合明确提到金口诀，或要求快速判断人事、来意、方位和即时吉凶。', parameters: emptyParameters },
  { name: 'select_almanac_date', description: '调用择日。适合询问哪天适合结婚、领证、搬家、开业、签约、出行、手术、装修、入职、上线等明确日期安排。', parameters: emptyParameters },
  { name: 'draw_ssgw_sign', description: '进入三山国王灵签。只有用户明确要求求签、抽签、灵签或三山国王时才调用，求签必须由用户手动完成。', parameters: emptyParameters },
];

const allowedToolNames = new Set(agentTools.map((tool) => tool.name));

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function sanitizeConversation(value: AgentPayload['conversation']) {
  if (!Array.isArray(value)) return [];
  return value.slice(-6).flatMap((item) => {
    const role = item?.role === 'assistant' ? 'assistant' : item?.role === 'user' ? 'user' : null;
    const content = typeof item?.content === 'string' ? item.content.trim().slice(0, 1600) : '';
    return role && content ? [{ role, content }] : [];
  });
}

function buildRouterPrompt(payload: AgentPayload, question: string) {
  const conversation = sanitizeConversation(payload.conversation);
  const context = [
    `出生案例：${payload.hasProfile ? '可用' : '尚未完善；如问题确实需要命盘，仍应选择命盘工具，应用会引导用户补充'}`,
    `起卦偏好：${payload.castingPreference === 'auto' ? '自动' : '手动'}`,
    payload.inspirationMode ? `问题来源：${payload.inspirationMode === 'natal' ? '命书类问题灵感' : '单件问事类问题灵感'}` : '',
    payload.previousTool ? `上一轮工具：${payload.previousTool}；只有当前问题明显是追问时才延续` : '',
  ].filter(Boolean).join('\n');
  const history = conversation.length
    ? `\n最近对话：\n${conversation.map((item) => `${item.role === 'user' ? '用户' : '助手'}：${item.content}`).join('\n')}`
    : '';
  return `${context}${history}\n当前问题：${question}`;
}

const systemPrompt = [
  '你是时月东方的术数工具路由器。必须调用且只调用一个最适合完成当前问题的工具。',
  '不要回答问题，不要询问用户，不要输出解释，不要因为缺少出生资料而改选较弱的工具。',
  '选择顺序以问题性质为准：明确术式名称最高优先；长期或完整命运用命盘；单件成败用六爻；行动时空策略用奇门；复杂人事过程用大六壬；明确日期安排用择日；宽泛突发问事才用梅花。',
  '“今年能否发生某件具体事情”仍是单件问事；“今年某领域整体趋势”才是命盘趋势。',
  '调用八字或八字紫微合参时必须设置 fortune_scope：普通本命主题用 natal；完整多年趋势用 full；只问当前大运用 dayun；问今年、明年或明确年份的整体趋势用 year，并把公历年份写入 target_year。',
  '太乙、五运六气、皇极经世、金口诀、三山国王灵签只在用户明确点名或语义高度对应时选择；五运六气与皇极经世必须传入明确的公历年份。',
].join('\n');

function toolDefinitions(apiType: AiApiType) {
  if (apiType === 'anthropic') return agentTools.map((tool) => ({ name: tool.name, description: tool.description, input_schema: tool.parameters }));
  if (apiType === 'responses') return agentTools.map((tool) => ({ type: 'function', name: tool.name, description: tool.description, parameters: tool.parameters }));
  return agentTools.map((tool) => ({ type: 'function', function: { name: tool.name, description: tool.description, parameters: tool.parameters } }));
}

function buildProviderBody(config: AiProviderConfig, userPrompt: string) {
  const tools = toolDefinitions(config.apiType);
  if (config.apiType === 'responses') {
    return { model: config.model, instructions: systemPrompt, input: [{ role: 'user', content: userPrompt }], tools, tool_choice: 'required', store: false, max_output_tokens: 700 };
  }
  if (config.apiType === 'anthropic') {
    return { model: config.model, system: systemPrompt, messages: [{ role: 'user', content: userPrompt }], tools, tool_choice: { type: 'any' }, temperature: 0, max_tokens: 700 };
  }
  return { model: config.model, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], tools, tool_choice: 'required', temperature: 0, max_tokens: 700 };
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

function extractToolCall(result: unknown, apiType: AiApiType): { name: AgentToolName; arguments: Record<string, unknown> } | null {
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

function selectionFromCall(call: { name: AgentToolName; arguments: Record<string, unknown> }) {
  const baziFortune = () => {
    const scope = ['natal', 'full', 'dayun', 'year'].includes(String(call.arguments.fortune_scope))
      ? String(call.arguments.fortune_scope)
      : 'natal';
    const targetYear = Number(call.arguments.target_year);
    return {
      scope,
      ...(scope === 'year' && Number.isInteger(targetYear) && targetYear >= 1900 && targetYear <= 2199
        ? { year: targetYear }
        : {}),
    };
  };
  if (call.name === 'read_bazi') return { mode: 'chart', chartKind: 'bazi', baziFortune: baziFortune() };
  if (call.name === 'read_ziwei') return { mode: 'chart', chartKind: 'ziwei' };
  if (call.name === 'read_bazi_ziwei') return { mode: 'chart', chartKind: 'bazi-ziwei', baziFortune: baziFortune() };
  if (call.name === 'read_astrolabe') return { mode: 'chart', chartKind: 'astrolabe' };
  if (call.name === 'read_qizheng') return { mode: 'chart', chartKind: 'qizheng' };
  if (call.name === 'calculate_wuyun_liuqi') {
    const year = Number(call.arguments.year);
    return {
      mode: 'divination',
      divinationKind: 'wuyun-liuqi',
      wuyunYear: Number.isInteger(year) && year >= 1900 && year <= 2199 ? year : new Date().getFullYear(),
    };
  }
  if (call.name === 'calculate_huangji_jingshi') {
    const year = Number(call.arguments.year);
    return {
      mode: 'divination',
      divinationKind: 'huangji-jingshi',
      huangjiYear: Number.isInteger(year) && year >= 1900 && year <= 2199 ? year : new Date().getFullYear(),
    };
  }
  const divinationKind = ({
    cast_liuyao: 'liuyao',
    cast_meihua: 'meihua',
    cast_qimen: 'qimen',
    cast_liuren: 'liuren',
    cast_taiyi: 'taiyi',
    cast_jinkoujue: 'jinkoujue',
    select_almanac_date: 'almanac',
    draw_ssgw_sign: 'ssgw',
  } as const)[call.name as Exclude<AgentToolName, 'read_bazi' | 'read_ziwei' | 'read_bazi_ziwei' | 'read_astrolabe' | 'read_qizheng' | 'calculate_wuyun_liuqi' | 'calculate_huangji_jingshi'>];
  const scope = call.name === 'cast_qimen' && ['hour', 'day', 'month', 'year'].includes(String(call.arguments.scope))
    ? String(call.arguments.scope)
    : undefined;
  return { mode: 'divination', divinationKind, ...(scope ? { qimenScope: scope } : {}) };
}

async function requestSelection(config: AiProviderConfig, userPrompt: string) {
  const result = await requestProviderJson(config, buildProviderBody(config, userPrompt));
  const call = extractToolCall(result, config.apiType);
  if (!call) throw new Error('model did not call an allowed tool');
  return selectionFromCall(call);
}

export async function handleAgentPost(context: { request: Request; env: AiEnv }) {
  let payload: AgentPayload;
  try {
    payload = await context.request.json() as AgentPayload;
  } catch {
    return jsonResponse({ error: '请求内容不是有效的 JSON。' }, 400);
  }
  const question = payload.question?.trim() || '';
  if (!question) return jsonResponse({ error: '请先写下你想问的事。' }, 400);
  if (question.length > MAX_QUESTION_LENGTH) return jsonResponse({ error: '问题内容过长，请精简后再试。' }, 400);

  const customConfig = getCustomAiConfig(payload);
  if (customConfig && 'error' in customConfig) return jsonResponse({ error: customConfig.error }, 400);
  const userPrompt = buildRouterPrompt(payload, question);
  if (customConfig) {
    try {
      return jsonResponse({ selection: await requestSelection(customConfig, userPrompt) });
    } catch {
      return jsonResponse({ error: '当前 AI 无法完成工具选择。' }, 502);
    }
  }

  const builtinConfig = getBuiltinAiConfig(context.env);
  if (!builtinConfig) return jsonResponse({ error: 'AI 服务尚未配置，请稍后再试。' }, 503);

  try {
    return jsonResponse({ selection: await requestSelection(builtinConfig, userPrompt) });
  } catch {
    return jsonResponse({ error: '暂时无法自动选择合适的方式。' }, 502);
  }
}
