import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';
import { join } from 'path';

const FALLBACK_PROMPT = `You are the official NY Footy referee assistant bot.

Your job is to answer questions from referees about NY Footy league rules, procedures, and the referee handbook. You only answer based on the official NY Footy documents provided to you as context. Do not make up rules or procedures that are not in the documents.

RESPONSE RULES:
- Always cite which document your answer comes from (e.g. "According to the Referee Handbook, section 4...")
- Use numbered steps when explaining a procedure (e.g. yellow card procedure, injury protocol)
- Keep answers concise — referees are often on or near a pitch and need quick, clear answers
- If the answer is not found in the provided context, respond with exactly: "This question isn't covered in the documents I have access to. Please contact the NY Footy operations team directly for clarification."
- Never guess, infer, or use general football knowledge that isn't in the provided documents
- If a question is not about NY Footy rules or referee procedures, respond: "I'm the NY Footy referee rules assistant. I can only help with questions about NY Footy rules and referee procedures."

TRIGGER AWARENESS:
- Referees activate you by starting messages with @referee or /ask
- You will receive only the question text with the trigger word already stripped

TONE: Professional, clear, and helpful. Referees trust you to give them accurate official guidance.`;

let cachedPrompt: string | null = null;

function getSystemPrompt(): string {
  if (cachedPrompt) return cachedPrompt;
  try {
    cachedPrompt = readFileSync(join(process.cwd(), 'AGENT_PROMPT.md'), 'utf-8');
  } catch {
    console.warn('[anthropic] AGENT_PROMPT.md not found, using built-in fallback');
    cachedPrompt = FALLBACK_PROMPT;
  }
  return cachedPrompt;
}

export async function askClaude(question: string, contextChunks: string[]): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const context =
    contextChunks.length > 0
      ? `\n\n## Retrieved Context from Rulebook\n\n${contextChunks.join('\n\n---\n\n')}`
      : '';

  const message = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 512,
    system: getSystemPrompt(),
    messages: [{ role: 'user', content: `${question}${context}` }],
  });

  const block = message.content[0];
  if (block.type !== 'text') throw new Error('Unexpected non-text response from Claude');
  return block.text;
}
