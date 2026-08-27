import type {
  InstantBaziChartResult,
  InstantChartResponse,
  InstantChartType,
  InstantObserver,
  InstantTimeStandard,
  InstantZiweiChartResult,
} from 'mingyu-core/instant';
import type { AstrolabeData } from 'mingyu-core/types';
import type { QizhengResult } from 'mingyu-core/qizheng';

export type {
  InstantChartResponse,
  InstantChartType,
  InstantObserver,
  InstantTimeStandard,
} from 'mingyu-core/instant';

export const instantChartOptions: ReadonlyArray<{
  kind: InstantChartType;
  label: string;
  fullLabel: string;
  icon: string;
  description: string;
  requiresObserver: 'never' | 'true-solar' | 'always';
}> = [
  { kind: 'bazi', label: '八字', fullLabel: '八字即时盘', icon: '八', description: '以当前四柱看事件结构', requiresObserver: 'true-solar' },
  { kind: 'ziwei', label: '紫微', fullLabel: '紫微即时盘', icon: '紫', description: '以当前十二宫与星曜起紫占', requiresObserver: 'true-solar' },
  { kind: 'bazi-ziwei', label: '八字紫微合参', fullLabel: '八字紫微即时盘', icon: '合', description: '同一时刻两盘交叉判断', requiresObserver: 'true-solar' },
  { kind: 'astrolabe', label: '星盘', fullLabel: '星盘即时盘', icon: '星', description: '看当前星体、宫位与相位', requiresObserver: 'always' },
  { kind: 'qizheng', label: '七政四余', fullLabel: '七政四余即时盘', icon: '政', description: '看当前七政四余与二十八宿', requiresObserver: 'always' },
];

export function instantChartNeedsObserver(type: InstantChartType, standard: InstantTimeStandard) {
  const definition = instantChartOptions.find((item) => item.kind === type)!;
  return definition.requiresObserver === 'always'
    || (definition.requiresObserver === 'true-solar' && standard === 'true-solar');
}

export function buildInstantObserver(input: {
  locationName: string;
  longitude: string | number;
  latitude: string | number;
  timezone: string | number;
}): InstantObserver | undefined {
  const longitude = Number(input.longitude);
  const latitude = Number(input.latitude);
  const timezone = Number(input.timezone);
  if (!input.locationName.trim() || !Number.isFinite(longitude) || !Number.isFinite(latitude) || !Number.isFinite(timezone)) return undefined;
  return { locationName: input.locationName.trim(), longitude, latitude, timezone };
}

export async function runInstantChart(options: {
  type: InstantChartType;
  timeStandard: InstantTimeStandard;
  observer?: InstantObserver;
  now?: Date;
}) {
  const { calculateInstantChart } = await import('mingyu-core/instant');
  return calculateInstantChart({
    type: options.type,
    timeStandard: options.timeStandard,
    observer: options.observer,
    customDate: options.now ?? new Date(),
  });
}

function twoDigits(value: number) {
  return String(value).padStart(2, '0');
}

export function formatInstantWallClock(response: InstantChartResponse) {
  const time = response.wallClock;
  return `${time.year}年${time.month}月${time.day}日 ${twoDigits(time.hour)}:${twoDigits(time.minute)}`;
}

export function instantTimeBasisLabel(response: InstantChartResponse) {
  const standard = response.timeStandard === 'true-solar' ? '真太阳时' : '北京时间';
  const location = response.observer?.locationName ? ` · ${response.observer.locationName}` : '';
  return `${standard} · ${formatInstantWallClock(response)}${location}`;
}

const pillarKeys = ['year', 'month', 'day', 'hour'] as const;
const pillarLabels = ['年柱', '月柱', '日柱', '时柱'] as const;

function formatBazi(result: InstantBaziChartResult) {
  const pillars = pillarKeys.map((key, index) => {
    const hidden = result.hiddenStems[key].map((stem, stemIndex) => {
      const tenGod = result.hiddenTenGods[key][stemIndex];
      return `${stem}${tenGod ? `（${tenGod}）` : ''}`;
    }).join('、');
    return `${pillarLabels[index]}：${result.pillars[key].ganZhi}；天干十神：${key === 'day' ? '日元' : result.tenGods[key]}；藏干：${hidden || '无'}；纳音：${result.nayin[key]}`;
  });
  return [
    `农历：${result.lunarDate.year}年${result.lunarDate.monthName}${result.lunarDate.dayName}`,
    `日元：${result.dayMaster.gan}${result.dayMaster.element}（${result.dayMaster.yinYang}）`,
    ...pillars,
    `五行：出现${result.wuxingStrength.present.join('、') || '无'}；缺失${result.wuxingStrength.missing.join('、') || '无'}`,
  ].join('\n');
}

function starText(star: InstantZiweiChartResult['palaces'][number]['major_stars'][number]) {
  return `${star.name}${star.brightness ? `（${star.brightness}）` : ''}${star.birth_mutagen ? `化${star.birth_mutagen}` : ''}`;
}

