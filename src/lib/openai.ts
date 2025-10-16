import { getConfig } from '../config';
import OpenAI from 'openai';

const cfg = getConfig();
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || undefined;

const client = new OpenAI({ apiKey: OPENAI_API_KEY });

export type ChatMessage = { role: string; content: string };

export type ChatChoice = { role?: string | null; content?: string | null };

export type ChatCompletionResult = {
  id?: string;
  model?: string;
  choices: ChatChoice[];
  raw?: any;
};

export async function createChatCompletion(messages: ChatMessage[], opts?: { model?: string }): Promise<ChatCompletionResult> {
  const model = opts?.model || cfg.OPENAI_MODEL || 'gpt-5-mini';
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set');

  const res = await client.chat.completions.create({
    model,
    messages: messages.map((m) => ({ role: m.role as any, content: m.content })),
  });

  const choices = (res.choices ?? []).map((c: any) => ({
    role: c.message?.role ?? null,
    content: c.message?.content ?? null,
  }));

  return { id: res.id, model: res.model, choices, raw: res };
}

