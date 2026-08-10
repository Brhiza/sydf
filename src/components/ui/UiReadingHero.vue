<script setup lang="ts">
withDefaults(defineProps<{
  hasMedia?: boolean;
  hasContext?: boolean;
  hasSummary?: boolean;
}>(), {
  hasMedia: true,
  hasContext: true,
  hasSummary: true,
});
</script>

<template>
  <section
    class="ui-reading-hero"
    :class="{
      'has-media': hasMedia,
      'has-context': hasContext,
      'has-summary': hasSummary,
    }"
  >
    <div v-if="hasMedia" class="ui-reading-hero__media">
      <slot name="media" />
    </div>
    <div v-if="hasContext" class="ui-reading-hero__context">
      <slot name="context" />
    </div>
    <div v-if="hasSummary" class="ui-reading-hero__summary">
      <slot name="summary" />
    </div>
  </section>
</template>

<style scoped>
.ui-reading-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  min-height: var(--ds-reading-hero-min);
  min-width: 0;
}

.ui-reading-hero.has-media.has-context.has-summary {
  grid-template-columns: var(--ds-reading-media) minmax(270px, .78fr) minmax(360px, 1.22fr);
}

.ui-reading-hero.has-media.has-context:not(.has-summary),
.ui-reading-hero.has-media.has-summary:not(.has-context) {
  grid-template-columns: var(--ds-reading-media) minmax(0, 1fr);
}

.ui-reading-hero.has-context.has-summary:not(.has-media) {
  grid-template-columns: minmax(270px, .78fr) minmax(360px, 1.22fr);
}

.ui-reading-hero__media,
.ui-reading-hero__context,
.ui-reading-hero__summary {
  min-width: 0;
  padding: var(--ds-reading-section-y) var(--ds-reading-section-x);
}

.ui-reading-hero__media {
  align-items: center;
  background: linear-gradient(160deg, var(--ds-surface-muted), var(--ds-surface-raised));
  display: flex;
  justify-content: center;
  padding: var(--ds-reading-section-y) var(--ds-space-4);
}

.ui-reading-hero.has-context .ui-reading-hero__media,
.ui-reading-hero.has-summary .ui-reading-hero__media,
.ui-reading-hero.has-summary .ui-reading-hero__context {
  border-right: 1px solid var(--ds-line);
}

.ui-reading-hero__context {
  align-items: center;
  display: flex;
  justify-content: center;
  padding: var(--ds-reading-section-y) var(--ds-reading-section-x);
}

.ui-reading-hero__summary {
  align-content: center;
  display: grid;
}

.ui-reading-hero__media :deep(> *) {
  max-width: 136px;
  width: 100%;
}

.ui-reading-hero :deep(h1) {
  color: var(--ds-text-primary);
  font-size: clamp(28px, 3vw, 34px);
  font-weight: 700;
  line-height: 1.25;
}

@media (max-width: 940px) {
  .ui-reading-hero.has-media.has-context.has-summary { grid-template-columns: var(--ds-reading-media) minmax(0, 1fr); }
  .ui-reading-hero.has-media.has-context.has-summary .ui-reading-hero__context { border-right: 0; }
  .ui-reading-hero.has-media.has-context.has-summary .ui-reading-hero__summary {
    border-top: 1px solid var(--ds-line);
    grid-column: 1 / -1;
  }

  .ui-reading-hero.has-context.has-summary:not(.has-media) { grid-template-columns: 1fr; }
  .ui-reading-hero.has-context.has-summary:not(.has-media) .ui-reading-hero__context { border-right: 0; }
  .ui-reading-hero.has-context.has-summary:not(.has-media) .ui-reading-hero__summary { border-top: 1px solid var(--ds-line); }
}

@media (max-width: 720px) {
  .ui-reading-hero__media { padding-inline: var(--ds-space-2); }
  .ui-reading-hero__media :deep(> *) { max-width: 108px; }
  .ui-reading-hero :deep(h1) { font-size: 24px; }
}

@media (max-width: 360px) {
  .ui-reading-hero.has-media.has-context.has-summary,
  .ui-reading-hero.has-media.has-context:not(.has-summary),
  .ui-reading-hero.has-media.has-summary:not(.has-context) { grid-template-columns: 116px minmax(0, 1fr); }
  .ui-reading-hero__media { padding-inline: 7px; }
  .ui-reading-hero__media :deep(> *) { max-width: 100px; }
}
</style>
