import type { NextApiRequest, NextApiResponse } from 'next';
import { createHash } from 'crypto';
import { getDb } from '@/db/drizzle';
import { events } from '@/db/schema';
import { fetchAndParseEvents } from '@/lib/sheets';

type ImportResponse = {
  ok: boolean;
  imported?: number;
  source?: string;
  error?: string;
  parseErrors?: string[];
};

/**
 * POST /api/events/import
 * Fetches the ETHDenver side events sheet (CSV or Google Sheets API) and upserts into the events table.
 * Set ETHDENVER_SHEETS_CSV_URL or GOOGLE_SHEETS_API_KEY in env.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ImportResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { events: parsed, source } = await fetchAndParseEvents();

    if (parsed.length === 0) {
      return res.status(200).json({
        ok: true,
        imported: 0,
        source,
        parseErrors: ['No event rows found in sheet.'],
      });
    }

    const db = getDb();
    const now = Math.floor(Date.now() / 1000);

    const rows = parsed.map((e) => {
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
    if (rows.length > 0) {
      await db.insert(events).values(rows);
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
