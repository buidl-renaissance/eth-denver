/**
 * One-off script to import events from scripts/ethdenver-events-data.tsv
 * Run: npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/import-events.ts
 * Or: yarn ts-node scripts/import-events.ts
 */
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';
config({ path: join(__dirname, '..', '.env.local') });
config({ path: join(__dirname, '..', '.env') });

import { getDb } from '../src/db/drizzle';
import { events } from '../src/db/schema';
import { parseCsvToRows, parseSheetRows } from '../src/lib/sheets';

async function main() {
  const dataPath = join(__dirname, 'ethdenver-events-data.tsv');
  const csvText = readFileSync(dataPath, 'utf8');
  const rows = await parseCsvToRows(csvText);
  const parsed = parseSheetRows(rows);
  console.log(`Parsed ${parsed.length} events`);

  const db = getDb();
  const now = new Date();

  const seen = new Set<string>();
  const rowsToInsert = parsed
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
  for (let i = 0; i < rowsToInsert.length; i += BATCH_SIZE) {
    const batch = rowsToInsert.slice(i, i + BATCH_SIZE);
    await db.insert(events).values(batch);
  }
  console.log(`Imported ${rowsToInsert.length} events to database`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
