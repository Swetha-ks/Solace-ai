const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

export function hasGroqKey() {
  return Boolean(process.env.GROQ_API_KEY);
}

/**
 * Calls Groq's OpenAI-compatible chat completions endpoint and returns the
 * assistant message content as a string.
 */
export async function chatCompletion({
  messages,
  temperature = 0.7,
  maxTokens = 900,
  json = true,
}) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured');
  }

  const basePayload = { model: MODEL, messages, temperature, max_tokens: maxTokens };

  const call = (payload) =>
    fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

  const jsonPayload = json
    ? { ...basePayload, response_format: { type: 'json_object' } }
    : basePayload;

  let response = await call(jsonPayload);

  // Some models reject response_format; retry once without it and let the
  // prompt's JSON instruction carry the structure.
  if (!response.ok && response.status === 400 && json) {
    response = await call(basePayload);
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Groq request failed (${response.status}): ${body}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content ?? '';
}

/** Extract a JSON object from a model reply that may contain markdown fences. */
export function parseJsonReply(raw) {
  if (!raw) return null;
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}
