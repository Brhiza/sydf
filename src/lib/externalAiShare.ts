export type ExternalAiShareTarget = 'doubao' | 'deepseek';

interface ExternalAiTargetConfig {
  appUrl: string;
  label: string;
}

export const EXTERNAL_AI_TARGETS: Record<ExternalAiShareTarget, ExternalAiTargetConfig> = {
  doubao: {
    appUrl: 'doubao://',
    label: '豆包',
  },
  deepseek: {
    appUrl: 'dpsk://chat/new',
    label: 'DeepSeek',
  },
};

export function isAndroidUserAgent(userAgent: string) {
  return /Android/i.test(userAgent);
}

export function isIosDevice(userAgent: string, platform = '', maxTouchPoints = 0) {
  return /iPad|iPhone|iPod/i.test(userAgent)
    || (platform === 'MacIntel' && maxTouchPoints > 1);
}

export function buildExternalAiShareData(text: string): ShareData {
  return {
    title: '时月东方解读提示词',
    text,
  };
}

export function getExternalAiAppUrl(target: ExternalAiShareTarget) {
  return EXTERNAL_AI_TARGETS[target].appUrl;
}
