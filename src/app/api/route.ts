import { NextRequest, NextResponse } from 'next/server';
import { getQueryEmbedding } from '@/lib/voyage';
import { askClaude } from '@/lib/anthropic';
import { getSupabaseServer } from '@/lib/supabase-server';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const question: string = body.question?.trim() ?? '';

  if (!question) {
    return NextResponse.json({ error: 'Question is required' }, { status: 400 });
  }

  try {
    const embedding = await getQueryEmbedding(question);

    const supabase = getSupabaseServer();
    const { data: chunks, error: rpcError } = await supabase.rpc('match_chunks', {
      query_embedding: embedding,
      match_count: 5,
    });
    if (rpcError) console.error('[chat] match_chunks error:', rpcError);

    const contextChunks = ((chunks ?? []) as { content: string }[]).map(c => c.content);
    const answer = await askClaude(question, contextChunks);

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
