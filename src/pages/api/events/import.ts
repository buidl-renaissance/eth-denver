import type { NextApiRequest, NextApiResponse } from 'next';
import { createHash } from 'crypto';
import { getDb } from '@/db/drizzle';
import { events } from '@/db/schema';
import { fetchAndParseEvents, parseCsvToRows, parseSheetRows } from '@/lib/sheets';

export const config = {
  api: { bodyParser: false },
};

type ImportResponse = {
  ok: boolean;
  imported?: number;
  source?: string;
  error?: string;
  parseErrors?: string[];
};

function readRawBody(req: NextApiRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

/**
 * POST /api/events/import
 * 1) If request has a body (e.g. CSV file contents), parse it and import.
 * 2) Otherwise fetches from ETHDENVER_SHEETS_CSV_URL or Google Sheets API.
 * To upload a CSV file: curl -X POST -H "Content-Type: text/csv" --data-binary @"/path/to/Event List.csv" http://localhost:3000/api/events/import
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ImportResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const rawBody = await readRawBody(req);
    const csvBody = rawBody.trim();

    let parsed: Awaited<ReturnType<typeof parseSheetRows>>;
    let source: string;

    if (csvBody.length > 0) {
      const rows = await parseCsvToRows(csvBody);
      parsed = parseSheetRows(rows);
      source = 'upload';
    } else {
      const result = await fetchAndParseEvents();
      parsed = result.events;
      source = result.source;
    }

    if (parsed.length === 0) {
      return res.status(200).json({
        ok: true,
        imported: 0,
        source,
        parseErrors: ['No event rows found in sheet.'],
      });
    }

    const db = getDb();
    const now = new Date();

    const seen = new Set<string>();
    const rows = parsed
      .filter((e) => {
        const key = `${e.eventDate}|${e.eventName}|${e.startTime}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((e) => {
      const id = createHash('sha256')
        .update(`${e.eventDate}|${e.eventName}|${e.startTime}`)
        .digest('hex')
        .slice(0, 36);
      return {
        id,
        eventDate: e.eventDate,
        startTime: e.startTime,
        endTime: e.endTime,
        eventName: e.eventName,
        organizer: e.organizer,
        venue: e.venue,
        registrationUrl: e.registrationUrl,
        notes: e.notes,
        createdAt: now,
        updatedAt: now,
      };
    });

    await db.delete(events);
    const BATCH_SIZE = 50;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      await db.insert(events).values(batch);
    }

    return res.status(200).json({
      ok: true,
      imported: rows.length,
      source,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Events import error:', err);
    return res.status(500).json({
      ok: false,
      error: message,
    });
  }
}
