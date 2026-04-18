import { NextRequest, NextResponse } from 'next/server';
import { getQueryEmbedding } from '@/lib/voyage';
import { askClaude } from '@/lib/anthropic';
import { sendWhatsAppReply } from '@/lib/twilio';
import { getSupabaseServer } from '@/lib/supabase-server';

const EMPTY_TWIML =
  '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';

export async function GET() {
  console.log('[webhook] GET verification request');
  return new NextResponse('Webhook verified', { status: 200 });
}

export async function POST(request: NextRequest) {
  console.log('[webhook] POST received');

  const formData = await request.formData();
  const rawBody = (formData.get('Body') as string | null) ?? '';
  const from = (formData.get('From') as string | null) ?? '';
  const to = (formData.get('To') as string | null) ?? '';

  const bodyLower = rawBody.toLowerCase().trim();
  const isTriggered =
    bodyLower.startsWith('@referee') || bodyLower.startsWith('/ask');

  if (!isTriggered) {
    return new NextResponse(EMPTY_TWIML, {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  }

  const question = rawBody
    .replace(/^@referee\s*/i, '')
    .replace(/^\/ask\s*/i, '')
    .trim();

  const supabase = getSupabaseServer();

  try {
    let embedding: number[];
    try {
      embedding = await getQueryEmbedding(question);
    } catch (err) {
      console.error('[webhook] Voyage AI embedding failed:', err);
      throw err;
    }

    let contextChunks: string[] = [];
    try {
      const { data: chunks, error: rpcError } = await supabase.rpc('match_chunks', {
        query_embedding: embedding,
        match_count: 5,
      });
      if (rpcError) throw new Error(rpcError.message);
      contextChunks = ((chunks ?? []) as { content: string }[]).map(c => c.content);
    } catch (err) {
      console.error('[webhook] Supabase match_chunks RPC failed:', err);
      // Continue with empty context rather than failing completely
    }

    let answer: string;
    try {
      answer = await askClaude(question, contextChunks);
    } catch (err) {
      console.error('[webhook] Claude API call failed:', err);
      throw err;
    }

    try {
      await sendWhatsAppReply(from, answer);
    } catch (err) {
      console.error('[webhook] Twilio send failed:', err);
      throw err;
    }

    try {
      await supabase.from('logs').insert({
        question,
        answer,
        referee_num: from,
        group_name: to,
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[webhook] Supabase log insert failed:', err);
    }

    return new NextResponse(EMPTY_TWIML, {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (err) {
    console.error('[webhook] Pipeline error:', err);
    return new NextResponse(EMPTY_TWIML, {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}
