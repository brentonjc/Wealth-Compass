// scoring.js — turns raw answers into 8 Compass + 5 Navigation scores.
// Pure functions, no DOM. Answer shapes produced by app.js:
//   single     -> optionIndex (number)
//   slider     -> value 0..100 (number)
//   allocation -> { dim: amount, ... } summing to question.total
//   ranking    -> [itemIndex, itemIndex, itemIndex]  (top-first)
//   multi      -> [optionIndex, ...]

const COMPASS_IDS = ['security', 'freedom', 'growth', 'experiences', 'connection', 'purpose', 'legacy', 'balance'];
const NAV_IDS = ['structured', 'adaptive', 'reflective', 'collaborative', 'intuitive'];

function zero(ids) {
  return ids.reduce((acc, id) => ((acc[id] = 0), acc), {});
}

function addWeights(target, weights, factor = 1) {
  if (!weights) return;
  for (const [dim, w] of Object.entries(weights)) {
    if (dim in target) target[dim] += w * factor;
  }
}

// Accumulate a single question's answer into the raw compass/nav totals.
function accumulate(raw, question, answer, scoring) {
  if (answer == null) return;

  switch (question.type) {
    case 'single': {
      const opt = question.options[answer];
      if (opt) addWeights(raw, opt.weights);
      break;
    }
    case 'multi': {
      (answer || []).forEach((i) => addWeights(raw, question.options[i]?.weights));
      break;
    }
    case 'slider': {
      const t = Math.min(1, Math.max(0, answer / 100));
      addWeights(raw, question.lowWeights, 1 - t);
      addWeights(raw, question.highWeights, t);
      break;
    }
    case 'ranking': {
      const rw = scoring.rankWeights || [3, 2, 1];
      (answer || []).forEach((itemIndex, rank) => {
        addWeights(raw, question.items[itemIndex]?.weights, rw[rank] ?? 0);
      });
      break;
    }
    case 'allocation': {
      const scale = scoring.allocationScale || 8;
      const total = question.total || 1;
      for (const bucket of question.buckets) {
        const amount = answer[bucket.dim] || 0;
        addWeights(raw, { [bucket.dim]: 1 }, (amount / total) * scale);
      }
      break;
    }
  }
}

// Min-max scale a set of raw scores into [lo, hi]. If everything is equal,
// return the midpoint so the radar reads as a balanced ring rather than empty.
function normalize(raw, ids, [lo, hi]) {
  const vals = ids.map((id) => raw[id]);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const out = {};
  for (const id of ids) {
    out[id] = max === min ? Math.round((lo + hi) / 2) : Math.round(lo + ((raw[id] - min) / (max - min)) * (hi - lo));
  }
  return out;
}

// Public: score a full answers map { qid: answer } against the assessment.
export function scoreAssessment(assessment, answers) {
  const scoring = assessment.scoring || {};
  const range = scoring.normalizeRange || [30, 95];

  const compassRaw = zero(COMPASS_IDS);
  const navRaw = zero(NAV_IDS);

  for (const q of assessment.questions) {
    const target = q.type === 'slider'
      ? (q.lowWeights && Object.keys(q.lowWeights).some((d) => NAV_IDS.includes(d)) ? navRaw : compassRaw)
      : null; // sliders can hit either framework; single/multi/etc. hit both harmlessly
    if (target) {
      accumulate(target, q, answers[q.id], scoring);
    } else {
      // weights only ever name ids from one framework, so applying to both is safe
      accumulate(compassRaw, q, answers[q.id], scoring);
      accumulate(navRaw, q, answers[q.id], scoring);
    }
  }

  const compass = normalize(compassRaw, COMPASS_IDS, range);
  const navigation = normalize(navRaw, NAV_IDS, range);

  return {
    compass,
    navigation,
    compassRaw,
    navRaw,
    compassRanked: rankDims(compass, COMPASS_IDS),
    navRanked: rankDims(navigation, NAV_IDS),
  };
}

// Return ids sorted high -> low, ties broken by raw framework order.
function rankDims(scores, ids) {
  return [...ids].sort((a, b) => scores[b] - scores[a]);
}

export { COMPASS_IDS, NAV_IDS };
