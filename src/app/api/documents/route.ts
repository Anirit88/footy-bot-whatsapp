import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';

export async function GET() {
  const supabase = getSupabaseServer();

  // Fetch all chunks (just source + created_at) using service role (bypasses RLS)
  const { data, error } = await supabase
    .from('chunks')
    .select('source, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[documents] Failed to fetch chunks:', error);
    return NextResponse.json({ error: 'Failed to load documents' }, { status: 500 });
  }

  // Group by source: count chunks and find earliest created_at per file
  const map = new Map<string, { chunks: number; ingested_at: string }>();
  for (const row of (data ?? []) as { source: string; created_at: string }[]) {
    const existing = map.get(row.source);
    map.set(row.source, {
      chunks: (existing?.chunks ?? 0) + 1,
      ingested_at: existing?.ingested_at ?? row.created_at,
    });
  }

  const docs = [...map.entries()]
    .map(([source, meta]) => ({ source, chunks: meta.chunks, ingested_at: meta.ingested_at }))
    .sort((a, b) => b.ingested_at.localeCompare(a.ingested_at));

  return NextResponse.json({ docs });
}
