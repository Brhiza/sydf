<script lang="ts">
export interface ChartCoreFact {
  key: string;
  symbol: string;
  label: string;
  value: string;
  detail?: string;
}
</script>

<script setup lang="ts">
defineProps<{
  title: string;
  hint?: string;
  items: ChartCoreFact[];
}>();
</script>

<template>
  <section class="chart-core-facts">
    <header>
      <span>{{ title }}</span>
      <small v-if="hint">{{ hint }}</small>
    </header>
    <div>
      <article v-for="item in items" :key="item.key">
        <b>{{ item.symbol }}</b>
        <span>
          <small>{{ item.label }}</small>
          <strong>{{ item.value }}</strong>
          <em v-if="item.detail">{{ item.detail }}</em>
        </span>
      </article>
    </div>
  </section>
</template>

<style scoped>
.chart-core-facts { min-width: 0; }
.chart-core-facts > header {
  align-items: baseline;
  display: flex;
  justify-content: space-between;
}
.chart-core-facts > header span {
  color: var(--accent-strong);
  font-family: "Noto Serif SC", "Songti SC", serif;
  font-size: 11px;
}
.chart-core-facts > header small { color: var(--muted); font-size: 8px; }
.chart-core-facts > div {
  display: grid;
  gap: 5px;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  margin-top: 6px;
}
.chart-core-facts article {
  align-items: center;
  background: var(--surface-muted);
  border: 1px solid var(--line);
  border-radius: 8px;
  display: flex;
  gap: 6px;
  min-width: 0;
  padding: 6px 7px;
}
.chart-core-facts article > b {
  align-items: center;
  color: var(--accent-strong);
  display: inline-flex;
  flex: 0 0 24px;
  font-family: "Noto Serif SC", "Songti SC", serif;
  font-size: 12px;
  justify-content: center;
}
.chart-core-facts article > span,
.chart-core-facts article small,
.chart-core-facts article strong,
.chart-core-facts article em { display: block; min-width: 0; }
.chart-core-facts article small,
.chart-core-facts article em {
  color: var(--muted);
  font-size: 7px;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.chart-core-facts article strong {
  color: var(--ink);
  font-size: 9px;
  line-height: 1.3;
  margin-top: 1px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.chart-core-facts article em { font-style: normal; margin-top: 1px; }
</style>
