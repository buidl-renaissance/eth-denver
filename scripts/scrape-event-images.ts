/**
 * Scrape Open Graph og:image from event registration URLs and store in imageUrl.
 * Run: yarn db:scrape-event-images
 */
import { join } from 'path';
import { config } from 'dotenv';
config({ path: join(__dirname, '..', '.env.local') });
config({ path: join(__dirname, '..', '.env') });

import { eq, isNotNull } from 'drizzle-orm';
import { getDb } from '../src/db/drizzle';
import { events } from '../src/db/schema';

const OG_IMAGE_REGEX = /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']|content=["']([^"']+)["'][^>]+property=["']og:image["']/i;

function extractOgImage(html: string): string | null {
  const match = html.match(OG_IMAGE_REGEX);
  if (!match) return null;
  return (match[1] || match[2] || '').trim() || null;
}

async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ETHDenverEventScraper/1.0)' },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const imageUrl = extractOgImage(html);
    if (imageUrl && !imageUrl.startsWith('http')) {
      return new URL(imageUrl, url).href;
    }
    return imageUrl;
  } catch {
    return null;
  }
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const db = getDb();
  const rows = await db
    .select({ id: events.id, registrationUrl: events.registrationUrl })
    .from(events)
    .where(isNotNull(events.registrationUrl));

  const withUrl = rows.filter((r) => r.registrationUrl && r.registrationUrl.startsWith('http'));
  console.log(`Found ${withUrl.length} events with registration URLs`);

  let updated = 0;
  for (let i = 0; i < withUrl.length; i++) {
    const row = withUrl[i];
    const url = row.registrationUrl!;
    process.stdout.write(`[${i + 1}/${withUrl.length}] ${row.id}... `);
    const imageUrl = await fetchOgImage(url);
    if (imageUrl) {
      await db.update(events).set({ imageUrl }).where(eq(events.id, row.id));
      console.log(imageUrl.slice(0, 60) + (imageUrl.length > 60 ? '...' : ''));
      updated++;
    } else {
      console.log('(no og:image)');
    }
    await sleep(500);
  }

  console.log(`\nDone. Updated ${updated} events with imageUrl.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
