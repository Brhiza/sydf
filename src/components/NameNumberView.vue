<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { calculateNameNumber, nameNumberTools, type NameNumberInput, type NameNumberResult } from '../lib/nameNumber';
import { requestAiInterpretation, type AiCustomConfig, type AiPreferences, type AiInterpretationRequest } from '../lib/ai';
import type { SelectableCaseProfile } from '../lib/caseSelection';
import { snapshotReadingProfile } from '../lib/readingProfile';
import ChatMarkdown from './ChatMarkdown.vue';
import AiPromptFallback from './AiPromptFallback.vue';
import { UiButton, UiNotice, UiSegmentedControl } from './ui';

const props = defineProps<{ profile: SelectableCaseProfile | null; caseIds: string[]; preferences: AiPreferences; aiConfig: AiCustomConfig; oracle?: 'zhuge' | 'kongming' }>();
const emit = defineEmits<{ 'select-case': [id: string] }>();
const form = reactive<NameNumberInput>({ tool: 'naming', text: '', surname: '', surnameLength: 1, givenNameLength: 2, gender: '通用', preferredCharacters: '', forbiddenCharacters: '', generationCharacter: '', generationPosition: 'first', purpose: 'general', pattern: '', strokes: '', wuxing: '', question: '' });
form.tool = props.oracle || 'naming';
const availableTools = nameNumberTools.filter(tool => tool.value !== 'zhuge' && tool.value !== 'kongming');
const useBirth = ref(true);
const loading = ref(false);
const interpreting = ref(false);
const error = ref('');
const aiError = ref('');
const storageError = ref('');
const followup = ref('');
let generation = 0;
let controller: AbortController | null = null;
const STORAGE_KEY = 'shiyue-name-number-history';
interface SavedReading {
  id: string; caseId: string | null; tool: NameNumberInput['tool']; question: string;
  profile: ReturnType<typeof snapshotReadingProfile>; result: NameNumberResult; createdAt: number; answer: string;
  input?: NameNumberInput; useBirth?: boolean; caseLabel?: string; conversation?: AiInterpretationRequest['conversation'];
}
const records = ref<SavedReading[]>([]);
const visibleRecords = computed(() => records.value.filter(record => props.oracle ? record.tool === props.oracle : availableTools.some(tool => tool.value === record.tool)));
const current = ref<SavedReading | null>(null);
const request = ref<AiInterpretationRequest | null>(null);
try {
  const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  if (Array.isArray(saved)) records.value = saved.filter((item): item is SavedReading => Boolean(item && typeof item.id === 'string' && nameNumberTools.some((tool) => tool.value === item.tool) && typeof item.result?.prompt === 'string' && Array.isArray(item.result.sections))).slice(0, 50);
} catch { storageError.value = '本机记录暂时无法读取。'; }
const naming = computed(() => form.tool === 'naming' || form.tool === 'name');
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
function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(records.value)); storageError.value = ''; }
  catch { storageError.value = '本机存储空间不足，本次结果仍可查看，但未保存到记录。'; }
}
function aiRequest(record: SavedReading): AiInterpretationRequest {
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
    const record: SavedReading = { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, caseId: profile?.id || null, caseLabel: profile?.label, input, useBirth: useBirth.value, tool: input.tool, question: input.question, profile: snapshotReadingProfile(naming.value && !useBirth.value ? null : profile), result, createdAt: Date.now(), answer: '' };
    current.value = record; request.value = aiRequest(record);
    records.value = [record, ...records.value].slice(0, 50); persist();
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
    record.answer = response.content;
    record.conversation = [...(payload.conversation || []), { role: 'user', content: payload.question }, { role: 'assistant', content: response.content }].slice(-20) as AiInterpretationRequest['conversation'];
    followup.value = '';
    records.value = records.value.map((item) => item.id === record.id ? { ...record } : item); persist();
  } catch (cause) { if (ticket === generation) aiError.value = cause instanceof Error ? cause.message : 'AI 解读未完成，请稍后重试。'; }
  finally { if (ticket === generation) interpreting.value = false; }
}
async function restore(record: SavedReading) {
  invalidate();
  emit('select-case', record.caseId && props.caseIds.includes(record.caseId) ? record.caseId : '');
  form.tool = record.tool;
  await nextTick();
  if (record.input) Object.assign(form, record.input);
  useBirth.value = record.useBirth ?? true;
  current.value = record; request.value = aiRequest(record);
}
</script>

