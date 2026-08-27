<script setup lang="ts">
type ReadingRowTone = 'accent' | 'success' | 'caution' | 'neutral';

interface ReadingRow {
  key: string | number;
  marker: string;
  title?: string;
  badge?: string;
  detail: string;
  details?: ReadonlyArray<string>;
  note?: string;
  tone?: ReadingRowTone;
}

withDefaults(defineProps<{
  items: ReadonlyArray<ReadingRow>;
  markerStyle?: 'plain' | 'soft';
}>(), {
  markerStyle: 'plain',
});
</script>

<template>
  <div class="ui-reading-rows" :class="`ui-reading-rows--${markerStyle}`">
    <article
      v-for="item in items"
      :key="item.key"
      class="ui-reading-row"
      :class="`is-${item.tone || 'neutral'}`"
    >
      <span class="ui-reading-row__marker">{{ item.marker }}</span>
      <div class="ui-reading-row__content">
        <header v-if="item.title || item.badge">
          <strong v-if="item.title">{{ item.title }}</strong>
          <b v-if="item.badge">{{ item.badge }}</b>
        </header>
        <div v-if="item.details?.length" class="ui-reading-row__details">
          <p v-for="(detail, index) in item.details" :key="index">{{ detail }}</p>
        </div>
        <p v-else>{{ item.detail }}</p>
        <small v-if="item.note">{{ item.note }}</small>
      </div>
    </article>
  </div>
</template>

<style scoped>
.ui-reading-rows { min-width: 0; }

.ui-reading-row {
  align-items: start;
  display: grid;
  gap: var(--ds-space-3);
  grid-template-columns: 48px minmax(0, 1fr);
  min-width: 0;
  padding: 13px 0;
}

.ui-reading-row + .ui-reading-row { border-top: 1px solid var(--ds-line); }

.ui-reading-row__marker {
  color: var(--ds-text-secondary);
  font-size: var(--ds-text-sm);
  font-weight: 650;
  line-height: 1.5;
}

.ui-reading-rows--soft .ui-reading-row { grid-template-columns: 32px minmax(0, 1fr); }
.ui-reading-rows--soft .ui-reading-row__marker {
  align-items: center;
  background: var(--ds-surface-muted);
  border-radius: var(--ds-radius-round);
  color: var(--ds-accent-strong);
  display: flex;
  font-size: var(--ds-text-xs);
  height: 30px;
  justify-content: center;
  line-height: 1;
  width: 30px;
}

.ui-reading-row.is-accent .ui-reading-row__marker { color: var(--ds-accent-strong); }
.ui-reading-row.is-success .ui-reading-row__marker { color: color-mix(in srgb, var(--ds-success) 55%, var(--ds-text-primary)); }
.ui-reading-row.is-caution .ui-reading-row__marker { color: color-mix(in srgb, var(--ds-gold) 55%, var(--ds-text-primary)); }
.ui-reading-rows--soft .ui-reading-row.is-success .ui-reading-row__marker { background: var(--ds-success-soft); }
.ui-reading-rows--soft .ui-reading-row.is-caution .ui-reading-row__marker { background: color-mix(in srgb, var(--ds-gold) 14%, var(--ds-surface-raised)); }

.ui-reading-row__content { min-width: 0; }
.ui-reading-row__content header {
  align-items: baseline;
  display: flex;
  gap: var(--ds-space-2);
  justify-content: space-between;
  margin-bottom: 4px;
  min-width: 0;
}

.ui-reading-row__content strong {
  color: var(--ds-text-primary);
  font-size: var(--ds-text-md);
  font-weight: 650;
}

.ui-reading-row__content header b {
  color: var(--ds-accent-strong);
  flex: 0 0 auto;
  font-size: var(--ds-text-xs);
  font-weight: 600;
}

.ui-reading-row__content p {
  color: var(--ds-text-secondary);
  font-size: var(--ds-text-sm);
  line-height: var(--ds-line-normal);
  margin: 0;
  overflow-wrap: anywhere;
  text-wrap: pretty;
}

.ui-reading-row__details { display: grid; gap: var(--ds-space-1); }

.ui-reading-row__content small {
  color: var(--ds-text-tertiary);
  display: block;
  font-size: var(--ds-text-xs);
  line-height: 1.55;
  margin-top: var(--ds-space-1);
}

@media (max-width: 720px) {
  .ui-reading-row { gap: 10px; grid-template-columns: 42px minmax(0, 1fr); padding: 11px 0; }
  .ui-reading-rows--soft .ui-reading-row { grid-template-columns: 30px minmax(0, 1fr); }
  .ui-reading-rows--soft .ui-reading-row__marker { height: 28px; width: 28px; }
  .ui-reading-row__content header { align-items: flex-start; }
}
</style>
