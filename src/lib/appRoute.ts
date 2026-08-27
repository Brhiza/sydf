export const appRouteViews = [
  'tools',
  'fortune',
  'xiaoliuren',
  'daily-hexagram',
  'almanac',
  'fengshui',
  'oracle',
  'tarot',
  'charts',
  'compatibility',
  'cases',
  'settings',
] as const;

export type AppRouteView = typeof appRouteViews[number];
export type AppRouteSettingsSection = 'preferences' | 'theme' | 'ai';
export type AppRouteCasesSection = 'input' | 'records';

export interface AppRouteState {
  view: AppRouteView;
  settingsSection: AppRouteSettingsSection;
  casesSection: AppRouteCasesSection;
  history: boolean;
}

const appRouteViewSet = new Set<string>(appRouteViews);

export function parseAppRoute(hash: string): AppRouteState {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const requestedView = parts[0] || 'tools';
  const view = appRouteViewSet.has(requestedView) ? requestedView as AppRouteView : 'tools';
  const section = parts[1] || '';

  return {
    view,
    settingsSection: view === 'settings' && (section === 'theme' || section === 'ai') ? section : 'preferences',
    casesSection: view === 'cases' && section === 'records' ? 'records' : 'input',
    history: parts.includes('history'),
  };
}

export function buildAppRouteHash(state: AppRouteState) {
  const parts: string[] = [state.view];
  if (state.view === 'settings') parts.push(state.settingsSection);
  if (state.view === 'cases') parts.push(state.casesSection);
  if (state.history) parts.push('history');
  return `#/${parts.join('/')}`;
}