<template>
  <section class="name-number-page screen">
    <UiSegmentedControl v-if="!oracle" v-model="form.tool" :items="availableTools" label="姓名数字工具" wrap />
    <form class="name-number-form" @submit.prevent="calculate">
      <template v-if="form.tool === 'naming'">
        <label>姓氏<input v-model="form.surname" maxlength="2" required placeholder="请输入姓氏" /></label>
        <label>名字字数<select v-model.number="form.givenNameLength"><option :value="1">单字名</option><option :value="2">双字名</option></select></label>
        <label>用字风格<select v-model="form.gender"><option>通用</option><option>男</option><option>女</option></select></label>
        <label>偏好字<input v-model="form.preferredCharacters" placeholder="选填" /></label>
        <label>避用字<input v-model="form.forbiddenCharacters" placeholder="选填" /></label>
        <label>辈分字<input v-model="form.generationCharacter" maxlength="1" placeholder="选填" /></label>
        <label v-if="form.generationCharacter">辈分字位置<select v-model="form.generationPosition"><option value="first">名字首字</option><option value="second">名字末字</option></select></label>
      </template>
      <template v-else-if="form.tool === 'name'">
        <label>姓名<input v-model="form.text" required placeholder="请输入完整姓名" /></label>
        <label>姓氏字数<select v-model.number="form.surnameLength"><option :value="1">单姓</option><option :value="2">复姓</option></select></label>
      </template>
      <label v-else-if="form.tool === 'characters'">汉字<input v-model="form.text" required maxlength="40" placeholder="输入 1 至 20 个汉字" /></label>
      <template v-else-if="form.tool === 'search'">
        <label>拼音<input v-model="form.text" placeholder="选填" /></label>
        <label>康熙笔画<input v-model="form.strokes" inputmode="numeric" placeholder="选填" /></label>
        <label>五行<select v-model="form.wuxing"><option value="">不限</option><option v-for="element in ['金','木','水','火','土']" :key="element">{{ element }}</option></select></label>
      </template>
      <template v-else-if="form.tool === 'number'">
        <label>号码<input v-model="form.text" required maxlength="64" placeholder="输入数字或字母编号" /></label>
        <label>用途<select v-model="form.purpose"><option value="general">通用编号</option><option value="phone">手机号</option><option value="plate">车牌号</option></select></label>
      </template>
      <label v-else-if="form.tool === 'zhuge'">三个汉字<input v-model="form.text" required placeholder="输入想到的三个汉字" /></label>
      <label v-else>五次阴阳结果<input v-model="form.pattern" placeholder="留空自动起卦，或输入 10101" pattern="[01阴阳正反公字●○]{5}" /></label>
      <label v-if="naming && profile" class="birth-option"><input v-model="useBirth" type="checkbox" />结合 {{ profile.label }} 的出生资料</label>
      <label class="wide">想问的事<textarea v-model="form.question" rows="2" placeholder="选填" /></label>
      <UiButton type="submit" :loading="loading">{{ form.tool === 'naming' ? '生成姓名' : form.tool === 'search' || form.tool === 'characters' ? '查询' : form.tool === 'kongming' ? '起卦' : '分析' }}</UiButton>
    </form>
    <UiNotice v-if="error" tone="error">{{ error }}</UiNotice>
    <UiNotice v-if="storageError" tone="error">{{ storageError }}</UiNotice>
    <article v-if="current" class="name-number-result">
      <header><h2>{{ current.result.title }}</h2><p>{{ current.result.summary }}</p><small v-if="current.profile">{{ current.profile.label }} · {{ current.profile.name }}</small></header>
      <div class="name-number-sections"><section v-for="(section,index) in current.result.sections" :key="index"><h3>{{ section.title }}</h3><p>{{ section.text }}</p></section></div>
      <div class="name-number-ai">
        <ChatMarkdown v-if="current.answer" :content="current.answer" />
        <label v-if="current.answer">继续提问<textarea v-model="followup" rows="2" /></label>
        <UiButton :loading="interpreting" @click="interpret">{{ current.answer ? '继续解读' : 'AI 解读' }}</UiButton>
        <UiNotice v-if="aiError" tone="error">{{ aiError }}</UiNotice>
        <AiPromptFallback :request="request" @retry="interpret" />
      </div>
    </article>
    <section v-if="visibleRecords.length" class="name-number-history"><h2>最近记录</h2><button v-for="record in visibleRecords" :key="record.id" type="button" @click="restore(record)"><strong>{{ record.result.title }}</strong><span>{{ record.caseLabel || record.profile?.label || '未关联案例' }} · {{ new Date(record.createdAt).toLocaleString('zh-CN') }}</span></button></section>
  </section>
</template>

<style scoped>
.name-number-page{max-width:1080px;margin:auto;padding:24px;display:grid;gap:24px}
.name-number-page :deep(.ui-segmented-control > button){flex:1 0 90px;min-width:90px;padding-inline:10px}
.name-number-form{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;align-items:end}
label{display:grid;gap:8px;font-size:14px}input,select,textarea{font:inherit;color:inherit;background:var(--surface,#fff);border:1px solid var(--line);border-radius:10px;padding:11px;min-width:0;width:100%;box-sizing:border-box}.wide{grid-column:1/-1}.birth-option{display:flex;align-items:center;grid-column:1/-1}.birth-option input{width:auto}
.name-number-result{display:grid;gap:20px}.name-number-result header p{line-height:1.7}.name-number-sections{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px}.name-number-sections section{padding:16px;border:1px solid var(--line);border-radius:14px}.name-number-sections h3{margin:0 0 10px}.name-number-sections p{white-space:pre-wrap;line-height:1.8;margin:0;overflow-wrap:anywhere}.name-number-ai{display:grid;gap:14px}.name-number-history{display:grid;gap:8px}.name-number-history button{display:flex;justify-content:space-between;gap:12px;padding:14px;border:1px solid var(--line);border-radius:12px;color:inherit;background:transparent;text-align:left}.name-number-history span{font-size:12px;opacity:.7}@media(max-width:600px){.name-number-page{padding:16px}.name-number-form{grid-template-columns:1fr 1fr}.name-number-history button{display:grid}}
</style>
