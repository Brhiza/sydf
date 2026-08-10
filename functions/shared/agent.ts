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

interface AgentPayload {
  question?: string;
  hasProfile?: boolean;
  inspirationMode?: 'matter' | 'natal';
  previousTool?: string;
  activeTool?: string;
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
      description: 'fortune_scope 为 year 时填写流年年份；dayun 时可填写用于定位该年份所在大运。“今年、明年”等应换算成明确年份。',
    },
    target_dayun_ganzhi: {
      type: 'string',
      pattern: '^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]$',
      description: '用户明确点名某步大运时填写其干支，例如“庚午大运”填写“庚午”；只在 fortune_scope 为 dayun 时使用。',
    },
  },
  required: ['fortune_scope'],
  additionalProperties: false,
});
const ziweiFortuneParameters = Object.freeze({
  type: 'object',
  properties: {
    fortune_scope: {
      type: 'string',
      enum: ['origin', 'full', 'decadal', 'yearly'],
      description: '只看原局用 origin，原局与完整运限用 full，当前或指定年份所在大限用 decadal，目标流年用 yearly。',
    },
    target_year: {
      type: 'integer',
      minimum: 1900,
      maximum: 2199,
      description: 'yearly 必填；decadal 可填写用于定位该年份所在大限。“今年、明年”等应换算成明确年份。',
    },
  },
  required: ['fortune_scope'],
  additionalProperties: false,
});
const astrolabeFortuneParameters = Object.freeze({
  type: 'object',
  properties: {
    fortune_scope: {
      type: 'string',
      enum: ['natal', 'full', 'yearly', 'monthly', 'daily'],
      description: '只看本命用 natal，完整推运用 full，年度、月度、日运分别用 yearly、monthly、daily。',
    },
    target_date: {
      type: 'string',
      description: '目标日期：yearly 用 YYYY，monthly 用 YYYY-MM，daily/full 用 YYYY-MM-DD；相对日期必须换算成明确值。',
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
  { name: 'continue_reading', description: '沿用上一轮已经取得的盘面或卦象，不重新排盘。仅当当前问题是在解释、澄清或追问上一轮已有资料，且没有改变年份、日期、运限范围或术式时使用；只要用户补充了新年份、月份、日期、大运、大限或流年，就必须改调用对应命盘工具。', parameters: emptyParameters },
  { name: 'read_bazi', description: '调用八字命盘。适合明确询问八字、四柱、五行、十神、格局、喜忌、大运流年，或长期个人趋势。必须按问题指定本命、完整岁运、当前大运或目标流年。需要出生案例。', parameters: baziFortuneParameters },
  { name: 'read_ziwei', description: '调用紫微斗数原局与运限。适合明确询问紫微、命宫、身宫、十二宫、主星、四化、大限或流年；必须选择原局、完整运限、目标大限或目标流年。需要出生案例。', parameters: ziweiFortuneParameters },
  { name: 'read_bazi_ziwei', description: '调用八字与紫微合参。适合完整命书、综合人生、长期事业财富婚姻健康、多个领域或多年趋势的全面分析。fortune_scope 同步决定八字与紫微范围：natal 对应原局，full 对应完整岁运，dayun 对应大运/大限，year 对应同一目标年份的流年。需要出生案例。', parameters: baziFortuneParameters },
  { name: 'read_astrolabe', description: '调用西方占星本命盘与推运。仅用于明确提到星盘、占星、星座、行星、宫位、相位、上升、行运、太阳返照、次限或太阳弧的问题；必须选择本命、完整、年度、月度或日运。需要出生案例。', parameters: astrolabeFortuneParameters },
  { name: 'read_qizheng', description: '调用七政四余传统星命盘。仅用于明确提到七政四余、果老星宗、宿度、罗睺、计都、月孛或紫炁的问题。需要出生案例。', parameters: emptyParameters },
  { name: 'cast_liuyao', description: '调用六爻。适合有明确对象和时间范围的单件问事，如能否、成败、结果、进展、对方态度、关系走向、求职录取、交易或失物。', parameters: emptyParameters },
  { name: 'cast_meihua', description: '调用梅花易数。适合突发念头、宽泛问事、临时取象，或其他工具都不明显适合的问题。', parameters: emptyParameters },
  { name: 'cast_xiaoliuren', description: '调用小六壬。适合明确提到小六壬，或希望以月、日、时快速判断眼前事项吉凶的问题。', parameters: emptyParameters },
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
    `当前公历日期：${new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date())}`,
    `出生案例：${payload.hasProfile ? '可用' : '尚未完善；如问题确实需要命盘，仍应选择命盘工具，应用会引导用户补充'}`,
    `起卦偏好：${payload.castingPreference === 'auto' ? '自动' : '手动'}`,
    payload.inspirationMode ? `问题来源：${payload.inspirationMode === 'natal' ? '命书类问题灵感' : '单件问事类问题灵感'}` : '',
    payload.activeTool ? `用户当前选择的工具：${payload.activeTool}；当前问题未明确切换术式时优先使用，明确提到其他术式时必须切换` : '',
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
  '连续对话里，如果当前问题只补充“2032年呢”“明年呢”“那个月呢”等时间，且上一轮使用八字、紫微、八字紫微合参或西方占星，应沿用上一轮命盘工具，并把新时间换算成该工具的 target_year 或 target_date；不要改用梅花或其他术式。',
  '只有当前问题不改变盘面时间、范围和术式，只是在解释上一轮结论时，才调用 continue_reading。',
  '调用八字或八字紫微合参时必须设置 fortune_scope：普通本命主题用 natal；完整多年趋势用 full；问当前、某年份所在或明确干支的某步大运用 dayun，并按需填写 target_year 或 target_dayun_ganzhi；问今年、明年或明确年份的整体流年用 year，并把公历年份写入 target_year。',
  '调用紫微时必须设置 fortune_scope：普通命宫、宫位和先天主题用 origin；完整命书或多年运限用 full；只问当前或某年所处大限用 decadal；问今年、明年或明确年份的紫微流年用 yearly，并写入 target_year。',
  '调用西方占星时必须设置 fortune_scope：本命用 natal；完整推运用 full；年度行运、太阳返照、次限或太阳弧用 yearly；月运用 monthly；日运用 daily。按范围把目标写成 target_date：YYYY、YYYY-MM 或 YYYY-MM-DD。',
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

function isValidCalendarDate(value: string) {
  if (!/^(?:19|20|21)\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
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
  const currentDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date());
  const currentYear = Number(currentDate.slice(0, 4));
  const validYear = (value: unknown) => {
    const year = Number(value);
    return Number.isInteger(year) && year >= 1900 && year <= 2199 ? year : undefined;
  };
  const baziFortune = () => {
    const scope = ['natal', 'full', 'dayun', 'year'].includes(String(call.arguments.fortune_scope))
      ? String(call.arguments.fortune_scope)
      : 'natal';
    const targetYear = validYear(call.arguments.target_year);
    const targetGanZhi = typeof call.arguments.target_dayun_ganzhi === 'string'
      && /^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]$/.test(call.arguments.target_dayun_ganzhi)
      ? call.arguments.target_dayun_ganzhi
      : undefined;
    return {
      scope,
      ...((scope === 'year' || scope === 'dayun') && targetYear
        ? { year: targetYear }
        : {}),
      ...(scope === 'dayun' && targetGanZhi ? { ganZhi: targetGanZhi } : {}),
    };
  };
  const ziweiFortune = () => {
    const scope = ['origin', 'full', 'decadal', 'yearly'].includes(String(call.arguments.fortune_scope))
      ? String(call.arguments.fortune_scope)
      : 'origin';
    const targetYear = validYear(call.arguments.target_year);
    return {
      scope,
      ...((scope === 'yearly' || scope === 'decadal') ? { year: targetYear ?? currentYear } : {}),
    };
  };
  const mappedZiweiFortune = () => {
    const bazi = baziFortune();
    const scope = ({ natal: 'origin', full: 'full', dayun: 'decadal', year: 'yearly' } as const)[bazi.scope as 'natal' | 'full' | 'dayun' | 'year'];
    return {
      scope,
      ...((scope === 'yearly' || scope === 'decadal') ? { year: bazi.year ?? currentYear } : {}),
    };
  };
  const astrolabeFortune = () => {
    const scope = ['natal', 'full', 'yearly', 'monthly', 'daily'].includes(String(call.arguments.fortune_scope))
      ? String(call.arguments.fortune_scope) as 'natal' | 'full' | 'yearly' | 'monthly' | 'daily'
      : 'natal';
    const rawDate = typeof call.arguments.target_date === 'string' ? call.arguments.target_date.trim() : '';
    const validDate = scope === 'yearly' && /^(?:19|20|21)\d{2}$/.test(rawDate)
      ? rawDate
      : scope === 'monthly' && /^(?:19|20|21)\d{2}-(?:0[1-9]|1[0-2])$/.test(rawDate)
        ? rawDate
        : (scope === 'daily' || scope === 'full') && isValidCalendarDate(rawDate)
          ? rawDate
          : '';
    const fallbackDate = scope === 'yearly' ? currentDate.slice(0, 4)
      : scope === 'monthly' ? currentDate.slice(0, 7)
        : currentDate;
    return { scope, ...(scope === 'natal' ? {} : { date: validDate || fallbackDate }) };
  };
  if (call.name === 'continue_reading') return { mode: 'continue' };
  if (call.name === 'read_bazi') return { mode: 'chart', chartKind: 'bazi', baziFortune: baziFortune() };
  if (call.name === 'read_ziwei') return { mode: 'chart', chartKind: 'ziwei', ziweiFortune: ziweiFortune() };
  if (call.name === 'read_bazi_ziwei') return { mode: 'chart', chartKind: 'bazi-ziwei', baziFortune: baziFortune(), ziweiFortune: mappedZiweiFortune() };
  if (call.name === 'read_astrolabe') return { mode: 'chart', chartKind: 'astrolabe', astrolabeFortune: astrolabeFortune() };
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
    cast_xiaoliuren: 'xiaoliuren',
    cast_qimen: 'qimen',
    cast_liuren: 'liuren',
    cast_taiyi: 'taiyi',
    cast_jinkoujue: 'jinkoujue',
    select_almanac_date: 'almanac',
    draw_ssgw_sign: 'ssgw',
  } as const)[call.name as Exclude<AgentToolName, 'continue_reading' | 'read_bazi' | 'read_ziwei' | 'read_bazi_ziwei' | 'read_astrolabe' | 'read_qizheng' | 'calculate_wuyun_liuqi' | 'calculate_huangji_jingshi'>];
  const scope = call.name === 'cast_qimen' && ['hour', 'day', 'month', 'year'].includes(String(call.arguments.scope))
    ? String(call.arguments.scope)
    : undefined;
  return { mode: 'divination', divinationKind, ...(scope ? { qimenScope: scope } : {}) };
}

async function requestSelection(config: AiProviderConfig, userPrompt: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const result = await requestProviderJson(config, buildProviderBody(config, userPrompt), controller.signal);
    const call = extractToolCall(result, config.apiType);
    if (!call) throw new Error('model did not call an allowed tool');
    return selectionFromCall(call);
  } finally {
    clearTimeout(timeout);
  }
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
