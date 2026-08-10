<script setup lang="ts">
import { computed } from 'vue';
import { renderChatMarkdown } from '../lib/markdown';

const props = defineProps<{
  content: string;
}>();

const renderedContent = computed(() => renderChatMarkdown(props.content));
</script>

<template>
  <div class="chat-markdown" v-html="renderedContent"></div>
</template>
