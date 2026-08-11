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
  spreadType: TarotSpreadType;
  spreadName: string;
  cards: TarotCardResult[];
  timestamp?: number;
  meta?: unknown;
  draw?: unknown;
}

export interface TarotInterpretationPayload {
  question: string;
  reading: TarotReadingResult;
  request: AiInterpretationRequest;
}