function formatZiwei(result: InstantZiweiChartResult) {
  const palaces = result.palaces.map((palace) => {
    const stars = [...palace.major_stars, ...palace.minor_stars, ...palace.other_stars].map(starText).join('、');
    return `${palace.name}（${palace.heavenly_stem}${palace.earthly_branch}）${palace.is_body_palace ? '，身宫' : ''}：${stars || '无主星'}`;
  });
  const mutagens = result.activeScope.mutagen_map.map((item) => `${item.star}化${item.mutagen}${item.palace_name ? `入${item.palace_name}` : ''}`).join('；');
  return [
    `起盘：${result.basicInfo.solar_date}；农历：${result.basicInfo.lunar_date}`,
    `五行局：${result.basicInfo.five_elements_class}；命宫主星：${result.basicInfo.soul}；身宫主星：${result.basicInfo.body}`,
    mutagens ? `四化：${mutagens}` : '',
    ...palaces,
  ].filter(Boolean).join('\n');
}

function formatAstrolabe(result: Omit<AstrolabeData, 'birth'> & { birth: Omit<AstrolabeData['birth'], 'gender'> }) {
  const planets = result.planets.map((item) => `${item.label}${item.formatted}，第${item.house}宫${item.retrograde ? '，逆行' : ''}`);
  const aspects = result.aspects.slice(0, 16).map((item) => `${item.body1}${item.symbol}${item.body2}（${item.type}，容许度${item.orb.toFixed(2)}°）`);
  return [
    `观测地点：${result.birth.location}；时区：UTC${result.birth.timezone >= 0 ? '+' : ''}${result.birth.timezone}`,
    `主要格局：${result.summary.patterns.join('、') || '未见明显格局'}`,
    '星体位置：',
    ...planets,
    '主要相位：',
    ...(aspects.length ? aspects : ['未见容许度内的主要相位']),
  ].join('\n');
}

function formatQizheng(result: QizhengResult) {
  return result.prompt
    .replace('【七政四余 · 果老星宗】', '')
    .replace('【七政四余即时盘 · 果老星宗】', '')
    .replace('出生时间：', '起盘时间：')
    .trim();
}

export function instantChartDataText(response: InstantChartResponse) {
  if (response.type === 'bazi') return formatBazi(response.result as InstantBaziChartResult);
  if (response.type === 'ziwei') return formatZiwei(response.result as InstantZiweiChartResult);
  if (response.type === 'bazi-ziwei') {
    const result = response.result as { bazi: InstantBaziChartResult; ziwei: InstantZiweiChartResult };
    return `【八字盘】\n${formatBazi(result.bazi)}\n\n【紫微盘】\n${formatZiwei(result.ziwei)}`;
  }
  if (response.type === 'astrolabe') return formatAstrolabe(response.result as Parameters<typeof formatAstrolabe>[0]);
  return formatQizheng(response.result as QizhengResult);
}

export function instantChartSummary(response: InstantChartResponse) {
  if (response.type === 'bazi') {
    const result = response.result as InstantBaziChartResult;
    return `${pillarKeys.map((key) => result.pillars[key].ganZhi).join(' ')} · 日元${result.dayMaster.gan}${result.dayMaster.element}`;
  }
  if (response.type === 'ziwei') {
    const result = response.result as InstantZiweiChartResult;
    return `${result.basicInfo.five_elements_class} · ${result.activeScope.mutagen_map.map((item) => `${item.star}化${item.mutagen}`).join('、')}`;
  }
  if (response.type === 'bazi-ziwei') return '八字四柱与紫微十二宫同刻合参';
  if (response.type === 'astrolabe') {
    const result = response.result as Parameters<typeof formatAstrolabe>[0];
    const ascendant = result.angles.find((item) => item.name === 'Ascendant');
    return `上升 ${ascendant?.formatted || '—'} · ${result.planets.length} 个星体位置`;
  }
  const result = response.result as QizhengResult;
  return `命宫 ${result.mingGong + 1} · 命宫主星${result.mingZhu} · ${result.stars.length} 曜`;
}

export function buildInstantAiPrompt(response: InstantChartResponse, question: string) {
  const taskByType: Record<InstantChartType, string> = {
    bazi: '依据四柱、十神、藏干、纳音、空亡与五行结构判断。',
    ziwei: '依据十二宫、星曜、四化与三方四正判断。',
    'bazi-ziwei': '先分别依据八字与紫微判断，再综合共同指向与分歧。',
    astrolabe: '依据四轴、行星落座落宫与主要相位判断。',
    qizheng: '依据七政四余星体位置、二十八宿、十二宫与吊照关系判断。',
  };
  return [
    `【时间口径】\n${instantTimeBasisLabel(response)}`,
    `【盘面资料】\n${instantChartDataText(response)}`,
    `【问题】\n${question.trim() || `请整体解读这张${response.label}。`}`,
    `【任务】\n请把盘面作为当前时刻的事件盘，不要当作个人出生盘。${taskByType[response.type]}直接回答问题，并说明主要判断依据。`,
  ].join('\n\n');
}
