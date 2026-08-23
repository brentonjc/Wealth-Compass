// export-content.mjs — reads src/data/{copy,assessment}.json and writes the
// editable review sheets into content/csv/. Run:  node content/export-content.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { toCSV } from './csv-utils.mjs';
import {
  getPath, SHARED_COMPASS_KV, INDIVIDUAL_CTA_KV, SHARED_CTA_KV,
  COMPASS_COLUMNS, NAVIGATION_COLUMNS, CONVO_COLUMNS, KV_COLUMNS, SCORING_COLUMNS,
} from './schema.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'src', 'data');
const outDir = path.join(root, 'content', 'csv');
fs.mkdirSync(outDir, { recursive: true });

const copy = JSON.parse(fs.readFileSync(path.join(dataDir, 'copy.json'), 'utf8'));
const assessment = JSON.parse(fs.readFileSync(path.join(dataDir, 'assessment.json'), 'utf8'));
const src = { copy, assessment };

const write = (name, rows, cols) => {
  fs.writeFileSync(path.join(outDir, name), toCSV(rows, cols));
  console.log(`  ${name.padEnd(22)} ${rows.length} rows`);
};

// 1 · Compass
write('1-Compass.csv', assessment.compass.map((d) => {
  const n = copy.compassNarratives[d.id] || {};
  return { id: d.id, icon: d.icon, name: d.name, meaning: d.meaning, leads: n.leads, explore: n.explore, reflection: n.reflection, nextStep: n.nextStep };
}), COMPASS_COLUMNS);

// 2 · Navigation
write('2-Navigation.csv', assessment.navigation.map((d) => {
  const n = copy.navigationNarratives[d.id] || {};
  return { id: d.id, icon: d.icon, name: d.name, meaning: d.meaning, leads: n.leads, decide: n.decide, withOthers: n.withOthers };
}), NAVIGATION_COLUMNS);

// 3 · Shared Compass, 4 · Individual CTA, 5 · Shared CTA  (key/value sheets)
const kvRows = (defs) => defs.map((e) => ({ key: e.key, text: getPath(src[e.t], e.p) }));
write('3-SharedCompass.csv', kvRows(SHARED_COMPASS_KV), KV_COLUMNS);
write('4-IndividualCTA.csv', kvRows(INDIVIDUAL_CTA_KV), KV_COLUMNS);
write('5-SharedCTA.csv', kvRows(SHARED_CTA_KV), KV_COLUMNS);

// 6 · Conversation cards
const convoRows = [];
for (const [category, prompts] of Object.entries(copy.conversationCards || {})) {
  for (const prompt of prompts) convoRows.push({ category, prompt });
}
write('6-ConversationCards.csv', convoRows, CONVO_COLUMNS);

// 7 · Scoring
const scoringRows = [];
// Only the config values that scoring.js actually reads are exported. (singleTag /
// dualTagEach / multiPick describe how the source weights were authored but have no
// runtime effect — the real weights live per-option below — so they're left out.)
const cfg = (ref, weight) => scoringRows.push({ question: '_config', type: 'config', ref, label: '', dimension: '', weight });
const sc = assessment.scoring || {};
(sc.rankWeights || []).forEach((w, i) => cfg(`rankWeight${i + 1}`, w));
cfg('allocationScale', sc.allocationScale);
cfg('normalizeMin', (sc.normalizeRange || [])[0]);
cfg('normalizeMax', (sc.normalizeRange || [])[1]);

const pushWeights = (q, ref, label, weights) => {
  for (const [dimension, weight] of Object.entries(weights || {})) {
    scoringRows.push({ question: q.id, type: q.type, ref, label, dimension, weight });
  }
};
for (const q of assessment.questions) {
  (q.options || []).forEach((o, i) => pushWeights(q, `option:${i}`, o.label, o.weights));
  if (q.type === 'slider') {
    pushWeights(q, 'low', q.leftLabel, q.lowWeights);
    pushWeights(q, 'high', q.rightLabel, q.highWeights);
  }
  (q.items || []).forEach((it, i) => pushWeights(q, `item:${i}`, it.label, it.weights));
  (q.buckets || []).forEach((b, i) => scoringRows.push({ question: q.id, type: 'allocation', ref: `bucket:${i}`, label: b.label, dimension: b.dim, weight: b.default }));
}
write('7-Scoring.csv', scoringRows, SCORING_COLUMNS);

console.log('\nExported to content/csv/ — edit the sheets, then run: node content/import-content.mjs');
