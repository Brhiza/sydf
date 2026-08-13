import type { BirthForm } from './divination';

export function normalizeStoredTimeBasis(value: unknown): BirthForm['timeBasis'] {
  return value === 'clock' ? 'clock' : 'trueSolar';
}
