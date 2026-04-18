import { NextRequest, NextResponse } from 'next/server';
import pdfParse from 'pdf-parse';
import { chunkText } from '@/lib/chunker';
import { getSupabaseServer } from '@/lib/supabase-server';

export const maxDuration = 60;

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
  if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 });
  }

  const filename = file.name;
  const buffer = Buffer.from(await file.arrayBuffer());
  const supabase = getSupabaseServer();

  // 1. Ensure storage bucket exists
  await supabase.storage.createBucket('documents', {
    public: false,
    fileSizeLimit: 52428800,
  });
  // createBucket errors if bucket already exists — that's fine, ignore it

  // 2. Upload PDF to Supabase Storage (always happens first)
  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(filename, buffer, { contentType: 'application/pdf', upsert: true });

  if (uploadError) {
    console.error('[ingest] Storage upload failed:', uploadError);
    return NextResponse.json({ error: 'Failed to store file in Supabase Storage' }, { status: 500 });
  }

  // 3. Parse PDF text + chunk
  let chunksIngested = 0;
  let indexed = false;

  try {
    const parsed = await pdfParse(buffer);
    const chunks = chunkText(parsed.text);

    if (chunks.length === 0) {
      return NextResponse.json({ success: true, filename, chunksIngested: 0, indexed: false, message: 'File stored. No extractable text found in PDF.' });
    }

    // 4. Embed chunks if VOYAGE_API_KEY is set
    type ChunkRow = { source: string; content: string; embedding: number[] | null };
    let rows: ChunkRow[];

    if (process.env.VOYAGE_API_KEY) {
      try {
        const { getDocumentEmbeddings } = await import('@/lib/voyage');
        const embeddings = await getDocumentEmbeddings(chunks);
        rows = chunks.map((content, i) => ({ source: filename, content, embedding: embeddings[i] }));
        indexed = true;
      } catch (err) {
        console.error('[ingest] Voyage embedding failed, storing text-only:', err);
        rows = chunks.map(content => ({ source: filename, content, embedding: null }));
      }
    } else {
      rows = chunks.map(content => ({ source: filename, content, embedding: null }));
    }

    // 5. Remove old chunks for this file, insert fresh
    await supabase.from('chunks').delete().eq('source', filename);
    const { error: dbError } = await supabase.from('chunks').insert(rows);

    if (dbError) {
      console.error('[ingest] Chunk insert failed:', dbError);
      // File is in Storage — return partial success
      return NextResponse.json({ success: true, filename, chunksIngested: 0, indexed: false, message: 'File stored. Text indexing failed — check that supabase/schema.sql has been run.' });
    }

    chunksIngested = chunks.length;
  } catch (err) {
    console.error('[ingest] PDF processing error:', err);
    // File is stored, just not indexed
    return NextResponse.json({ success: true, filename, chunksIngested: 0, indexed: false, message: 'File stored. Could not extract text from PDF.' });
  }

  return NextResponse.json({ success: true, filename, chunksIngested, indexed });
}
