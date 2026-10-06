// Checks that every literal t('key') used in the code exists in each messages/*.json,
// and that all locale files have the same keys.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const locales = readdirSync(join(root, 'messages')).filter((f) => f.endsWith('.json'));
const messages = Object.fromEntries(locales.map((f) => [f, JSON.parse(readFileSync(join(root, 'messages', f), 'utf8'))]));

function flatten(obj, prefix = '') {
  return Object.entries(obj).flatMap(([k, v]) => (v && typeof v === 'object' ? flatten(v, `${prefix}${k}.`) : [`${prefix}${k}`]));
}
const keySets = Object.fromEntries(Object.entries(messages).map(([f, m]) => [f, new Set(flatten(m))]));

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    if (['node_modules', '.next', 'tests', 'scripts', 'supabase', 'public'].includes(name)) return [];
    const p = join(dir, name);
    return statSync(p).isDirectory() ? files(p) : /\.(tsx?|mjs)$/.test(name) ? [p] : [];
  });
}

const problems = [];
for (const file of files(root)) {
  const src = readFileSync(file, 'utf8');
  const bindings = new Map();
  for (const m of src.matchAll(/(?:const|let)\s+(\w+)\s*=\s*(?:await\s+)?(?:getTranslations|useTranslations)\(\s*'([\w.]+)'\s*\)/g)) bindings.set(m[1], m[2]);
  for (const [name, ns] of bindings) {
    const re = new RegExp(`\\b${name}(?:\\.has)?\\(\\s*'([\\w.]+)'`, 'g');
    for (const m of src.matchAll(re)) {
      if (src.slice(m.index - 1, m.index) === '.') continue;
      const key = `${ns}.${m[1]}`;
      for (const [loc, set] of Object.entries(keySets)) if (!set.has(key)) problems.push(`${file.replace(root, '')}: ${key} missing in ${loc}`);
    }
  }
}
const [first, ...rest] = Object.keys(keySets);
for (const other of rest) {
  for (const k of keySets[first]) if (!keySets[other].has(k)) problems.push(`${k} missing in ${other}`);
  for (const k of keySets[other]) if (!keySets[first].has(k)) problems.push(`${k} missing in ${first}`);
}
if (problems.length) {
  console.error([...new Set(problems)].join('\n'));
  process.exit(1);
}
console.log(`i18n OK: ${keySets[first].size} keys, ${locales.length} locales`);
