import { describe, expect, it } from 'vitest';
import { buildAppRouteHash, parseAppRoute } from './appRoute';

describe('app route', () => {
  it('parses pages, subpages and the history drawer', () => {
    expect(parseAppRoute('#/settings/ai/history')).toEqual({
      view: 'settings',
      settingsSection: 'ai',
      casesSection: 'input',
      history: true,
    });
    expect(parseAppRoute('#/cases/records')).toMatchObject({ view: 'cases', casesSection: 'records', history: false });
  });

  it('falls back safely when a shared link is invalid', () => {
    expect(parseAppRoute('#/unknown/anything')).toEqual({
      view: 'tools',
      settingsSection: 'preferences',
      casesSection: 'input',
      history: false,
    });
  });

  it('builds stable hashes that round-trip', () => {
    const state = {
      view: 'cases' as const,
      settingsSection: 'preferences' as const,
      casesSection: 'records' as const,
      history: true,
    };
    const hash = buildAppRouteHash(state);
    expect(hash).toBe('#/cases/records/history');
    expect(parseAppRoute(hash)).toEqual(state);
  });
});
