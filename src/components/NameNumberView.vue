<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { ArrowRight, BookOpenText, ChevronDown, Coins, Hash, ScrollText, Search, Sparkles, UserRound } from 'lucide-vue-next';
import { calculateNameNumber, nameNumberTools, type NameNumberInput, type NameNumberHistoryRecord } from '../lib/nameNumber';
import { requestAiInterpretation, type AiCustomConfig, type AiPreferences, type AiInterpretationRequest } from '../lib/ai';
import type { SelectableCaseProfile } from '../lib/caseSelection';
import { snapshotReadingProfile } from '../lib/readingProfile';
import ChatMarkdown from './ChatMarkdown.vue';
import AiPromptFallback from './AiPromptFallback.vue';
import { UiActionBar, UiButton, UiNotice, UiPageShell, UiReadingGrid, UiReadingHero, UiReadingLead, UiReadingRows, UiReadingSection, UiSegmentedControl, UiSelect, UiSignPoem, UiTextField, UiWorkspaceSurface } from './ui';

const props = defineProps<{ profile: SelectableCaseProfile | null; preferences: AiPreferences; aiConfig: AiCustomConfig; oracle?: 'zhuge' | 'kongming'; historyRecord?: NameNumberHistoryRecord | null }>();
const emit = defineEmits<{ save: [record: NameNumberHistoryRecord] }>();
const form = reactive<NameNumberInput>({ tool: 'naming', text: '', surname: '', surnameLength: 1, givenNameLength: 2, gender: '通用', preferredCharacters: '', forbiddenCharacters: '', generationCharacter: '', generationPosition: 'first', purpose: 'general', pattern: '', strokes: '', wuxing: '', question: '' });
form.tool = props.oracle || 'naming';
const availableTools = nameNumberTools.filter(tool => tool.value !== 'zhuge' && tool.value !== 'kongming');
const useBirth = ref(true);
const loading = ref(false);
const interpreting = ref(false);
const error = ref('');
const aiError = ref('');
const followup = ref('');
let generation = 0;
let controller: AbortController | null = null;
const current = ref<NameNumberHistoryRecord | null>(null);
const request = ref<AiInterpretationRequest | null>(null);
const naming = computed(() => form.tool === 'naming' || form.tool === 'name');
const toolTitle = computed(() => nameNumberTools.find(tool => tool.value === form.tool)!.label);
const toolDescription = computed(() => ({ naming: '以姓氏、字义与用字偏好，寻找合适的名字', name: '字义音韵 · 三才五格', characters: '字义、笔画与康熙字典原文', search: '按拼音、笔画与五行选字', number: '号码取数 · 数字组合', zhuge: '三字取数 · 三百八十四签', kongming: '五次阴阳 · 三十二卦' })[form.tool]);
const toolIcon = computed(() => props.oracle === 'kongming' ? Coins : props.oracle === 'zhuge' ? ScrollText : form.tool === 'number' ? Hash : form.tool === 'search' || form.tool === 'characters' ? Search : BookOpenText);
const actionLabel = computed(() => ({ naming: '生成姓名', name: '解析姓名', characters: '查询汉字', search: '筛选汉字', number: '解析号码', zhuge: '取数求签', kongming: '起卦' })[form.tool]);
const castingMode = computed({ get: () => form.pattern ? 'manual' : 'auto', set: (value: string) => { form.pattern = value === 'manual' ? '11111' : ''; } });
const resultSections = computed(() => current.value?.result.sections.filter(section => !props.oracle || section.title !== '签诗') || []);
const signPoem = computed(() => current.value?.result.sections.find(section => section.title === '签诗')?.text || '');
const oracleRows = computed(() => resultSections.value.map((section,index) => ({ key: index, marker: section.title.slice(0,1), title: section.title, detail: section.text, tone: 'neutral' as const })));
function togglePolarity(index: number) {
  form.pattern = [...form.pattern].map((value, position) => position === index ? value === '1' ? '0' : '1' : value).join('');
}
function candidateSummary(text: string) {
  return text.split('\n').filter(line => line.startsWith('三才：') || line.startsWith('天格：')).join(' · ');
}
function characterText(text: string) { return text.split('\n\n康熙字典原文\n')[0]; }
function characterReference(text: string) { return text.split('\n\n康熙字典原文\n')[1]; }
function invalidate() {
  generation++; controller?.abort(); controller = null;
  loading.value = false; interpreting.value = false; error.value = ''; aiError.value = '';
  current.value = null; request.value = null; followup.value = '';
}
watch(() => JSON.stringify(props.profile), () => {
  invalidate();
  form.text = form.tool === 'name' ? props.profile?.name || '' : '';
  form.surname = '';
  form.gender = props.profile?.gender === 'male' ? '男' : props.profile?.gender === 'female' ? '女' : '通用';
}, { immediate: true, flush: 'sync' });
watch(() => form.tool, () => { form.text = form.tool === 'name' ? props.profile?.name || '' : ''; });
watch([form, useBirth], invalidate, { deep: true, flush: 'sync' });
onBeforeUnmount(() => { generation++; controller?.abort(); });
function aiRequest(record: NameNumberHistoryRecord): AiInterpretationRequest {
  return { mode: 'ask', method: nameNumberTools.find((tool) => tool.value === record.tool)!.label,
    question: record.question || `请解读${record.result.title}。`,
    ...(record.profile ? { profile: record.profile } : {}),
    reading: { summary: record.result.summary, data: {}, prompt: record.result.prompt },
    preferences: props.preferences, aiConfig: props.aiConfig };
}
async function calculate() {
  invalidate(); const ticket = generation;
  const input = { ...form }; const profile = props.profile ? { ...props.profile } : null;
  loading.value = true;
  try {
    const result = await calculateNameNumber(input, useBirth.value ? profile : null);
    if (ticket !== generation) return;
    const record: NameNumberHistoryRecord = { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, kind: 'name-number', methodLabel: toolTitle.value, context: { label: profile?.label }, caseId: profile?.id || null, caseLabel: profile?.label, input, useBirth: useBirth.value, tool: input.tool, question: input.question, profile: snapshotReadingProfile(naming.value && !useBirth.value ? null : profile), result, createdAt: Date.now(), interpretation: '' };
    current.value = { ...record }; request.value = aiRequest(record);
    emit('save', record);
  } catch (cause) { if (ticket === generation) error.value = cause instanceof Error ? cause.message : '计算未完成，请稍后重试。'; }
  finally { if (ticket === generation) loading.value = false; }
}
async function interpret() {
  const record = current.value;
  if (!record || interpreting.value) return;
  const ticket = generation; controller?.abort(); controller = new AbortController();
  const payload = aiRequest(record);
  if (followup.value.trim()) {
    payload.question = followup.value.trim();
    if (record.conversation?.length) payload.conversation = record.conversation;
  }
  request.value = payload; interpreting.value = true; aiError.value = '';
  try {
    const response = await requestAiInterpretation(payload, controller.signal);
    if (ticket !== generation) return;
    record.interpretation = response.content;
    record.interpretationError = undefined;
    record.conversation = [...(payload.conversation || []), { role: 'user', content: payload.question }, { role: 'assistant', content: response.content }].slice(-20) as AiInterpretationRequest['conversation'];
    followup.value = '';
    emit('save', { ...record });
  } catch (cause) {
    if (ticket === generation) {
      aiError.value = cause instanceof Error ? cause.message : 'AI 解读未完成，请稍后重试。';
      record.interpretationError = aiError.value;
      emit('save', { ...record });
    }
  }
  finally { if (ticket === generation) interpreting.value = false; }
}
async function restore(record: NameNumberHistoryRecord) {
  invalidate();
  form.tool = record.tool;
  await nextTick();
  if (record.input) Object.assign(form, record.input);
  useBirth.value = record.useBirth ?? true;
  current.value = { ...record }; request.value = aiRequest(record);
  aiError.value = record.interpretation ? '' : record.interpretationError || '';
}
watch(() => props.historyRecord, record => { if (record) void restore(record); }, { immediate: true });
</script>

