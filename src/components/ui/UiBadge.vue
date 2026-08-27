<script setup lang="ts">
withDefaults(defineProps<{
  tone?: 'accent' | 'neutral' | 'success' | 'caution';
}>(), {
  tone: 'neutral',
});
</script>

<template>
  <span class="ui-badge" :class="`ui-badge--${tone}`"><slot /></span>
</template>

<style scoped>
.ui-badge {
  align-items: center;
  border: 1px solid transparent;
  border-radius: var(--ds-radius-round);
  display: inline-flex;
  font-size: var(--ds-text-xs);
  font-weight: 600;
  line-height: 1.35;
  min-height: 26px;
  padding: 3px 8px;
  white-space: nowrap;
}

.ui-badge--accent {
  background: var(--ds-accent-soft);
  color: color-mix(in srgb, var(--ds-accent-strong) 82%, var(--ds-text-primary));
}

.ui-badge--neutral {
  background: var(--ds-surface-muted);
  border-color: var(--ds-line);
  color: var(--ds-text-secondary);
}

.ui-badge--success {
  background: var(--ds-success-soft);
  color: color-mix(in srgb, var(--ds-success) 55%, var(--ds-text-primary));
}

.ui-badge--caution {
  background: color-mix(in srgb, var(--ds-gold) 14%, var(--ds-surface-raised));
  color: color-mix(in srgb, var(--ds-gold) 55%, var(--ds-text-primary));
}
</style>
