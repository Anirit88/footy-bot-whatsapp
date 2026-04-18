const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings';
const MODEL = 'voyage-3-lite';
const BATCH_SIZE = 128;

async function embed(inputs: string[], inputType: 'query' | 'document'): Promise<number[][]> {
  const response = await fetch(VOYAGE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({ model: MODEL, input: inputs, input_type: inputType }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Voyage AI error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return (data.data as { embedding: number[] }[]).map(d => d.embedding);
}

export async function getQueryEmbedding(text: string): Promise<number[]> {
  const [embedding] = await embed([text], 'query');
  return embedding;
}

export async function getDocumentEmbeddings(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const embeddings = await embed(batch, 'document');
    results.push(...embeddings);
  }
  return results;
}
