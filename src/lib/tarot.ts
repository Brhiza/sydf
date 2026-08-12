import type { AiInterpretationRequest } from './ai';

export type TarotSpreadType = 'single' | 'three' | 'love' | 'career' | 'decision' | 'celtic' | 'chakra' | 'year' | 'mindBodySpirit' | 'horseshoe';

export interface TarotCardResult {
  id: number;
  name: string;
  position: string;
  reversed: boolean;
  keywords: string[];
  element?: string;
  archetype?: string;
}

export interface TarotReadingResult {
  deckType?: 'tarot';
  deckName?: '塔罗牌';
  spreadType: TarotSpreadType;
  spreadName: string;
  cards: TarotCardResult[];
  timestamp?: number;
  meta?: unknown;
  draw?: unknown;
}

export type WesternDeckType = 'tarot' | 'lenormand' | 'shiyue-oracle';
export type WesternSpreadType = 'single' | 'three' | 'five' | 'relationship' | 'decision' | 'nine';

export interface WesternCardResult {
  id: number;
  name: string;
  position: string;
  reversed: boolean;
  keywords: string[];
  meaning?: string;
  guidance?: string;
  subtitle?: string;
  imageUrl: string;
}

export interface WesternCardReadingResult {
  deckType: Exclude<WesternDeckType, 'tarot'>;
  deckName: '雷诺曼' | '时月神谕';
  spreadType: string;
  spreadName: string;
  cards: WesternCardResult[];
  timestamp?: number;
  meta?: unknown;
  draw?: unknown;
}

export type WesternReadingResult = TarotReadingResult | WesternCardReadingResult;

export interface WesternInterpretationPayload {
  question: string;
  reading: WesternReadingResult;
  request: AiInterpretationRequest;
}

export type TarotInterpretationPayload = WesternInterpretationPayload;