<template>
  <UiPageShell class="screen name-number-page" :class="{ 'is-oracle': oracle }">
    <UiSegmentedControl v-if="!oracle" v-model="form.tool" :items="availableTools" label="姓名数字工具" class="name-number-tabs" variant="underline" wrap />

    <UiWorkspaceSurface class="name-number-entry" padding="standard">
      <header class="name-number-intro">
        <span class="name-number-emblem"><component :is="toolIcon" :size="26" :stroke-width="1.5" /></span>
        <div><h2>{{ toolTitle }}</h2><p>{{ toolDescription }}</p></div>
      </header>
      <form class="name-number-form" @submit.prevent="calculate">
        <template v-if="form.tool === 'naming'">
          <UiTextField v-model="form.surname" label="姓氏" :maxlength="2" required placeholder="输入单姓或复姓" />
          <UiSelect v-model.number="form.givenNameLength" label="名字字数" :options="[{value:1,label:'单字名'},{value:2,label:'双字名'}]" />
          <UiSelect v-model="form.gender" label="用字风格" :options="[{value:'通用',label:'通用'},{value:'男',label:'男孩'},{value:'女',label:'女孩'}]" />
          <details class="name-number-options wide">
            <summary>用字偏好<span>选填<ChevronDown :size="14" /></span></summary>
            <div class="name-number-option-fields">
              <UiTextField v-model="form.preferredCharacters" label="偏好字" placeholder="希望优先使用的字" />
              <UiTextField v-model="form.forbiddenCharacters" label="避用字" placeholder="不希望使用的字" />
              <UiTextField v-model="form.generationCharacter" label="辈分字" :maxlength="1" placeholder="家族辈分用字" />
              <UiSelect v-if="form.generationCharacter" v-model="form.generationPosition" label="辈分字位置" :options="[{value:'first',label:'名字首字'},{value:'second',label:'名字末字'}]" />
            </div>
          </details>
        </template>
        <template v-else-if="form.tool === 'name'">
          <UiTextField v-model="form.text" label="姓名" required placeholder="输入完整姓名" />
          <UiSelect v-model.number="form.surnameLength" label="姓氏字数" :options="[{value:1,label:'单姓'},{value:2,label:'复姓'}]" />
        </template>
        <UiTextField v-else-if="form.tool === 'characters'" v-model="form.text" class="wide" label="汉字" required :maxlength="40" placeholder="输入 1 至 20 个汉字" />
        <template v-else-if="form.tool === 'search'">
          <UiTextField v-model="form.text" label="拼音" placeholder="不限" />
          <UiTextField v-model="form.strokes" label="康熙笔画" inputmode="numeric" placeholder="不限" />
          <UiSelect v-model="form.wuxing" label="五行" :options="[{value:'',label:'不限'},...['金','木','水','火','土'].map(value=>({value,label:value}))]" />
        </template>
        <template v-else-if="form.tool === 'number'">
          <UiTextField v-model="form.text" label="号码" required :maxlength="64" placeholder="输入数字或字母编号" />
          <UiSelect v-model="form.purpose" label="用途" :options="[{value:'general',label:'通用编号'},{value:'phone',label:'手机号'},{value:'plate',label:'车牌号'}]" />
        </template>
        <UiTextField v-else-if="form.tool === 'zhuge'" v-model="form.text" class="wide zhuge-characters" label="三个汉字" required :maxlength="6" placeholder="写下心中想到的三个字" />
        <section v-else class="kongming-casting wide">
          <UiSegmentedControl v-model="castingMode" :items="[{value:'auto',label:'随机起卦'},{value:'manual',label:'手动录入'}]" label="起卦方式" equal />
          <div v-if="castingMode === 'manual'" class="kongming-polarities">
            <button v-for="(value,index) in form.pattern" :key="index" type="button" :aria-label="`第 ${index + 1} 次：${value === '1' ? '阳' : '阴'}，点击切换`" @click="togglePolarity(index)"><small>{{ ['一','二','三','四','五'][index] }}</small><span :class="{ 'is-yin': value === '0' }"></span><strong>{{ value === '1' ? '阳' : '阴' }}</strong></button>
          </div>
          <p v-else class="kongming-hint">心中默念所问之事，起卦后查看五次阴阳与卦辞。</p>
        </section>
        <label v-if="naming && profile" class="name-number-profile wide">
          <UserRound :size="18" /><span><strong>结合 {{ profile.label }} 的出生资料</strong><small>{{ profile.date }} · {{ profile.time }}</small></span><input v-model="useBirth" type="checkbox" />
        </label>
        <UiTextField v-model="form.question" class="wide" label="所问之事" multiline :rows="2" :maxlength="10000" placeholder="写下想了解的事（选填）" />
        <UiNotice v-if="error" class="wide" tone="error">{{ error }}</UiNotice>
        <UiActionBar class="wide" :align="oracle ? 'center' : 'end'"><UiButton type="submit" :loading="loading"><component :is="oracle ? Sparkles : form.tool === 'search' || form.tool === 'characters' ? Search : ArrowRight" :size="16" />{{ actionLabel }}</UiButton></UiActionBar>
      </form>
    </UiWorkspaceSurface>


    <UiWorkspaceSurface v-if="current" class="name-number-result" padding="standard">
      <UiReadingLead :kicker="toolTitle" :title="current.result.title" :meta="current.caseLabel || current.profile?.label || ''" :summary="oracle ? undefined : current.result.summary" />
      <p v-if="current.question" class="name-number-asked">{{ current.question }}</p>
      <UiReadingHero v-if="oracle" :has-media="false">
        <template #context><UiSignPoem :poem="signPoem" /></template>
        <template #summary><UiReadingRows :items="oracleRows" marker-style="soft" /></template>
      </UiReadingHero>
      <div v-else-if="current.tool === 'naming'" class="name-number-candidates">
        <details v-for="section in resultSections" :key="section.title" class="name-number-candidate">
          <summary><span><strong>{{ section.title }}</strong><small>{{ candidateSummary(section.text) }}</small></span><ChevronDown :size="16" /></summary><p>{{ section.text }}</p>
        </details>
      </div>
      <UiReadingGrid v-else class="name-number-sections" :class="{ 'is-characters': current.tool === 'characters' || current.tool === 'search' }">
        <UiReadingSection v-for="(section,index) in resultSections" :key="index" class="name-number-section" :title="section.title">
          <p>{{ characterText(section.text) }}</p>
          <details v-if="characterReference(section.text)" class="name-number-reference"><summary>康熙字典原文<ChevronDown :size="14" /></summary><p>{{ characterReference(section.text) }}</p></details>
        </UiReadingSection>
      </UiReadingGrid>
      <UiReadingSection class="name-number-ai" title="AI 解读">
        <ChatMarkdown v-if="current.interpretation" :content="current.interpretation" />
        <UiTextField v-if="current.interpretation" v-model="followup" label="继续提问" multiline :rows="2" placeholder="继续聊聊你关心的部分" />
        <UiNotice v-if="aiError" tone="error">{{ aiError }}</UiNotice>
        <UiActionBar align="end"><UiButton :loading="interpreting" @click="interpret"><Sparkles :size="16" />{{ current.interpretation ? '继续解读' : '解读结果' }}</UiButton></UiActionBar>
        <AiPromptFallback :request="request" :show-retry="false" />
      </UiReadingSection>
    </UiWorkspaceSurface>

  </UiPageShell>
