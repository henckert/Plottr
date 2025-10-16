import { getConfig } from '../config';
import fetch from 'node-fetch';

const cfg = getConfig();
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || null;

if (!OPENAI_API_KEY) {
  // We'll allow the app to run without a key for now; calls will fail at runtime.
}

export async function createChatCompletion(messages: Array<{ role: string; content: string }>, opts?: { model?: string }) {
  const model = opts?.model || cfg.OPENAI_MODEL || 'gpt-5-mini';
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model, messages }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`OpenAI API error: ${res.status} ${txt}`);
  }

  return res.json();
}
