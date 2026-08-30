<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { ArrowLeft, BookOpen, LoaderCircle, RefreshCw } from 'lucide-vue-next';
import {
  getTermCategories,
  loadMetaphysicsTerms,
  searchMetaphysicsTerms,
  type MetaphysicsTerm,
  type MetaphysicsTermCategory,
} from '../lib/termGlossary';

const props = defineProps<{ query: string }>();

const terms = ref<MetaphysicsTerm[]>([]);
const category = ref<MetaphysicsTermCategory | '全部'>('全部');
const selectedTerm = ref<MetaphysicsTerm | null>(null);
const loading = ref(true);
const loadFailed = ref(false);

const categories = computed(() => getTermCategories(terms.value));
const results = computed(() => searchMetaphysicsTerms(terms.value, props.query, category.value));

watch(() => props.query, () => {
  selectedTerm.value = null;
});

watch(category, () => {
  selectedTerm.value = null;
});

async function loadTerms() {
  loading.value = true;
  loadFailed.value = false;
  try {
    terms.value = await loadMetaphysicsTerms();
  } catch {
    loadFailed.value = true;
  } finally {
    loading.value = false;
  }
}

onMounted(loadTerms);
</script>

<template>
  <div class="term-glossary">
    <div v-if="loading" class="term-glossary-state"><LoaderCircle :size="18" class="is-spinning" /><span>正在加载术语库</span></div>
    <div v-else-if="loadFailed" class="term-glossary-state">
      <BookOpen :size="18" />
      <span>术语库加载失败</span>
      <button type="button" @click="loadTerms"><RefreshCw :size="14" />重新加载</button>
    </div>
    <template v-else-if="selectedTerm">
      <article class="term-detail">
        <button type="button" class="term-detail-back" @click="selectedTerm = null"><ArrowLeft :size="15" />返回术语列表</button>
        <header><span>{{ selectedTerm.category }}</span><h3>{{ selectedTerm.term }}</h3><small v-if="selectedTerm.pinyin">{{ selectedTerm.pinyin }}</small></header>
        <p class="term-detail-summary">{{ selectedTerm.summary }}</p>
        <dl>
          <div v-if="selectedTerm.positive"><dt>有利表现</dt><dd>{{ selectedTerm.positive }}</dd></div>
          <div v-if="selectedTerm.negative"><dt>需要留意</dt><dd>{{ selectedTerm.negative }}</dd></div>
          <div v-if="selectedTerm.advice"><dt>参考建议</dt><dd>{{ selectedTerm.advice }}</dd></div>
          <div><dt>详细解释</dt><dd>{{ selectedTerm.detail }}</dd></div>
          <div v-if="selectedTerm.classicRef"><dt>典籍出处</dt><dd>{{ selectedTerm.classicRef }}</dd></div>
        </dl>
        <div v-if="selectedTerm.aliases?.length || selectedTerm.tags?.length" class="term-detail-tags"><span v-for="tag in [...(selectedTerm.aliases || []), ...(selectedTerm.tags || [])]" :key="tag">{{ tag }}</span></div>
      </article>
    </template>
    <template v-else>
      <div class="term-category-tabs" aria-label="术语分类">
        <button type="button" :class="{ active: category === '全部' }" @click="category = '全部'">全部</button>
        <button v-for="item in categories" :key="item" type="button" :class="{ active: category === item }" @click="category = item">{{ item }}</button>
      </div>
      <div v-if="results.length" class="term-result-list">
        <button v-for="term in results" :key="`${term.category}-${term.term}`" type="button" class="term-result-item" @click="selectedTerm = term">
          <span>{{ term.category }}</span><strong>{{ term.term }}</strong><small>{{ term.summary }}</small>
        </button>
      </div>
      <div v-else class="inspiration-empty"><BookOpen :size="18" /><span>没有找到相关术语</span></div>
    </template>
  </div>
</template>
