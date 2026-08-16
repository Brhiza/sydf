export type ExternalAiShareTarget = 'doubao' | 'deepseek';

interface ExternalAiTargetConfig {
  label: string;
  packageName: string;
  webUrl: string;
}

export const EXTERNAL_AI_TARGETS: Record<ExternalAiShareTarget, ExternalAiTargetConfig> = {
  doubao: {
    label: '豆包',
    packageName: 'com.larus.nova',
    webUrl: 'https://www.doubao.com/chat/',
  },
  deepseek: {
    label: 'DeepSeek',
    packageName: 'com.deepseek.chat',
    webUrl: 'https://chat.deepseek.com/',
  },
};

export function isAndroidUserAgent(userAgent: string) {
  return /Android/i.test(userAgent);
}

export function isIosDevice(userAgent: string, platform = '', maxTouchPoints = 0) {
  return /iPad|iPhone|iPod/i.test(userAgent)
    || (platform === 'MacIntel' && maxTouchPoints > 1);
}

export function buildAndroidTextShareIntent(target: ExternalAiShareTarget, text: string) {
  const config = EXTERNAL_AI_TARGETS[target];
  return [
    'intent:#Intent',
    'action=android.intent.action.SEND',
    'category=android.intent.category.DEFAULT',
    'type=text/plain',
    `S.android.intent.extra.TEXT=${encodeURIComponent(text)}`,
    `S.browser_fallback_url=${encodeURIComponent(config.webUrl)}`,
    `package=${config.packageName}`,
    'end',
  ].join(';');
}

export function externalAiShareUrl(target: ExternalAiShareTarget, text: string, userAgent: string) {
  return isAndroidUserAgent(userAgent)
    ? buildAndroidTextShareIntent(target, text)
    : EXTERNAL_AI_TARGETS[target].webUrl;
}
