<script setup lang="ts">
withDefaults(defineProps<{
  kicker?: string;
  meta?: string;
  title: string;
  subtitle?: string;
  summary?: string;
}>(), {
  kicker: '',
  meta: '',
  subtitle: '',
  summary: '',
});
</script>

<template>
  <section class="ui-reading-lead">
    <div v-if="$slots.prelude" class="ui-reading-lead__prelude">
      <slot name="prelude" />
    </div>

    <div v-if="kicker || meta || $slots.meta" class="ui-reading-lead__heading">
      <span v-if="kicker" class="ui-reading-lead__kicker">{{ kicker }}</span>
      <span v-if="meta" class="ui-reading-lead__meta">{{ meta }}</span>
      <slot name="meta" />
    </div>

    <div class="ui-reading-lead__title">
      <h1>{{ title }}</h1>
      <span v-if="$slots['title-addon']" class="ui-reading-lead__title-addon">
        <slot name="title-addon" />
      </span>
    </div>

    <p v-if="subtitle" class="ui-reading-lead__subtitle">{{ subtitle }}</p>
    <p v-if="summary" class="ui-reading-lead__summary">{{ summary }}</p>
    <div v-if="$slots.default" class="ui-reading-lead__content"><slot /></div>
  </section>
</template>

<style scoped>
.ui-reading-lead {
  min-width: 0;
  width: 100%;
}

.ui-reading-lead__prelude { margin-bottom: var(--ds-space-3); }

.ui-reading-lead__heading {
  align-items: baseline;
  display: flex;
  flex-wrap: wrap;
  gap: var(--ds-space-1) var(--ds-space-3);
  margin-bottom: 7px;
  min-width: 0;
}

.ui-reading-lead__kicker {
  color: var(--ds-accent-strong);
  font-size: var(--ds-text-xs);
  font-weight: 650;
  letter-spacing: .09em;
}

.ui-reading-lead__meta {
  color: var(--ds-text-tertiary);
  font-size: var(--ds-text-xs);
  overflow-wrap: anywhere;
}

.ui-reading-lead__title {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--ds-space-2) var(--ds-space-3);
  min-width: 0;
}

.ui-reading-lead__title h1 {
  letter-spacing: .02em;
  margin: 0;
}

.ui-reading-lead__title-addon { align-items: center; display: inline-flex; }

.ui-reading-lead__subtitle {
  color: var(--ds-text-primary);
  font-size: var(--ds-text-lg);
  font-weight: 650;
  line-height: 1.5;
  margin: var(--ds-space-3) 0 0;
  text-wrap: pretty;
}

.ui-reading-lead__summary {
  color: var(--ds-text-secondary);
  font-size: var(--ds-text-md);
  line-height: var(--ds-line-normal);
  margin: var(--ds-space-2) 0 0;
  max-width: 68ch;
  overflow-wrap: anywhere;
  text-wrap: pretty;
}

.ui-reading-lead__content { min-width: 0; }

@media (max-width: 720px) {
  .ui-reading-lead__prelude { margin-bottom: 10px; }
  .ui-reading-lead__heading { gap: var(--ds-space-1) var(--ds-space-2); margin-bottom: 6px; }
  .ui-reading-lead__title { gap: 7px; }
  .ui-reading-lead__subtitle { font-size: var(--ds-text-md); margin-top: 9px; }
  .ui-reading-lead__summary { font-size: var(--ds-text-sm); }
}
</style>
