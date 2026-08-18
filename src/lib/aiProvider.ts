export interface AiProviderIdentity {
  apiType: 'chat' | 'responses' | 'anthropic';
  model: string;
  url: string;
}

export interface ProviderConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ProviderChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ProviderTextResult {
  content: string;
  finishReason: string;
  reasoningLength: number;
}

// Anthropic Messages 强制要求 max_tokens；这是协议必填值，不用于限制其他渠道。
export const ANTHROPIC_REQUIRED_MAX_TOKENS = 8192;

/**
 * DeepSeek V4 默认启用高强度思考，思考 token 与最终正文共用输出预算。
 * 本产品只展示最终正文，因此明确关闭不可见的思考阶段，避免预算耗尽后 content 为空。
 */
export function getChatThinkingControl(config: AiProviderIdentity) {
  if (config.apiType !== 'chat' || !config.model.trim().toLowerCase().startsWith('deepseek-v4-')) return {};
  try {
    if (new URL(config.url).hostname.toLowerCase() !== 'api.deepseek.com') return {};
  } catch {
    return {};
  }
  return { thinking: { type: 'disabled' as const } };
}

export function buildInterpretationProviderBody(
  config: AiProviderIdentity,
  systemPrompt: string,
  providerMessages: ProviderConversationMessage[],
  chatMessages: ProviderChatMessage[],
  temperature: number,
) {
  if (config.apiType === 'responses') {
    return {
      model: config.model,
      instructions: systemPrompt,
      input: providerMessages,
      store: false,
    };
  }
  if (config.apiType === 'anthropic') {
    return {
      model: config.model,
      system: systemPrompt,
      messages: providerMessages,
      max_tokens: ANTHROPIC_REQUIRED_MAX_TOKENS,
      temperature,
    };
  }
  return {
    model: config.model,
    messages: chatMessages,
    temperature,
    ...getChatThinkingControl(config),
  };
}

function textFromContent(value: unknown, acceptedTypes?: Set<string>) {
  if (typeof value === 'string') return value;
  if (!Array.isArray(value)) return '';
  return value.map((item) => {
    if (typeof item === 'string') return item;
    if (!item || typeof item !== 'object') return '';
    const block = item as Record<string, unknown>;
    if (acceptedTypes && typeof block.type === 'string' && !acceptedTypes.has(block.type)) return '';
    return typeof block.text === 'string' ? block.text : '';
  }).join('');
}

export function extractProviderText(result: unknown, apiType: AiProviderIdentity['apiType']): ProviderTextResult {
  const empty = { content: '', finishReason: '', reasoningLength: 0 };
  if (!result || typeof result !== 'object') return empty;
  const record = result as Record<string, unknown>;

  if (apiType === 'responses') {
    if (typeof record.output_text === 'string') return { ...empty, content: record.output_text };
    if (!Array.isArray(record.output)) return empty;
    const content = record.output.map((item) => {
      if (!item || typeof item !== 'object') return '';
      const output = item as Record<string, unknown>;
      if (typeof output.text === 'string') return output.text;
      return textFromContent(output.content, new Set(['output_text', 'text']));
    }).join('');
    return {
      ...empty,
      content,
      finishReason: typeof record.status === 'string' ? record.status : '',
    };
  }

  if (apiType === 'anthropic') {
    return {
      ...empty,
      content: textFromContent(record.content, new Set(['text'])),
      finishReason: typeof record.stop_reason === 'string' ? record.stop_reason : '',
    };
  }

  if (!Array.isArray(record.choices)) return empty;
  const first = record.choices[0];
  if (!first || typeof first !== 'object') return empty;
  const choice = first as Record<string, unknown>;
  const finishReason = typeof choice.finish_reason === 'string' ? choice.finish_reason : '';
  if (!choice.message || typeof choice.message !== 'object') {
    return { ...empty, content: typeof choice.text === 'string' ? choice.text : '', finishReason };
  }
  const message = choice.message as Record<string, unknown>;
  return {
    content: textFromContent(message.content),
    finishReason,
    reasoningLength: typeof message.reasoning_content === 'string' ? message.reasoning_content.length : 0,
  };
}
