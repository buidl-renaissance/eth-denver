/**
 * Fetch and parse ETHDenver side events from Google Sheet.
 * Supports: (A) Published CSV URL, (B) Google Sheets API with API key.
 */

const ETHDENVER_YEAR = 2026;
const SHEET_ID = '1TYpWZwW2u5V32QBMpl_EY8wjxN744E7ttZ0YrQrMKOI';
const MONTH_NAMES: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

/** Date row pattern e.g. "17 February, Tuesday" */
function isDateRow(cell: string): boolean {
  const trimmed = (cell || '').trim();
  return /^\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December),?\s+\w+/i.test(
    trimmed
  );
}

/** Time pattern e.g. "6:00 pm" or "10:00 am" */
function isTimeLike(cell: string): boolean {
  const trimmed = (cell || '').trim();
  return /^\d{1,2}:\d{2}\s*(am|pm)?$/i.test(trimmed) || /^\d{1,2}\s*(am|pm)$/i.test(trimmed);
}

/** Parse "17 February, Tuesday" -> "2026-02-17" */
function parseDateToYYYYMMDD(dateStr: string): string | null {
  const trimmed = (dateStr || '').trim();
  const match = trimmed.match(/^(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)/i);
  if (!match) return null;
  const day = parseInt(match[1], 10);
  const month = MONTH_NAMES[match[2].toLowerCase()];
  if (!month || day < 1 || day > 31) return null;
  const monthPadded = String(month).padStart(2, '0');
  const dayPadded = String(day).padStart(2, '0');
  return `${ETHDENVER_YEAR}-${monthPadded}-${dayPadded}`;
}

function looksLikeUrl(s: string): boolean {
  const t = (s || '').trim();
  return t.startsWith('http://') || t.startsWith('https://');
}

export type ParsedEvent = {
  eventDate: string;
  startTime: string;
  endTime: string | null;
  eventName: string;
  organizer: string | null;
  venue: string | null;
  registrationUrl: string | null;
  notes: string | null;
};

/**
 * Parse sheet rows (array of columns per row) into events.
 * Row 0 = title, Row 1 = headers, then date rows and event rows.
 */
export function parseSheetRows(rows: string[][]): ParsedEvent[] {
  const events: ParsedEvent[] = [];
  let currentDate: string | null = null;
  const dataStart = 2; // skip title and header

  for (let i = dataStart; i < rows.length; i++) {
    const row = rows[i];
    const col0 = (row?.[0] ?? '').trim();
    const col1 = (row?.[1] ?? '').trim();
    const col2 = (row?.[2] ?? '').trim();
    const col3 = (row?.[3] ?? '').trim();
    const col4 = (row?.[4] ?? '').trim();
    const col5 = (row?.[5] ?? '').trim();
    const col6 = (row?.[6] ?? '').trim();

    if (!col0) continue;

    if (isDateRow(col0)) {
      const parsed = parseDateToYYYYMMDD(col0);
      if (parsed) currentDate = parsed;
      continue;
    }

    if (isTimeLike(col0) && col2 && currentDate) {
      const regF = col5 || '';
      const regG = col6 || '';
      const registrationUrl = looksLikeUrl(regF)
        ? regF
        : looksLikeUrl(regG)
          ? regG
          : regF || null;
      const notes = col6 && !looksLikeUrl(col6) ? col6 : null;
      events.push({
        eventDate: currentDate,
        startTime: col0,
        endTime: col1 || null,
        eventName: col2,
        organizer: col3 || null,
        venue: col4 || null,
        registrationUrl,
        notes,
      });
    }
  }

  return events;
}

/**
 * Fetch sheet as CSV and return rows (string[][]).
 */
async function fetchSheetAsCsv(csvUrl: string): Promise<string[][]> {
  const res = await fetch(csvUrl, { cache: 'no-store' });
  if (!res.ok) throw new Error(`CSV fetch failed: ${res.status} ${res.statusText}`);
  const text = await res.text();
  const { parse } = await import('csv-parse/sync');
  const rows = parse(text, { relax_column_count: true, skip_empty_lines: true }) as string[][];
  return rows;
}

/**
 * Fetch sheet via Google Sheets API and return rows (string[][]).
 */
async function fetchSheetViaApi(apiKey: string): Promise<string[][]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/A:G?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Sheets API failed: ${res.status} ${res.statusText} ${body}`);
  }
  const data = (await res.json()) as { values?: string[][] };
  const rows = data.values ?? [];
  return rows;
}

/**
 * Fetch sheet data (CSV URL or Sheets API) and return parsed events.
 */
export async function fetchAndParseEvents(): Promise<{ events: ParsedEvent[]; source: string }> {
  const csvUrl = process.env.ETHDENVER_SHEETS_CSV_URL;
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;

  let rows: string[][];

  if (csvUrl) {
    rows = await fetchSheetAsCsv(csvUrl);
    const events = parseSheetRows(rows);
    return { events, source: 'csv' };
  }

  if (apiKey) {
    rows = await fetchSheetViaApi(apiKey);
    const events = parseSheetRows(rows);
    return { events, source: 'sheets_api' };
  }

  throw new Error(
    'Set ETHDENVER_SHEETS_CSV_URL (publish sheet to web as CSV) or GOOGLE_SHEETS_API_KEY to import events.'
  );
}
