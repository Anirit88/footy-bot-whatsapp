import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';
import { join } from 'path';

const systemPrompt = readFileSync(join(process.cwd(), 'AGENT_PROMPT.md'), 'utf-8');
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function askClaude(question: string, contextChunks: string[]): Promise<string> {
  const context =
    contextChunks.length > 0
      ? `\n\n## Retrieved Context from Rulebook\n\n${contextChunks.join('\n\n---\n\n')}`
      : '';

  const message = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 512,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `${question}${context}`,
      },
    ],
  });

  const block = message.content[0];
  if (block.type !== 'text') {
    throw new Error('Unexpected non-text response from Claude');
  }
  return block.text;
}