</template>

<style scoped>
.name-number-page { display: grid; gap: var(--ds-space-5); max-width: 980px; margin-inline: auto; }
.name-number-tabs :deep(button) { flex: 1 0 100px; min-width: 100px; }
.name-number-entry, .name-number-result { min-width: 0; }
.name-number-intro { display: flex; align-items: center; gap: 16px; margin-bottom: 28px; }
.name-number-emblem { display: grid; place-items: center; flex: 0 0 52px; height: 52px; background: var(--ds-accent-soft); color: var(--ds-accent-strong); border-radius: var(--ds-radius-lg); }
.name-number-intro h2 { margin: 0 0 6px; color: var(--ds-text-primary); font-size: var(--ds-heading-sm); }
.name-number-intro p { margin: 0; color: var(--ds-text-secondary); font-size: var(--ds-text-sm); line-height: 1.7; }
.name-number-form, .name-number-option-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; }
.wide { grid-column: 1 / -1; }
.name-number-options { border-block: 1px solid var(--ds-line); padding-block: 14px; }
summary { cursor: pointer; list-style: none; }
summary::-webkit-details-marker { display: none; }
.name-number-options summary, .name-number-reference summary { display: flex; justify-content: space-between; align-items: center; gap: 12px; font-size: var(--ds-text-sm); color: var(--ds-text-secondary); }
.name-number-options summary span { display: flex; align-items: center; gap: 10px; color: var(--ds-text-tertiary); font-size: var(--ds-text-xs); }
.name-number-option-fields { padding-top: 20px; }
.name-number-profile { display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: var(--ds-surface-muted); border-radius: var(--ds-radius-md); color: var(--ds-accent-strong); cursor: pointer; }
.name-number-profile span { display: grid; gap: 5px; flex: 1; }
.name-number-profile strong { color: var(--ds-text-primary); font-weight: 550; font-size: var(--ds-text-sm); }
.name-number-profile small { color: var(--ds-text-tertiary); font-size: var(--ds-text-xs); }
.name-number-profile input { accent-color: var(--ds-accent); width: 17px; height: 17px; flex: 0 0 auto; }
.is-oracle { max-width: 820px; }
.is-oracle .name-number-intro { justify-content: center; text-align: left; padding-block: 8px 16px; }
.is-oracle .name-number-emblem { background: transparent; border: 1px solid var(--ds-line-strong); border-radius: 50%; width: 62px; height: 62px; flex-basis: 62px; }
.is-oracle .name-number-intro h2 { font-family: var(--font-serif, serif); letter-spacing: .12em; }
.zhuge-characters :deep(input) { text-align: center; font-family: var(--font-serif, serif); font-size: 24px; letter-spacing: .35em; min-height: 72px; }
.zhuge-characters :deep(input::placeholder) { font-family: inherit; font-size: 14px; letter-spacing: .06em; }
.kongming-hint { margin: 22px 0 0; text-align: center; color: var(--ds-text-tertiary); font-size: var(--ds-text-sm); line-height: 1.8; }
.kongming-polarities { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; padding-top: 22px; }
.kongming-polarities button { display: grid; justify-items: center; gap: 14px; padding: 16px 8px; border: 1px solid var(--ds-line); border-radius: var(--ds-radius-md); background: var(--ds-surface-muted); color: var(--ds-text-primary); }
.kongming-polarities small { color: var(--ds-text-tertiary); }
.kongming-polarities strong { font-weight: 500; font-size: var(--ds-text-sm); }
.kongming-polarities button > span { width: 24px; height: 24px; border-radius: 50%; background: var(--ds-accent-strong); border: 2px solid var(--ds-accent-strong); }
.kongming-polarities button > span.is-yin { background: transparent; }
.name-number-result { display: grid; gap: 24px; }
.name-number-asked { margin: 0; border-left: 2px solid var(--ds-accent); padding-left: 12px; color: var(--ds-text-secondary); font-size: var(--ds-text-sm); line-height: 1.8; }
.name-number-candidates { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; align-items: start; }
.name-number-candidate { min-width: 0; border: 1px solid var(--ds-line); border-radius: var(--ds-radius-lg); padding: 20px; background: var(--ds-surface); }
.name-number-section { min-width: 0; padding: var(--ds-space-5); }
.name-number-candidate summary { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.name-number-candidate summary > span { min-width: 0; display: grid; gap: 10px; }
.name-number-candidate strong { font-size: 23px; font-family: var(--font-serif, serif); letter-spacing: .1em; color: var(--ds-text-primary); }
.name-number-candidate small { color: var(--ds-text-tertiary); font-size: var(--ds-text-xs); line-height: 1.8; }
.name-number-candidate summary > svg { color: var(--ds-text-tertiary); flex: 0 0 auto; }
.name-number-candidate p, .name-number-section p { white-space: pre-wrap; line-height: 1.85; overflow-wrap: anywhere; color: var(--ds-text-secondary); font-size: var(--ds-text-sm); margin: 0; }
.name-number-candidate p { border-top: 1px solid var(--ds-line); padding-top: 16px; margin-top: 16px; }
.is-characters :deep(.ui-reading-section h2) { font-family: var(--font-serif, serif); font-size: 28px; color: var(--ds-accent-strong); }
.name-number-reference { border-top: 1px solid var(--ds-line); margin-top: 18px; padding-top: 14px; }
.name-number-reference p { margin-top: 16px; }
.name-number-ai { border-top: 1px solid var(--ds-line); padding-top: 22px; }
.name-number-ai :deep(.ui-reading-section__body) { display: grid; gap: 16px; }
@media (max-width: 720px) {
  .name-number-page { gap: 18px; }
  .name-number-tabs :deep(button) { flex-basis: 85px; min-width: 85px; }
  .name-number-intro { margin-bottom: 24px; gap: 12px; }
  .name-number-form, .name-number-option-fields { gap: 16px; }
  .name-number-candidates, .name-number-sections { grid-template-columns: minmax(0, 1fr); }
  .name-number-candidate, .name-number-section { padding: 17px; }
  .kongming-polarities { gap: 7px; }
}
@media (max-width: 420px) { .name-number-form, .name-number-option-fields { grid-template-columns: minmax(0, 1fr); } }
</style>
