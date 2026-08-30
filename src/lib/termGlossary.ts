import type { MetaphysicsTerm, MetaphysicsTermCategory } from 'mingyu-core/terms';

export type { MetaphysicsTerm, MetaphysicsTermCategory };

let termsPromise: Promise<MetaphysicsTerm[]> | null = null;

export function loadMetaphysicsTerms(): Promise<MetaphysicsTerm[]> {
  if (!termsPromise) {
    termsPromise = import('mingyu-core/terms')
      .then((module) => module.METAPHYSICS_TERMS)
      .catch((error) => {
        termsPromise = null;
        throw error;
      });
  }
  return termsPromise;
}

function normalizedTermText(term: MetaphysicsTerm) {
  return [
    term.term,
    term.pinyin,
    term.category,
    term.summary,
    term.detail,
    ...(term.aliases || []),
    ...(term.tags || []),
  ].filter(Boolean).join(' ').toLocaleLowerCase();
}

function termScore(term: MetaphysicsTerm, query: string) {
  const normalizedTerm = term.term.toLocaleLowerCase();
  const aliases = (term.aliases || []).map((alias) => alias.toLocaleLowerCase());
  if (normalizedTerm === query) return 100;
  if (aliases.includes(query)) return 90;
  if (normalizedTerm.startsWith(query)) return 80;
  if (aliases.some((alias) => alias.startsWith(query))) return 70;
  if (normalizedTerm.includes(query)) return 60;
  if (aliases.some((alias) => alias.includes(query))) return 50;
  if (`${term.category}${(term.tags || []).join('')}`.toLocaleLowerCase().includes(query)) return 30;
  return normalizedTermText(term).includes(query) ? 10 : 0;
}

export function getTermCategories(terms: MetaphysicsTerm[]): MetaphysicsTermCategory[] {
  return [...new Set(terms.map((term) => term.category))];
}

export function searchMetaphysicsTerms(
  terms: MetaphysicsTerm[],
  query: string,
  category: MetaphysicsTermCategory | '全部' = '全部',
  limit = 48,
) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const candidates = category === '全部' ? terms : terms.filter((term) => term.category === category);

  if (normalizedQuery) {
    return candidates
      .map((term, index) => ({ term, index, score: termScore(term, normalizedQuery) }))
      .filter((item) => item.score > 0)
      .sort((left, right) => right.score - left.score || left.index - right.index)
      .slice(0, limit)
      .map((item) => item.term);
  }

  if (category !== '全部') return candidates.slice(0, limit);

  const grouped = new Map<MetaphysicsTermCategory, MetaphysicsTerm[]>();
  for (const term of candidates) {
    const group = grouped.get(term.category) || [];
    group.push(term);
    grouped.set(term.category, group);
  }

  const suggestions: MetaphysicsTerm[] = [];
  for (let index = 0; suggestions.length < limit; index += 1) {
    let added = false;
    for (const group of grouped.values()) {
      if (group[index]) {
        suggestions.push(group[index]);
        added = true;
        if (suggestions.length >= limit) break;
      }
    }
    if (!added) break;
  }
  return suggestions;
}
