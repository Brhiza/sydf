<script setup lang="ts">
import { computed } from 'vue';
const props = defineProps<{ poem: string }>();
const lines = computed(() => props.poem.split(/[，。；！？\n]+/).map(line => line.trim()).filter(Boolean));
</script>

<template>
  <div class="ui-sign-poem"><p v-for="(line,index) in lines" :key="index">{{ line }}</p></div>
</template>

<style scoped>
.ui-sign-poem { align-items: center; display: flex; flex-direction: row-reverse; gap: clamp(8px, 1.3vw, 12px); justify-content: center; min-height: 180px; min-width: 0; padding: 4px 0; }
.ui-sign-poem p { font-size: 14px; letter-spacing: .08em; line-height: 1.65; margin: 0; writing-mode: vertical-rl; }
@media (max-width: 720px) { .ui-sign-poem { min-height: 168px; } .ui-sign-poem p { font-size: 13px; line-height: 1.6; } }
@media (max-width: 390px) { .ui-sign-poem { gap: 7px; min-height: 144px; } .ui-sign-poem p { font-size: 12px; letter-spacing: .05em; } }
</style>
