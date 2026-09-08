import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { computed, ref, watch } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { buildAiInterpretationRequestBody } from './ai';
import { historyReadingProfile, snapshotReadingProfile } from './readingProfile';
import { buildAiUserPrompt, buildExternalAiPrompt } from './aiPrompt';

const source = readFileSync(new URL('../App.vue', import.meta.url), 'utf8').split('<script setup lang="ts">')[1]!.split('</script>')[0]!;
const ast = ts.createSourceFile('App.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const names = ['selectCase', 'leaveChat', 'clearTransientAiState', 'buildAiRequest', 'requestInterpretation', 'retryLastInterpretation', 'currentConversationContext', 'continueCurrentReading', 'openRecord'];
const statements = ast.statements.filter((node) => ts.isFunctionDeclaration(node) && names.includes(node.name?.text || '')
  || ts.isExpressionStatement(node) && node.getText(ast).startsWith('watch(() => JSON.stringify(activeCase.value)'));
const js = ts.transpileModule(statements.map((node) => node.getText(ast)).join('\n'), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;

function profile(id: string) {
  return { id, label: id, name: id, gender: 'male' as const, date: '1990-01-01', dateType: 'solar' as const, isLeapMonth: false, time: '12:00', locationName: '北京', timeBasis: 'clock' as const };
}
function harness() {
  const env: Record<string, any> = { ref, watch, snapshotReadingProfile, historyReadingProfile, chatSessionId: 1, aiRequestId: 0, chartRequestId: 0, fortuneRequestId: 0, homeFortuneRequestId: 0, agentAbortController: null };
  for (const key of ['selectedCaseId', 'caseSwitcherSearch', 'formError', 'chartError', 'question', 'aiError', 'aiAnswer', 'basicAiFallbackQuestion', 'selectedInspirationPrompt']) env[key] = ref('');
  for (const key of ['showCaseSwitcher', 'showToolPicker', 'isReading', 'chartLoading', 'isInterpreting', 'showHistory', 'fortuneLoading']) env[key] = ref(false);
  for (const key of ['lastAiRequest', 'lastAiHistoryRecordId', 'currentResult', 'currentRecord', 'chartResult', 'chartRecord', 'oracleResult', 'agentBaziFortune', 'agentZiweiFortune', 'agentAstrolabeFortune', 'forcedBasicAgentSelection', 'selectedLegacyHistory', 'compatibilityHistoryRecord', 'dailyFortune', 'homeFortunePreview']) env[key] = ref(null);
  env.cases = ref([profile('x'), profile('y'), profile('z')]);
  env.selectedCaseId.value = 'y';
  env.activeCase = computed(() => env.cases.value.find((item: any) => item.id === env.selectedCaseId.value) || null);
  env.homeMode = ref('divination'); env.selectedKind = ref('liuren'); env.homeChartKind = ref('bazi'); env.homeState = ref('chat'); env.activeView = ref('tools');
  env.chatMessages = ref([{ kind: 'text', role: 'assistant', content: 'y 的旧回答' }]);
  env.activeAiChannel = ref({}); env.activeAiRequestConfig = ref({});
  env.appPreferences = { answerPreference: 'chat', displayLevel: 'beginner' };
  env.kindMeta = { liuren: { label: '大六壬' }, qimen: { label: '奇门遁甲' }, liuyao: { label: '六爻' } };
  for (const key of ['persistSelectedCaseId', 'cancelChatSelection', 'applyDefaultHomeTool', 'closeManualReading', 'closeReadingModal', 'closeTarotModal', 'closeInstantModal', 'closeBasicAiFallback', 'showToast', 'ensureAlmanacRuntime', 'ensureBaziRuntime']) env[key] = vi.fn();
  env.channelToAiConfig = () => ({}); env.getPromptSchoolMethod = () => 'liuren'; env.resolvePromptSchoolIds = () => [];
  env.buildDivinationReadingPrompt = async () => '真实请求构造的盘面提示词'; env.formatReadingSummary = () => '盘面摘要';
  env.runBackgroundInterpretation = vi.fn(async () => ({ content: '新回答' }));
  env.isLegacyHistoryRecord = () => false; env.isChartReading = () => false; env.restoredHistoryInterpretationError = () => '';
  env.goView = (view: string) => { if (env.activeView.value !== view) env.chatSessionId++; env.activeView.value = view; };
  const api = new Function('env', `with (env) { ${js}; return { ${names.join(', ')} }; }`)(env);
  return { env, api };
}

describe('全局案例与实际首页请求链路', () => {
  it.each(['liuren', 'qimen', 'liuyao'])('%s 新解读只携带选中案例，切换后清除旧上下文', async (kind) => {
    const { env, api } = harness();
    env.lastAiRequest.value = await api.buildAiRequest('divination', '旧问题', kind, {});
    api.selectCase('x');
    expect(env.chatMessages.value).toEqual([]);
    expect(env.lastAiRequest.value).toBeNull();
    expect(await api.continueCurrentReading('继续')).toBe(false);
    const request = await api.buildAiRequest('divination', '新问题', kind, {});
    expect(request.profile.name).toBe('x');
    const body = buildAiInterpretationRequestBody(request);
    expect(body.profile?.name).toBe('x');
    expect(buildAiUserPrompt(body)).toContain('x');
    expect(buildExternalAiPrompt(request)).toContain('x');
    expect(buildExternalAiPrompt(request)).not.toContain('y 的旧回答');
  });
  it('连接测试不附带人物资料', async () => {
    const { api } = harness();
    expect((await api.buildAiRequest('ask', '连接成功')).profile).toBeUndefined();
  });
  it('同一案例继续追问保留盘面，重选同一案例不清空', async () => {
    const { env, api } = harness();
    env.lastAiRequest.value = await api.buildAiRequest('divination', '原问题', 'liuren', { value: 1 });
    api.selectCase('y');
    expect(await api.continueCurrentReading('继续')).toBe(true);
    expect(env.runBackgroundInterpretation.mock.calls[0][0].reading.data).toEqual({ value: 1 });
    expect(env.runBackgroundInterpretation.mock.calls[0][0].profile.name).toBe('y');
  });
  it('切换期间旧响应和尚未发出的旧请求均不能污染新会话', async () => {
    const { env, api } = harness();
    let finish!: (value: any) => void;
    env.runBackgroundInterpretation.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const oldSession = env.chatSessionId;
    const payload = await api.buildAiRequest('divination', '旧问题', 'liuren', {});
    const pending = api.requestInterpretation(payload, true, oldSession);
    api.selectCase('x');
    finish({ content: 'y 的迟到回答' });
    await pending;
    await api.requestInterpretation(payload, true, oldSession);
    api.retryLastInterpretation();
    expect(env.runBackgroundInterpretation).toHaveBeenCalledTimes(1);
    expect(env.aiAnswer.value).toBe('');
    expect(env.lastAiRequest.value).toBeNull();
    expect(env.chatMessages.value).toEqual([]);
  });
  it('编辑或删除当前案例立即使旧解读失效，不使用案例时不回退草稿', async () => {
    const { env, api } = harness();
    env.lastAiRequest.value = await api.buildAiRequest('divination', '问题', 'liuren', {});
    env.cases.value[1].date = '2000-01-01';
    expect(env.lastAiRequest.value).toBeNull();
    env.lastAiRequest.value = await api.buildAiRequest('divination', '问题', 'liuren', {});
    env.cases.value = env.cases.value.filter((item: any) => item.id !== 'y');
    expect(env.lastAiRequest.value).toBeNull();
    expect((await api.buildAiRequest('divination', '问题', 'liuren', {})).profile).toBeUndefined();
  });
  it('恢复历史使用记录快照，包括已删除案例，且可从其他页面进入', async () => {
    const { env, api } = harness();
    env.activeView.value = 'cases';
    const saved = snapshotReadingProfile(profile('z'));
    env.cases.value = env.cases.value.filter((item: any) => item.id !== 'z');
    await api.openRecord({ id: 'record-z', caseId: 'z', kind: 'liuren', question: '历史问题', result: {}, profile: saved });
    expect(env.selectedCaseId.value).toBe('');
    expect(env.lastAiRequest.value.profile.name).toBe('z');
    expect(env.lastAiHistoryRecordId.value).toBe('record-z');
  });
  it('旧历史缺失资料不补用当前人物，快照与案例编辑互不影响', async () => {
    const { env, api } = harness();
    const original = profile('y'); const saved = snapshotReadingProfile(original)!;
    original.name = '改名'; expect(saved.name).toBe('y');
    await api.openRecord({ id: 'legacy', kind: 'liuren', question: '旧问题', result: {} });
    expect(env.lastAiRequest.value.profile).toBeUndefined();
    expect(historyReadingProfile({ context: { label: '旧人物', date: '1990-01-01', time: '', locationName: '' } } as any)).toEqual({ label: '旧人物', date: '1990-01-01', time: '', locationName: '' });
  });
});
