import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';
import pdfParse from 'pdf-parse';
import { chunkText } from '../src/lib/chunker';
import { getDocumentEmbeddings } from '../src/lib/voyage';

const DOCS_DIR = join(process.cwd(), 'docs');

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

async function ingestFile(filepath: string, filename: string) {
  console.log(`\nProcessing: ${filename}`);

  const buffer = readFileSync(filepath);
  const parsed = await pdfParse(buffer);
  const chunks = chunkText(parsed.text);

  console.log(`  → ${chunks.length} chunks`);

  if (chunks.length === 0) {
    console.log('  ⚠ No text content found, skipping');
    return 0;
  }

  const embeddings = await getDocumentEmbeddings(chunks);

  const rows = chunks.map((content, i) => ({
    source: filename,
    content,
    embedding: embeddings[i],
  }));

  const supabase = getSupabase();
  const { error } = await supabase.from('chunks').insert(rows);

  if (error) {
    throw new Error(`Supabase insert failed for ${filename}: ${error.message}`);
  }

  console.log(`  ✓ ${filename} → ${chunks.length} chunks ingested`);
  return chunks.length;
}

async function main() {
  let files: string[];
  try {
    files = readdirSync(DOCS_DIR).filter(f => f.toLowerCase().endsWith('.pdf'));
  } catch {
    console.error(`docs/ directory not found at ${DOCS_DIR}. Create it and add PDF files.`);
    process.exit(1);
  }

  if (files.length === 0) {
    console.log('No PDF files found in docs/. Add rulebook PDFs and re-run.');
    process.exit(0);
  }

  console.log(`Found ${files.length} PDF file(s) in docs/`);

  let totalChunks = 0;
  for (const filename of files) {
    try {
      const count = await ingestFile(join(DOCS_DIR, filename), filename);
      totalChunks += count;
    } catch (err) {
      console.error(`  ✗ Failed to ingest ${filename}:`, err);
    }
  }

  console.log(`\nDone. Total chunks ingested: ${totalChunks}`);
}

main();
