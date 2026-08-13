import { NextResponse } from 'next/server';

import { resetToSeed, storageMode } from '@/lib/store';

/**
 * Reset every engagement back to the seed so the demo can be re-run. Open by design — this is a
 * demo build with no multi-tenancy, and the reset is part of the demo script. It would not exist
 * in a real deployment.
 */
export async function POST() {
  const db = resetToSeed();
  return NextResponse.json({
    ok: true,
    storageMode: storageMode(),
    counts: {
      opportunities: db.opportunities.length,
      initiatives: db.initiatives.length,
      publishedSnapshots: db.publishedSnapshots.length,
      clientSubmissions: db.clientSubmissions.length,
      aiSuggestions: db.aiSuggestions.length,
    },
  });
}
