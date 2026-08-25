<script setup lang="ts">
withDefaults(defineProps<{
  as?: 'section' | 'div' | 'aside';
  title: string;
  kicker?: string;
  description?: string;
  headingId?: string;
}>(), {
  as: 'section',
  kicker: '',
  description: '',
  headingId: undefined,
});
</script>

<template>
  <component :is="as" class="ui-reading-section">
    <header class="ui-reading-section__heading">
      <div>
        <span v-if="kicker" class="ui-reading-section__kicker">{{ kicker }}</span>
        <h2 :id="headingId">{{ title }}</h2>
        <p v-if="description">{{ description }}</p>
      </div>
      <div v-if="$slots.meta" class="ui-reading-section__meta"><slot name="meta" /></div>
    </header>
    <div class="ui-reading-section__body"><slot /></div>
  </component>
</template>

<style scoped>
.ui-reading-section {
  border-top: 1px solid var(--ds-line);
  min-width: 0;
  padding: var(--ds-reading-section-y) var(--ds-reading-section-x);
}

.ui-reading-section__heading {
  align-items: flex-end;
  display: flex;
  gap: var(--ds-space-4);
  justify-content: space-between;
  margin-bottom: var(--ds-space-4);
  min-width: 0;
}

.ui-reading-section__heading > div:first-child { min-width: 0; overflow-wrap: anywhere; }
.ui-reading-section__kicker {
  color: var(--ds-accent-strong);
  display: block;
  font-size: var(--ds-text-xs);
  font-weight: 650;
  letter-spacing: .09em;
}

.ui-reading-section h2 {
  color: var(--ds-text-primary);
  font-size: var(--ds-heading-sm);
  font-weight: 700;
  letter-spacing: .02em;
  line-height: 1.35;
  margin: 4px 0 0;
}

.ui-reading-section__heading p {
  color: var(--ds-text-secondary);
  font-size: var(--ds-text-sm);
  line-height: var(--ds-line-normal);
  margin: 5px 0 0;
  max-width: 68ch;
  text-wrap: pretty;
}

.ui-reading-section__meta {
  color: var(--ds-text-tertiary);
  flex: 0 0 auto;
  font-size: var(--ds-text-xs);
}

.ui-reading-section__body { min-width: 0; }

@media (max-width: 720px) {
  .ui-reading-section__heading { align-items: flex-start; gap: var(--ds-space-2); margin-bottom: var(--ds-space-3); }
  .ui-reading-section h2 { font-size: var(--ds-text-lg); }
  .ui-reading-section__heading p { font-size: var(--ds-text-xs); line-height: 1.55; }
  .ui-reading-section__meta { display: none; }
}
</style>
