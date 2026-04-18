import { NextRequest, NextResponse } from 'next/server';
import pdfParse from 'pdf-parse';
import { chunkText } from '@/lib/chunker';
import { getDocumentEmbeddings } from '@/lib/voyage';
import { getSupabaseServer } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  let file: File | null = null;
  try {
    const formData = await request.formData();
    file = formData.get('file') as File | null;
  } catch {
    return NextResponse.json({ error: 'Failed to parse form data' }, { status: 400 });
  }

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 });
  }

  const filename = file.name;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await pdfParse(buffer);
    const chunks = chunkText(parsed.text);

    if (chunks.length === 0) {
      return NextResponse.json({ error: 'No text content found in PDF' }, { status: 400 });
    }

    const embeddings = await getDocumentEmbeddings(chunks);

    const rows = chunks.map((content, i) => ({
      source: filename,
      content,
      embedding: embeddings[i],
    }));

    const supabase = getSupabaseServer();
    const { error } = await supabase.from('chunks').insert(rows);

    if (error) {
      console.error('[ingest] Supabase insert failed:', error);
      return NextResponse.json({ error: 'Database insert failed' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      filename,
      chunksIngested: chunks.length,
    });
  } catch (err) {
    console.error('[ingest] Error processing PDF:', err);
    return NextResponse.json({ error: 'Failed to process PDF' }, { status: 500 });
  }
}
