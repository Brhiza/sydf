import { describe, expect, it } from 'vitest';
import { selectLocalAgentTool } from './agent';

describe('0 基础 Agent 本地兜底', () => {
  it.each([
    ['请全面分析我未来十年的事业、财富和婚姻', { mode: 'chart', chartKind: 'bazi-ziwei', baziFortune: { scope: 'full' } }],
    ['未来三年的整体财运怎么样', { mode: 'chart', chartKind: 'bazi', baziFortune: { scope: 'full' } }],
    ['请看我 2028 年的整体事业流年', { mode: 'chart', chartKind: 'bazi', baziFortune: { scope: 'year', year: 2028 } }],
    ['这一步大运对我的事业有什么影响', { mode: 'chart', chartKind: 'bazi', baziFortune: { scope: 'dayun' } }],
    ['我今年能不能升职', { mode: 'divination', divinationKind: 'liuyao' }],
    ['下周谈判应该选择什么时间和方位', { mode: 'divination', divinationKind: 'qimen', qimenScope: 'hour' }],
    ['这场多人商业纠纷的来龙去脉是什么', { mode: 'divination', divinationKind: 'liuren' }],
    ['哪天适合签约', { mode: 'divination', divinationKind: 'almanac' }],
    ['请看 2028 年五运六气的司天在泉', { mode: 'divination', divinationKind: 'wuyun-liuqi', wuyunYear: 2028 }],
    ['请看 2028 年皇极经世值年卦', { mode: 'divination', divinationKind: 'huangji-jingshi', huangjiYear: 2028 }],
    ['请用七政四余看命宫宿度和罗睺', { mode: 'chart', chartKind: 'qizheng' }],
    ['请用紫微斗数看我的官禄宫', { mode: 'chart', chartKind: 'ziwei' }],
  ] as const)('%s', (question, expected) => {
    expect(selectLocalAgentTool(question)).toEqual(expected);
  });

  it('识别否定表达，不会因为出现抽签二字而进入灵签', () => {
    expect(selectLocalAgentTool('我不想抽签，只想判断这件事能不能成功')).toEqual({ mode: 'divination', divinationKind: 'liuyao' });
  });
});
