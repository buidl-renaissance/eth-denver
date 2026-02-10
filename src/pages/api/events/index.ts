import type { NextApiRequest, NextApiResponse } from 'next';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db/drizzle';
import { events } from '@/db/schema';

type EventRow = typeof events.$inferSelect;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ events: EventRow[] } | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = getDb();
    const { eventDate, limit, offset } = req.query;

    const limitNum = typeof limit === 'string' ? Math.min(parseInt(limit, 10) || 500, 500) : 500;
    const offsetNum = typeof offset === 'string' ? Math.max(0, parseInt(offset, 10) || 0) : 0;

    const baseQuery = db.select().from(events);
    const filteredQuery =
      typeof eventDate === 'string' && eventDate
        ? baseQuery.where(eq(events.eventDate, eventDate))
        : baseQuery;

    const rows = await filteredQuery
      .orderBy(events.eventDate, events.startTime)
      .limit(limitNum)
      .offset(offsetNum);

    const eventsList = rows.map((r) => ({
      id: r.id,
      eventDate: r.eventDate,
      startTime: r.startTime,
      endTime: r.endTime,
      eventName: r.eventName,
      organizer: r.organizer,
      venue: r.venue,
      registrationUrl: r.registrationUrl,
      notes: r.notes,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));

    return res.status(200).json({ events: eventsList });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Events list error:', err);
    return res.status(500).json({ error: message });
  }
}
