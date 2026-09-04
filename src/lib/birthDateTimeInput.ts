export interface BirthDateTimeInputParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

function buildParts(values: string[]): BirthDateTimeInputParts | null {
  const [year, month, day, hour, minute] = values.map(Number);
  if (![year, month, day, hour, minute].every(Number.isInteger)) return null;
  return { year, month, day, hour, minute };
}

export function parseBirthDateTimeInput(value: string, fallbackTime = '12:00'): BirthDateTimeInputParts | null {
  const trimmed = value.trim();
  const fallbackMatch = /^(\d{2}):(\d{2})$/.exec(fallbackTime);
  const fallbackHour = fallbackMatch?.[1] || '12';
  const fallbackMinute = fallbackMatch?.[2] || '00';
  if (!trimmed) return null;

  if (/^[\d\sTt:/.,，年月日时分秒-]+$/.test(trimmed)) {
    const digits = trimmed.replace(/\D/g, '');
    if (digits.length === 8) {
      return buildParts([
        digits.slice(0, 4),
        digits.slice(4, 6),
        digits.slice(6, 8),
        fallbackHour,
        fallbackMinute,
      ]);
    }
    if (digits.length === 12 || (digits.length === 14 && Number(digits.slice(12, 14)) <= 59)) {
      return buildParts([
        digits.slice(0, 4),
        digits.slice(4, 6),
        digits.slice(6, 8),
        digits.slice(8, 10),
        digits.slice(10, 12),
      ]);
    }
  }

  const formatted = /^(\d{4})\s*(?:年|[-/.])\s*(\d{1,2})\s*(?:月|[-/.])\s*(\d{1,2})\s*日?(?:\s*(?:T|t|,|，|\s)\s*(\d{1,2})\s*(?::|时)\s*(\d{1,2})\s*分?)?$/.exec(trimmed);
  if (!formatted) return null;
  return buildParts([
    formatted[1],
    formatted[2],
    formatted[3],
    formatted[4] || fallbackHour,
    formatted[5] || fallbackMinute,
  ]);
}

export function formatBirthDateTimeInput(values: string[]) {
  if (values.length < 5) return '';
  return values.slice(0, 5).join('');
}
