// import-content.mjs — reads the edited sheets in content/csv/ and merges them
// back into src/data/{copy,assessment}.json. Only fields present in the CSVs are
// touched; everything else in the JSON is left exactly as-is. Run:
//   node content/import-content.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fromCSV } from './csv-utils.mjs';
import {
  setPath, SHARED_COMPASS_KV, INDIVIDUAL_CTA_KV, SHARED_CTA_KV,
} from './schema.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'src', 'data');
const csvDir = path.join(root, 'content', 'csv');

const copy = JSON.parse(fs.readFileSync(path.join(dataDir, 'copy.json'), 'utf8'));
const assessment = JSON.parse(fs.readFileSync(path.join(dataDir, 'assessment.json'), 'utf8'));
const target = { copy, assessment };

const read = (name) => {
  const p = path.join(csvDir, name);
  if (!fs.existsSync(p)) { console.warn(`  (skipped, not found) ${name}`); return null; }
  return fromCSV(fs.readFileSync(p, 'utf8'));
};
let badNumbers = 0;
// Parse a numeric cell. Blank -> undefined (skip). A non-numeric value warns and is
// skipped rather than writing NaN/null, which would silently corrupt scoring.
const num = (v, where) => {
  if (v === '' || v == null) return undefined;
  const n = Number(v);
  if (Number.isNaN(n)) { console.warn(`  ⚠ "${v}" is not a number${where ? ` (${where})` : ''} — left unchanged`); badNumbers++; return undefined; }
  return n;
};

// --- 1 · Compass
const compass = read('1-Compass.csv');
if (compass) for (const r of compass) {
  const dim = assessment.compass.find((d) => d.id === r.id);
  if (dim) { if (r.icon) dim.icon = r.icon; if (r.name) dim.name = r.name; if (r.meaning) dim.meaning = r.meaning; }
  copy.compassNarratives[r.id] = { leads: r.leads, explore: r.explore, reflection: r.reflection, nextStep: r.nextStep };
}

// --- 2 · Navigation
const nav = read('2-Navigation.csv');
if (nav) for (const r of nav) {
  const dim = assessment.navigation.find((d) => d.id === r.id);
  if (dim) { if (r.icon) dim.icon = r.icon; if (r.name) dim.name = r.name; if (r.meaning) dim.meaning = r.meaning; }
  copy.navigationNarratives[r.id] = { leads: r.leads, decide: r.decide, withOthers: r.withOthers };
}

// --- 3 / 4 / 5 · key-value sheets
const applyKV = (rows, defs) => {
  if (!rows) return;
  const byKey = new Map(defs.map((d) => [d.key, d]));
  for (const r of rows) {
    const def = byKey.get(r.key);
    if (!def) { console.warn(`  (unknown key ignored) ${r.key}`); continue; }
    if (def.num) { const n = num(r.text, def.key); if (n !== undefined) setPath(target[def.t], def.p, n); }
    else setPath(target[def.t], def.p, r.text);
  }
};
applyKV(read('3-SharedCompass.csv'), SHARED_COMPASS_KV);
applyKV(read('4-IndividualCTA.csv'), INDIVIDUAL_CTA_KV);
applyKV(read('5-SharedCTA.csv'), SHARED_CTA_KV);

// --- 6 · Conversation cards (rebuilt from the sheet, preserving first-seen order)
const convo = read('6-ConversationCards.csv');
if (convo) {
  const cards = {};
  for (const r of convo) { (cards[r.category] ??= []).push(r.prompt); }
  if (Object.keys(cards).length) copy.conversationCards = cards;
}

// --- 7 · Scoring
const scoring = read('7-Scoring.csv');
if (scoring) {
  const rank = [];
  const grouped = new Map(); // `${qid}|${ref}` -> { q, ref, weights:{} } for weight-bearing refs
  for (const r of scoring) {
    if (r.question === '_config') {
      const w = num(r.weight, r.ref);
      if (w === undefined) continue;
      if (r.ref === 'normalizeMin') { assessment.scoring.normalizeRange = assessment.scoring.normalizeRange || [30, 95]; assessment.scoring.normalizeRange[0] = w; }
      else if (r.ref === 'normalizeMax') { assessment.scoring.normalizeRange = assessment.scoring.normalizeRange || [30, 95]; assessment.scoring.normalizeRange[1] = w; }
      else if (/^rankWeight(\d)$/.test(r.ref)) { rank[Number(r.ref.match(/^rankWeight(\d)$/)[1]) - 1] = w; }
      else assessment.scoring[r.ref] = w;
      continue;
    }
    const q = assessment.questions.find((x) => x.id === r.question);
    if (!q) { console.warn(`  (unknown question ignored) ${r.question}`); continue; }
    if (r.ref.startsWith('bucket:')) {
      const i = Number(r.ref.split(':')[1]);
      const d = num(r.weight, `${r.question} ${r.ref}`);
      if (q.buckets?.[i]) { if (d !== undefined) q.buckets[i].default = d; if (r.dimension) q.buckets[i].dim = r.dimension; }
      continue;
    }
    const key = `${r.question}|${r.ref}`;
    if (!grouped.has(key)) grouped.set(key, { q, ref: r.ref, weights: {} });
    if (r.dimension && r.weight !== '') {
      const w = num(r.weight, `${r.question} ${r.ref} ${r.dimension}`);
      if (w !== undefined) grouped.get(key).weights[r.dimension] = w;
    }
  }
  if (rank.length) assessment.scoring.rankWeights = rank;
  // rebuild each addressed weights object from its rows (lets you add/remove dims)
  for (const { q, ref, weights } of grouped.values()) {
    if (ref === 'low') q.lowWeights = weights;
    else if (ref === 'high') q.highWeights = weights;
    else if (ref.startsWith('option:')) { const i = Number(ref.split(':')[1]); if (q.options?.[i]) q.options[i].weights = weights; }
    else if (ref.startsWith('item:')) { const i = Number(ref.split(':')[1]); if (q.items?.[i]) q.items[i].weights = weights; }
  }
}

fs.writeFileSync(path.join(dataDir, 'copy.json'), JSON.stringify(copy, null, 2) + '\n');
fs.writeFileSync(path.join(dataDir, 'assessment.json'), JSON.stringify(assessment, null, 2) + '\n');
if (badNumbers) console.warn(`\n⚠ ${badNumbers} cell(s) weren't valid numbers and were left unchanged — fix them in the sheet and re-run if needed.`);
console.log('Imported. Updated src/data/copy.json and src/data/assessment.json — reload the app to see changes.');
