import { describe, expect, it } from 'vitest';
import { baziCalculator } from 'mingyu-core/bazi';
import { generateMeihua } from 'mingyu-core/divination/meihua';
import { buildAiSystemPrompt, buildExternalAiPrompt } from './aiPrompt';
import { buildChartReadingPrompt } from './chartPrompt';
import { buildDivinationReadingPrompt } from './divination';

describe('AI 降级提示词', () => {
  it('保留问题、解答风格、案例和专业盘面文本', () => {
    const prompt = buildExternalAiPrompt({
      mode: 'chart',
      question: '请分析未来三年的事业重点。',
      method: '八字',
      profile: { label: '时月', gender: 'female', date: '2024-11-02' },
      reading: { summary: '庚日主', data: { ignored: true }, prompt: '【八字盘面】甲辰 甲戌 庚午 甲申' },
      conversation: [{ role: 'user', content: '先看整体格局。' }, { role: 'assistant', content: '好的。' }],
      preferences: { answerPreference: 'professional', displayLevel: 'master' },
    });

    expect(prompt).toContain('请分析未来三年的事业重点。');
    expect(prompt).toContain('【八字盘面】\n甲辰 甲戌 庚午 甲申');
    expect(prompt).toContain('采用“专业人士”解读框架');
    expect(prompt).toContain('问题界定—核心结论—关键结构');
    expect(prompt).toContain('读者熟悉术数');
    expect(prompt).toContain('此前对话');
    expect(prompt).toContain('时月 · 女 · 公历2024-11-02');
    expect(prompt).not.toContain('"label"');
    expect(prompt).not.toContain('专业排盘文本');
    expect(prompt).not.toContain('取证顺序');
    expect(prompt).not.toContain('证据链');
    expect(prompt).not.toContain('显示层级');
    expect(prompt).not.toContain('回答偏好');
    expect(prompt).not.toContain('内部分析步骤');
    expect(prompt).not.toContain('工程字段');
  });

  it('三种解答偏好使用不同的真实解读框架', () => {
    const payload = { mode: 'divination' as const, method: '六爻', question: '这次合作能成吗？' };
    const chat = buildAiSystemPrompt({ ...payload, preferences: { answerPreference: 'chat', displayLevel: 'beginner' } });
    const fortuneMaster = buildAiSystemPrompt({ ...payload, preferences: { answerPreference: 'fortune-master', displayLevel: 'beginner' } });
    const professional = buildAiSystemPrompt({ ...payload, preferences: { answerPreference: 'professional', displayLevel: 'master' } });

    expect(chat).toContain('采用“日常聊天”解读框架');
    expect(chat).toContain('两三个关键盘面信号');
    expect(chat).toContain('不使用多级标题');
    expect(fortuneMaster).toContain('采用“算命大师”解读框架');
    expect(fortuneMaster).toContain('先断主旨—再讲盘理—再看变化与时机—最后给趋避建议');
    expect(fortuneMaster).toContain('三至六个最能定局的传统信息');
    expect(professional).toContain('采用“专业人士”解读框架');
    expect(professional).toContain('制约及反向信号');
    expect(professional).toContain('多体系结论不一致时分别说明观察层面与权重');
  });

  it('解读协议要求结论可理解、依据可追溯且建议不空泛', () => {
    const prompt = buildAiSystemPrompt({
      mode: 'chart',
      method: '八字',
      question: '今年适合换工作吗？',
      preferences: { answerPreference: 'fortune-master', displayLevel: 'beginner' },
    });

    expect(prompt).toContain('第一部分必须让用户直接看懂结论');
    expect(prompt).toContain('盘面线索如何影响现实判断');
    expect(prompt).toContain('说明主导趋势、制约因素和各自成立条件');
    expect(prompt).toContain('没有运限或应期资料就明确说暂时不能细化');
    expect(prompt).toContain('建议必须与前文判断一一对应');
    expect(prompt).toContain('不输出未闭合的 Markdown 标记');
  });

  it('继续追问时只承接必要上下文，不重复整份首次解读', () => {
    const prompt = buildAiSystemPrompt({
      mode: 'chart',
      method: '紫微斗数',
      question: '那具体要等到什么时候？',
      conversation: [
        { role: 'user', content: '今年适合换工作吗？' },
        { role: 'assistant', content: '下半年机会更集中。' },
      ],
    });

    expect(prompt).toContain('这是继续追问');
    expect(prompt).toContain('只回顾理解当前问题所必需的信息');
    expect(prompt).toContain('不重新输出整份首次解读');
  });

  it('不会把 AI 接口配置或密钥复制到提示词', () => {
    const prompt = buildExternalAiPrompt({
      mode: 'divination',
      question: '这件事接下来如何推进？',
      method: '六爻',
      reading: { summary: '本卦乾为天', data: { originalName: '乾为天' } },
      aiConfig: { apiKey: 'secret-key-that-must-not-leak', model: 'private-model' },
    } as Parameters<typeof buildExternalAiPrompt>[0] & { aiConfig: unknown });

    expect(prompt).not.toContain('secret-key-that-must-not-leak');
    expect(prompt).not.toContain('private-model');
    expect(prompt).toContain('本卦乾为天');
    expect(prompt).not.toContain('"originalName"');
    expect(prompt).not.toContain('结构化盘面资料');
  });

  it('清理底层提示词中的重复任务和工程审计内容', () => {
    const prompt = buildExternalAiPrompt({
      mode: 'divination',
      question: '这份合作该怎么推进？',
      method: '六爻',
      reading: {
        summary: '主卦乾为天',
        prompt: [
          '【传统依据】',
          '这里是底层传统来源。',
          '【当前时间】',
          '2026-08-08T12:00:00.000Z',
          '【占卜资料】',
          '主卦乾为天，世爻在五爻。',
          '计算链：输入 → 排盘 → 证据汇总。',
          '计算链概览：输入 → 几何计算 → 汇总。',
          '反证与应期边界：这里只是内部限制说明。',
          '解释限制：不得把统计数量换算成概率。',
          '【主证】世爻得月建｜来源：内部规则表｜标签：主证、世爻',
          '【时月出生时间校正】',
          '这里是重复的真太阳时计算过程。',
          '【合参原则】',
          '这里是与系统提示词重复的方法说明。',
          '【问题】',
          '重复的问题。',
          '【任务】',
          '重复的底层任务。',
        ].join('\n'),
      },
    });

    expect(prompt).toContain('主卦乾为天，世爻在五爻。');
    expect(prompt).toContain('世爻得月建');
    expect(prompt).not.toContain('【关键依据】');
    expect(prompt).not.toContain('底层传统来源');
    expect(prompt).not.toContain('2026-08-08T12:00:00.000Z');
    expect(prompt).not.toContain('输入 → 排盘');
    expect(prompt).not.toContain('几何计算');
    expect(prompt).not.toContain('内部限制说明');
    expect(prompt).not.toContain('换算成概率');
    expect(prompt).not.toContain('内部规则表');
    expect(prompt).not.toContain('真太阳时计算过程');
    expect(prompt).not.toContain('重复的方法说明');
    expect(prompt).not.toContain('重复的问题');
    expect(prompt).not.toContain('重复的底层任务');
  });

  it('只有结构化对象时也不会复制原始 JSON', () => {
    const prompt = buildExternalAiPrompt({
      mode: 'divination',
      question: '这件事该怎么处理？',
      method: '六爻',
      reading: { data: { schemaVersion: '1.0', calculationChain: ['internal'], originalName: '乾为天' } },
    });

    expect(prompt).not.toContain('schemaVersion');
    expect(prompt).not.toContain('calculationChain');
    expect(prompt).not.toContain('originalName');
    expect(prompt).not.toContain('{');
  });

  it('为常用占法保留必要方法重点，但不暴露内部分析模板', () => {
    const prompt = buildAiSystemPrompt({ mode: 'divination', method: '六爻', question: '近期事业如何？' });
    expect(prompt).toContain('先按问题选取用神');
    expect(prompt).toContain('世应、月建日辰');
    expect(prompt).not.toContain('证据链');
    expect(prompt).not.toContain('主证');
    expect(prompt).not.toContain('反证');
  });

  it('五运六气先保留传统依据，再转成普通人能理解的年度节律', () => {
    const prompt = buildAiSystemPrompt({ mode: 'divination', method: '五运六气', question: '请看 2028 年的年度气候节律。' });

    expect(prompt).toContain('中运太过或不及');
    expect(prompt).toContain('五步主客运和六步主客气');
    expect(prompt).toContain('普通人能理解');
    expect(prompt).toContain('与用户所在地、实际天气和现实资料分层说明');
  });

  it('清除底层资料与站点设定中混入的免责声明', () => {
    const externalPrompt = buildExternalAiPrompt({
      mode: 'divination',
      question: '这件事接下来如何发展？',
      method: '六爻',
      reading: {
        prompt: [
          '【占卜资料】',
          '主卦乾为天；本结果仅供娱乐，不构成任何形式建议。',
          '世爻得月建；盘面不能替代诊断和治疗。',
          '【免责声明】',
          '请勿据此作出重要决定。',
          '【变化】',
          '动爻在五爻。',
        ].join('\n'),
      },
    });
    const systemPrompt = buildAiSystemPrompt(
      { mode: 'divination', method: '六爻' },
      '回答要先给结论。\n内容仅供参考，不替代专业判断。',
    );

    expect(externalPrompt).toContain('主卦乾为天');
    expect(externalPrompt).toContain('世爻得月建');
    expect(externalPrompt).toContain('动爻在五爻');
    expect(systemPrompt).toContain('站点补充设定：回答要先给结论。');
    for (const prompt of [externalPrompt, systemPrompt]) {
      expect(prompt).not.toContain('免责声明');
      expect(prompt).not.toContain('仅供娱乐');
      expect(prompt).not.toContain('仅供参考');
      expect(prompt).not.toContain('不构成任何形式建议');
      expect(prompt).not.toContain('不能替代专业判断');
      expect(prompt).not.toContain('请勿据此');
    }
  });

  it('占卜资料只保留可用于解读的盘面信息', () => {
    const result = generateMeihua(new Date('2026-08-08T12:00:00+08:00'), { method: 'number', number: 8 });
    const prompt = buildDivinationReadingPrompt('meihua', result);
    expect(prompt).toContain('核心结构：');
    expect(prompt).toContain('体用关系：');
    expect(prompt).not.toContain('结构明细：');
    expect(prompt).not.toContain('卦辞分类：');
    expect(prompt).not.toContain('证据链');
    expect(prompt).not.toContain('证据：');
    expect(prompt).not.toContain('计算链');
    expect(prompt).not.toContain('应期资料：');
    expect(prompt).not.toContain('起卦数字8可作卦数旁证');
  });

  it('八字紫微合参保留两套体系的核心关系，不输出取证模板', () => {
    const prompt = buildAiSystemPrompt({
      mode: 'chart',
      question: '综合看看事业方向。',
      method: '八字紫微合参',
    });

    expect(prompt).toContain('先在八字中综合');
    expect(prompt).toContain('再在紫微中综合');
    expect(prompt).toContain('共同指向的主题');
    expect(prompt).not.toContain('取证顺序');
    expect(prompt).not.toContain('证据链');
  });

  it('八字提示词只保留可用于解读的核心盘面信息', () => {
    const chart = baziCalculator.calculateBazi({
      year: 1990,
      month: 6,
      day: 15,
      timeIndex: 6,
      birthHour: 12,
      birthMinute: 0,
      gender: 'male',
      isLunar: false,
    });
    const reading = buildChartReadingPrompt('bazi', chart, {
      question: '请分析事业方向。',
      currentTime: new Date('2026-08-09T12:00:00+08:00'),
    });
    const prompt = buildExternalAiPrompt({
      mode: 'chart',
      method: '八字',
      question: '请分析事业方向。',
      reading: { summary: '', data: chart, prompt: reading },
    });

    expect(prompt).toContain('旺衰: 身弱');
    expect(prompt).toContain('格局: 正官格');
    expect(prompt).toContain('年柱：庚午（劫财）');
    expect(prompt).not.toContain('【传统依据】');
    expect(prompt).not.toContain('【当前时间】');
    expect(prompt).not.toContain('旺衰依据');
    expect(prompt).not.toContain('格局依据');
    expect(prompt).not.toContain('取用脉络');
    expect(prompt).not.toContain('日主十二运');
    expect(prompt).not.toContain('固定取证方法');
  });
});
