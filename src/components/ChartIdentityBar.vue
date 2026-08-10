<script setup lang="ts">
defineProps<{
  name: string;
  subtitle: string;
  badge: string;
}>();
</script>

<template>
  <div class="chart-identity-bar">
    <div>
      <strong>{{ name }}</strong>
      <span>{{ subtitle }}</span>
    </div>
    <small>{{ badge }}</small>
  </div>
</template>

<style scoped>
.chart-identity-bar {
  align-items: flex-end;
  border-bottom: 1px solid var(--line);
  display: flex;
  gap: 8px;
  justify-content: space-between;
  padding: 0 2px 7px;
}
.chart-identity-bar > div { min-width: 0; }
.chart-identity-bar strong,
.chart-identity-bar span { display: block; }
.chart-identity-bar strong {
  color: var(--accent-strong);
  font-family: "Noto Serif SC", "Songti SC", serif;
  font-size: 14px;
  line-height: 1.35;
}
.chart-identity-bar span {
  color: var(--muted);
  font-size: 9px;
  line-height: 1.35;
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.chart-identity-bar > small {
  color: var(--muted);
  font-size: 8px;
  white-space: nowrap;
}

@media (max-width: 720px) {
  .chart-identity-bar > div { flex: 1; }
}
</style>
