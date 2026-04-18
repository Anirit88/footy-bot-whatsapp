const CHUNK_SIZE = 1000;
const OVERLAP = 150;

export function chunkText(text: string): string[] {
  const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = '';

  for (const para of paragraphs) {
    if (para.length > CHUNK_SIZE) {
      // Flush current buffer first
      if (current.trim()) {
        chunks.push(current.trim());
        current = '';
      }
      // Hard-split the oversized paragraph
      let i = 0;
      while (i < para.length) {
        const slice = para.slice(i, i + CHUNK_SIZE);
        chunks.push(slice.trim());
        i += CHUNK_SIZE - OVERLAP;
      }
    } else if ((current + '\n\n' + para).length > CHUNK_SIZE) {
      if (current.trim()) chunks.push(current.trim());
      // Carry overlap from the end of the previous chunk
      const words = current.trim().split(' ');
      const overlapWords = words.slice(Math.max(0, words.length - 30)).join(' ');
      current = overlapWords + '\n\n' + para;
    } else {
      current = current ? current + '\n\n' + para : para;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks;
}
