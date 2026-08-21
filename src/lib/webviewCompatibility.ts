export type WebviewCapabilities = {
  colorMix: boolean;
  dynamicViewport: boolean;
  hasSelector: boolean;
  backdropFilter: boolean;
};

function supports(property: string, value: string) {
  try {
    return typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports(property, value);
  } catch {
    return false;
  }
}

function supportsCondition(condition: string) {
  try {
    return typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports(condition);
  } catch {
    return false;
  }
}

export function detectWebviewCapabilities(): WebviewCapabilities {
  return {
    colorMix: supports('color', 'color-mix(in srgb, red 50%, transparent)'),
    dynamicViewport: supports('height', '100dvh'),
    hasSelector: supportsCondition('selector(:has(*))'),
    backdropFilter: supports('backdrop-filter', 'blur(1px)') || supports('-webkit-backdrop-filter', 'blur(1px)'),
  };
}

export function applyWebviewCompatibility(root: HTMLElement = document.documentElement) {
  const capabilities = detectWebviewCapabilities();
  const entries = Object.entries(capabilities) as Array<[keyof WebviewCapabilities, boolean]>;
  root.classList.toggle('legacy-webview', entries.some(([, available]) => !available));
  for (const [feature, available] of entries) root.classList.toggle(`no-${feature}`, !available);
  return capabilities;
}
