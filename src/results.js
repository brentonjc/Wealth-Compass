// results.js — turns scores into the narrative content shown on the result
// screens and in the PDFs. Pure: takes scores + assessment + copy, returns data.

// Tier a ranked list of compass dims by their normalised score.
function tierFor(score) {
  if (score >= 75) return 0; // Primary
  if (score >= 55) return 1; // Supporting
  return 2; // Quieter
}

function dimMeta(assessment, framework, id) {
  return assessment[framework].find((d) => d.id === id);
}

// Build the "My Wealth Compass" result model.
export function buildCompassResult(assessment, copy, scores) {
  const ranked = scores.compassRanked.map((id) => {
    const meta = dimMeta(assessment, 'compass', id);
    const score = scores.compass[id];
    const nar = copy.compassNarratives[id] || {};
    return {
      id, ...meta, score,
      tierIndex: tierFor(score), tier: copy.screens.compassResult.tiers[tierFor(score)],
      leads: nar.leads, explore: nar.explore, reflection: nar.reflection, nextStep: nar.nextStep,
    };
  });

  const [top1, top2] = ranked;
  const quietest = ranked[ranked.length - 1];
  const top3Names = ranked.slice(0, 3).map((d) => d.name);

  const n1 = copy.compassNarratives[top1.id];
  const nq = copy.compassNarratives[quietest.id];

  return {
    ranked,
    summary: fill(copy.screens.reveal.summaryTemplate, { top3: joinList(top3Names) }),
    whatThisMeans: {
      lead: `You tend to make money decisions shaped by ${top1.name.toLowerCase()} and ${top2.name.toLowerCase()}.`,
      body: n1.leads,
    },
    areaToExplore: nq.explore,
    reflection: n1.reflection,
    nextStep: n1.nextStep,
  };
}

// Build the "My Navigation Preferences" result model.
export function buildNavigationResult(assessment, copy, scores) {
  const ordered = assessment.navigation.map((d) => {
    const nar = copy.navigationNarratives[d.id] || {};
    return { ...d, score: scores.navigation[d.id], leads: nar.leads, decide: nar.decide, withOthers: nar.withOthers };
  });
  const strongest = [...ordered].sort((a, b) => b.score - a.score)[0];
  const n = copy.navigationNarratives[strongest.id];

  return {
    ordered, // keep the canonical Structured→Intuitive order for the journey line
    strongest,
    summary: `Your strongest step is ${strongest.name}. ${n.leads}`,
    decide: n.decide,
    withOthers: n.withOthers,
  };
}

// Build the persistent action list — practical next steps drawn from the
// compass directions that matter most to this person. Stable ids so completion
// can be saved and restored across sessions.
export function buildActionList(assessment, copy, scores) {
  const r = buildCompassResult(assessment, copy, scores);
  const items = [];
  for (const d of r.ranked.slice(0, 4)) {
    if (d.nextStep) items.push({ id: `c-${d.id}`, icon: d.icon, dim: d.name, text: d.nextStep });
  }
  // a gentle stretch step from the quietest direction, if it isn't already listed
  const quietest = r.ranked[r.ranked.length - 1];
  if (quietest && quietest.nextStep && !items.some((i) => i.id === `c-${quietest.id}`)) {
    items.push({ id: `c-${quietest.id}`, icon: quietest.icon, dim: quietest.name, text: quietest.nextStep });
  }
  return items;
}

// Build the "Our Shared Compass" model from two score sets.
export function buildSharedResult(assessment, copy, mine, theirs, names) {
  const sn = copy.sharedNarratives || {};
  const sharedMin = sn.thresholds?.sharedMin ?? 70;
  const differenceMin = sn.thresholds?.differenceMin ?? 25;
  const shared = [];
  const different = [];
  for (const d of assessment.compass) {
    const a = mine.compass[d.id];
    const b = theirs.compass[d.id];
    if (a >= sharedMin && b >= sharedMin) shared.push(d);
    if (Math.abs(a - b) >= differenceMin) different.push({ dim: d, higher: a > b ? names.me : names.partner });
  }
  return {
    sharedDirection: shared[0]
      ? fill(sn.sharedDirection || '', { dim: shared[0].name })
      : (sn.sharedDirectionNone || ''),
    differentFocus: different[0]
      ? fill(sn.differentFocus || '', { name: different[0].higher, dim: different[0].dim.name })
      : (sn.differentFocusNone || ''),
    closing: sn.closing || copy.brand.recurringQuestion,
  };
}

function fill(template, vars) {
  return template.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : `{${k}}`));
}

function joinList(items) {
  if (items.length <= 1) return items[0] || '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

export { fill };
