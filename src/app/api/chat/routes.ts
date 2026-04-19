import { NextRequest, NextResponse } from 'next/server';
import { askClaude } from '@/lib/anthropic'; 
import { getSupabaseServer } from '@/lib/supabase-server';

export const maxDuration = 60;

async function getContextChunks(question: string): Promise<string[]> {
  const supabase = getSupabaseServer();

  if (process.env.VOYAGE_API_KEY) {
    try {
      const { getQueryEmbedding } = await import('@/lib/voyage');
      const embedding = await getQueryEmbedding(question);
      const { data, error } = await supabase.rpc('match_chunks', {
        query_embedding: embedding,
        match_count: 5,
      });
      if (!error && data && data.length > 0) {
        return (data as { content: string }[]).map(c => c.content);
      }
    } catch (err) {
      console.error('[chat] Vector search failed, falling back to text search:', err);
    }
  }

  // Text-search fallback: keyword ILIKE on chunks table
  const keywords = question
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 3)
    .slice(0, 3);

  if (keywords.length === 0) return [];

  const { data } = await supabase
    .from('chunks')
    .select('content')
    .or(keywords.map(k => `content.ilike.%${k}%`).join(','))
    .limit(5);

  return (data ?? []).map((r: { content: string }) => r.content);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const question: string = body.question?.trim() ?? '';

  if (!question) {
    return NextResponse.json({ error: 'Question is required' }, { status: 400 });
  }

  try {
    const contextChunks = await getContextChunks(question);
    const answer = await askClaude(question, contextChunks);

    const supabase = getSupabaseServer();
    await supabase.from('logs').insert({
      question,
      answer,
      referee_num: 'ops-dashboard',
      group_name: 'direct-chat',
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({ answer });
  } catch (err) {
    console.error('[chat] error:', err);
    return NextResponse.json({ error: 'Failed to get answer' }, { status: 500 });
  }
}
