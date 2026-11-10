import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const envFile = path.join(ROOT, 'server', '.env');
const envText = fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf8') : '';
const keyMatch = envText.match(/^\s*GROQ_API_KEY\s*=\s*(.+?)\s*$/m);
const KEY = (keyMatch?.[1] || process.env.GROQ_API_KEY || '')
  .replace(/^['"]|['"]$/g, '')
  .trim();
if (!KEY) {
  console.error('GROQ_API_KEY not found');
  process.exit(1);
}

const MODEL = 'openai/gpt-oss-120b';
const URL = 'https://api.groq.com/openai/v1/chat/completions';

const LANGS = [
  { code: 'hi', name: 'Hindi', script: 'Devanagari' },
  { code: 'kn', name: 'Kannada', script: 'Kannada' },
  { code: 'ta', name: 'Tamil', script: 'Tamil' },
  { code: 'es', name: 'Spanish', script: 'Latin' },
];

const SKIP = new Set(['SOLACE', 'Solace', 'OK', 'AI', 'Groq']);

const normalize = (text) => String(text).replace(/\s+/g, ' ').trim();

const strings = JSON.parse(fs.readFileSync('scripts/strings.json', 'utf8'))
  .map(normalize)
  .filter((s) => s && !SKIP.has(s) && /[A-Za-z]/.test(s));

const OUT_FILE = 'scripts/translations.json';
const existing = fs.existsSync(OUT_FILE)
  ? JSON.parse(fs.readFileSync(OUT_FILE, 'utf8'))
  : {};
const done = existing;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function chunks(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

async function ask(lang, batch, attempt = 0) {
  const payload = {
    model: MODEL,
    temperature: 0.2,
    max_tokens: 4000,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: [
          'You localize user interface copy for a calm, gentle mental-wellbeing app.',
          `Translate each English UI string into ${lang.name} (${lang.script} script).`,
          'Rules:',
          '- Keep the same warm, quiet, second-person tone and the same brevity.',
          '- Never add emojis. Keep punctuation style similar.',
          '- Leave "Solace" as-is. Leave placeholders like {name} or %s unchanged.',
          '- Keep UI labels short, the way a native app would show them.',
          '- Translate sentence fragments consistently so the same English phrase always gets the same translation.',
          'Return only a JSON object: {"translations": {"<english>": "<translation>"}} with every input key present.',
        ].join('\n'),
      },
      {
        role: 'user',
        content: JSON.stringify({ strings: batch }),
      },
    ],
  };

  let response;
  try {
    response = await fetch(URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${KEY}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    if (attempt < 4) {
      await sleep(2000 * (attempt + 1));
      return ask(lang, batch, attempt + 1);
    }
    throw e;
  }

  if (!response.ok) {
    const body = await response.text();
    if ((response.status === 429 || response.status >= 500) && attempt < 5) {
      const wait = 4000 * (attempt + 1);
      console.log(`  ${lang.code} ${response.status}, retrying in ${wait}ms`);
      await sleep(wait);
      return ask(lang, batch, attempt + 1);
    }
    throw new Error(`Groq ${response.status}: ${body.slice(0, 300)}`);
  }

  const data = await response.json();
  const raw = data?.choices?.[0]?.message?.content || '';
  const cleaned = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    parsed = start >= 0 && end > start ? JSON.parse(cleaned.slice(start, end + 1)) : null;
  }
  const map = parsed?.translations || parsed || {};
  const result = {};
  const missing = [];
  for (const source of batch) {
    const value = map[source];
    if (typeof value === 'string' && value.trim()) result[source] = value.trim();
    else missing.push(source);
  }
  return { result, missing };
}

const batchSize = 24;

for (const lang of LANGS) {
  done[lang.code] = done[lang.code] || {};
  const todo = strings.filter((s) => !done[lang.code][s]);
  console.log(`${lang.code}: ${todo.length} strings to translate`);

  for (const [index, batch] of chunks(todo, batchSize).entries()) {
    process.stdout.write(`  batch ${index + 1}/${Math.ceil(todo.length / batchSize)} `);
    try {
      let { result, missing } = await ask(lang, batch);
      Object.assign(done[lang.code], result);
      if (missing.length) {
        console.log(`(${missing.length} missing, retrying)`);
        for (const single of missing) {
          try {
            const retry = await ask(lang, [single]);
            Object.assign(done[lang.code], retry.result);
          } catch (e) {
            console.log(`   skip: ${single}`);
          }
        }
      } else {
        console.log('ok');
      }
    } catch (e) {
      console.log(`failed: ${e.message}`);
    }
    fs.writeFileSync(OUT_FILE, JSON.stringify(done, null, 2));
    await sleep(600);
  }
}

// Report coverage.
for (const lang of LANGS) {
  const have = Object.keys(done[lang.code] || {}).length;
  console.log(`${lang.code}: ${have}/${strings.length} translated`);
}

// Build the app dictionary.
const body = {};
for (const lang of LANGS) {
  body[lang.code] = done[lang.code] || {};
}
const file = `// Auto-generated by scripts/translate.mjs. Do not edit by hand.\nconst PHRASES = ${JSON.stringify(
  body,
  null,
  2
)};\n\nexport default PHRASES;\n`;
fs.writeFileSync('src/lib/phrases.js', file);
console.log('wrote src/lib/phrases.js');
