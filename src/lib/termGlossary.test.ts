import { describe, expect, it } from 'vitest';
import type { MetaphysicsTerm } from './termGlossary';
import { getTermCategories, searchMetaphysicsTerms } from './termGlossary';

const terms: MetaphysicsTerm[] = [
  { term: '甲木', category: '八字', summary: '阳木', detail: '栋梁', aliases: ['甲'], tags: ['十天干'] },
  { term: '用神', category: '八字', summary: '平衡命局', detail: '取用', aliases: ['喜用'], tags: ['命局'] },
  { term: '世爻', category: '六爻', summary: '代表求测者', detail: '世应关系', aliases: ['世'], tags: ['卦爻'] },
];

describe('术语百科检索', () => {
  it('优先返回术语和别名的精确匹配', () => {
    expect(searchMetaphysicsTerms(terms, '甲').map((term) => term.term)).toEqual(['甲木']);
    expect(searchMetaphysicsTerms(terms, '喜用')[0]?.term).toBe('用神');
  });

  it('支持按解释、标签和分类搜索', () => {
    expect(searchMetaphysicsTerms(terms, '求测者')[0]?.term).toBe('世爻');
    expect(searchMetaphysicsTerms(terms, '十天干')[0]?.term).toBe('甲木');
    expect(searchMetaphysicsTerms(terms, '六爻')[0]?.term).toBe('世爻');
  });

  it('支持分类筛选并限制结果数量', () => {
    expect(getTermCategories(terms)).toEqual(['八字', '六爻']);
    expect(searchMetaphysicsTerms(terms, '', '八字', 1).map((term) => term.term)).toEqual(['甲木']);
  });

  it('未搜索时交错展示不同分类', () => {
    expect(searchMetaphysicsTerms(terms, '', '全部', 3).map((term) => term.term)).toEqual(['甲木', '世爻', '用神']);
  });
});
