import { describe, expect, it } from 'vitest';
import { buildInterpretationProviderBody, extractProviderText } from './aiProvider';

const providerMessages = [{ role: 'user' as const, content: '问题' }];
const chatMessages = [
  { role: 'system' as const, content: '系统提示' },
  { role: 'user' as const, content: '问题' },
];

describe('AI 渠道协议适配', () => {
  it('Chat 和 Responses 不发送输出预算，Anthropic 保留协议必填值', () => {
    const chat = buildInterpretationProviderBody(
      { apiType: 'chat', model: 'chat-model', url: 'https://example.com/v1/chat/completions' },
      '系统提示', providerMessages, chatMessages, 0.55,
    );
    const responses = buildInterpretationProviderBody(
      { apiType: 'responses', model: 'response-model', url: 'https://example.com/v1/responses' },
      '系统提示', providerMessages, chatMessages, 0.55,
    );
    const anthropic = buildInterpretationProviderBody(
      { apiType: 'anthropic', model: 'claude-model', url: 'https://api.anthropic.com/v1/messages' },
      '系统提示', providerMessages, chatMessages, 0.55,
    );

    expect(chat).not.toHaveProperty('max_tokens');
    expect(responses).not.toHaveProperty('max_output_tokens');
    expect(anthropic).toMatchObject({ max_tokens: 8192, system: '系统提示' });
  });

  it('DeepSeek 官方 V4 关闭默认思考，其他 Chat 渠道不附加专有参数', () => {
    const deepseek = buildInterpretationProviderBody(
      { apiType: 'chat', model: 'deepseek-v4-flash', url: 'https://api.deepseek.com/v1/chat/completions' },
      '系统提示', providerMessages, chatMessages, 0.55,
    );
    const compatible = buildInterpretationProviderBody(
      { apiType: 'chat', model: 'deepseek-v4-flash', url: 'https://gateway.example.com/v1/chat/completions' },
      '系统提示', providerMessages, chatMessages, 0.55,
    );

    expect(deepseek).toHaveProperty('thinking', { type: 'disabled' });
    expect(compatible).not.toHaveProperty('thinking');
  });

  it('统一提取 Chat 分段正文、Responses 嵌套正文和 Anthropic 文本块', () => {
    expect(extractProviderText({
      choices: [{ finish_reason: 'stop', message: { content: [{ type: 'text', text: '分段' }, { type: 'text', text: '正文' }] } }],
    }, 'chat')).toMatchObject({ content: '分段正文', finishReason: 'stop' });

    expect(extractProviderText({
      status: 'completed',
      output: [{ type: 'message', content: [{ type: 'output_text', text: 'Responses 正文' }] }],
    }, 'responses')).toMatchObject({ content: 'Responses 正文', finishReason: 'completed' });

    expect(extractProviderText({
      stop_reason: 'end_turn',
      content: [{ type: 'thinking', text: '不应展示' }, { type: 'text', text: 'Anthropic 正文' }],
    }, 'anthropic')).toMatchObject({ content: 'Anthropic 正文', finishReason: 'end_turn' });
  });
});
