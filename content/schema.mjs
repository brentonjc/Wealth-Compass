// schema.mjs — the single source of truth for how the editable CSV sheets map
// back into src/data/copy.json + src/data/assessment.json. Both export and
// import read these definitions so they can never drift apart.

// --- dotted-path get/set (supports numeric array indices, e.g. "items.0.title")
export function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
export function setPath(obj, path, val) {
  const ks = path.split('.');
  let o = obj;
  for (let i = 0; i < ks.length - 1; i++) { o[ks[i]] ??= {}; o = o[ks[i]]; }
  o[ks[ks.length - 1]] = val;
}

// Key/value sheets. `t` = target file ('copy' or 'assessment'); `p` = dotted
// path within it; `num` = treat the value as a number on import.
export const SHARED_COMPASS_KV = [
  { key: 'screen.headline', t: 'copy', p: 'screens.shared.headline' },
  { key: 'screen.eyebrowTemplate', t: 'copy', p: 'screens.shared.eyebrowTemplate' },
  { key: 'screen.directionLabel', t: 'copy', p: 'screens.shared.directionLabel' },
  { key: 'screen.focusLabel', t: 'copy', p: 'screens.shared.focusLabel' },
  { key: 'screen.downloadButton', t: 'copy', p: 'screens.shared.button' },
  { key: 'narrative.sharedDirection', t: 'copy', p: 'sharedNarratives.sharedDirection' },
  { key: 'narrative.sharedDirectionNone', t: 'copy', p: 'sharedNarratives.sharedDirectionNone' },
  { key: 'narrative.differentFocus', t: 'copy', p: 'sharedNarratives.differentFocus' },
  { key: 'narrative.differentFocusNone', t: 'copy', p: 'sharedNarratives.differentFocusNone' },
  { key: 'narrative.closing', t: 'copy', p: 'sharedNarratives.closing' },
  { key: 'threshold.sharedMinScore', t: 'copy', p: 'sharedNarratives.thresholds.sharedMin', num: true },
  { key: 'threshold.differenceMinScore', t: 'copy', p: 'sharedNarratives.thresholds.differenceMin', num: true },
];

export const INDIVIDUAL_CTA_KV = [
  { key: 'reveal.eyebrowTemplate', t: 'copy', p: 'screens.reveal.eyebrowTemplate' },
  { key: 'reveal.headline', t: 'copy', p: 'screens.reveal.headline' },
  { key: 'reveal.summaryTemplate', t: 'copy', p: 'screens.reveal.summaryTemplate' },
  { key: 'reveal.button', t: 'copy', p: 'screens.reveal.button' },
  { key: 'compass.eyebrow', t: 'copy', p: 'screens.compassResult.eyebrow' },
  { key: 'compass.headline', t: 'copy', p: 'screens.compassResult.headline' },
  { key: 'compass.exploreHint', t: 'copy', p: 'screens.compassResult.exploreHint' },
  { key: 'compass.exploreButton', t: 'copy', p: 'screens.compassResult.exploreButton' },
  { key: 'compass.insightsEyebrow', t: 'copy', p: 'screens.compassResult.insightsEyebrow' },
  { key: 'compass.insightsHeadline', t: 'copy', p: 'screens.compassResult.insightsHeadline' },
  { key: 'compass.insightsButton', t: 'copy', p: 'screens.compassResult.insightsButton' },
  { key: 'compass.tier1', t: 'copy', p: 'screens.compassResult.tiers.0' },
  { key: 'compass.tier2', t: 'copy', p: 'screens.compassResult.tiers.1' },
  { key: 'compass.tier3', t: 'copy', p: 'screens.compassResult.tiers.2' },
  { key: 'navigation.eyebrow', t: 'copy', p: 'screens.navigationResult.eyebrow' },
  { key: 'navigation.headline', t: 'copy', p: 'screens.navigationResult.headline' },
  { key: 'navigation.subhead', t: 'copy', p: 'screens.navigationResult.subhead' },
  { key: 'navigation.caption', t: 'copy', p: 'screens.navigationResult.caption' },
  { key: 'navigation.exploreHint', t: 'copy', p: 'screens.navigationResult.exploreHint' },
  { key: 'navigation.exploreButton', t: 'copy', p: 'screens.navigationResult.exploreButton' },
  { key: 'navigation.insightsEyebrow', t: 'copy', p: 'screens.navigationResult.insightsEyebrow' },
  { key: 'navigation.insightsHeadline', t: 'copy', p: 'screens.navigationResult.insightsHeadline' },
  { key: 'navigation.insightsButton', t: 'copy', p: 'screens.navigationResult.insightsButton' },
  { key: 'reports.eyebrow', t: 'copy', p: 'screens.reports.eyebrow' },
  { key: 'reports.headline', t: 'copy', p: 'screens.reports.headline' },
  { key: 'reports.item1.title', t: 'copy', p: 'screens.reports.items.0.title' },
  { key: 'reports.item1.desc', t: 'copy', p: 'screens.reports.items.0.desc' },
  { key: 'reports.item2.title', t: 'copy', p: 'screens.reports.items.1.title' },
  { key: 'reports.item2.desc', t: 'copy', p: 'screens.reports.items.1.desc' },
  { key: 'reports.actionEyebrow', t: 'copy', p: 'screens.reports.actionEyebrow' },
  { key: 'reports.actionCta', t: 'copy', p: 'screens.reports.actionCta' },
  { key: 'reports.actionCtaNote', t: 'copy', p: 'screens.reports.actionCtaNote' },
  { key: 'actionList.eyebrow', t: 'copy', p: 'screens.actionList.eyebrow' },
  { key: 'actionList.headline', t: 'copy', p: 'screens.actionList.headline' },
  { key: 'actionList.subhead', t: 'copy', p: 'screens.actionList.subhead' },
  { key: 'actionList.homeLink', t: 'copy', p: 'screens.actionList.homeLink' },
  { key: 'actionList.doneAll', t: 'copy', p: 'screens.actionList.doneAll' },
  { key: 'actionList.progressTemplate', t: 'copy', p: 'screens.actionList.progressTemplate' },
  { key: 'conversation.eyebrow', t: 'copy', p: 'screens.conversation.eyebrow' },
  { key: 'conversation.headline', t: 'copy', p: 'screens.conversation.headline' },
  { key: 'conversation.subhead', t: 'copy', p: 'screens.conversation.subhead' },
  { key: 'conversation.goDeeper', t: 'copy', p: 'screens.conversation.goDeeper' },
  { key: 'conversation.goDeeperButton', t: 'copy', p: 'screens.conversation.goDeeperButton' },
  { key: 'calculating.main', t: 'copy', p: 'screens.calculating.main' },
  { key: 'calculating.rotating1', t: 'copy', p: 'screens.calculating.rotating.0' },
  { key: 'calculating.rotating2', t: 'copy', p: 'screens.calculating.rotating.1' },
  { key: 'calculating.rotating3', t: 'copy', p: 'screens.calculating.rotating.2' },
];

export const SHARED_CTA_KV = [
  { key: 'reports.partnerEyebrow', t: 'copy', p: 'screens.reports.partnerEyebrow' },
  { key: 'reports.partnerHeadline', t: 'copy', p: 'screens.reports.partnerHeadline' },
  { key: 'reports.partnerBody', t: 'copy', p: 'screens.reports.partnerBody' },
  { key: 'reports.passphrasePlaceholder', t: 'copy', p: 'screens.reports.passphrasePlaceholder' },
  { key: 'reports.shareCodeLabel', t: 'copy', p: 'screens.reports.shareCodeLabel' },
  { key: 'reports.copyButton', t: 'copy', p: 'screens.reports.copyButton' },
  { key: 'reports.encryptionNote', t: 'copy', p: 'screens.reports.encryptionNote' },
  { key: 'reports.fileFallback', t: 'copy', p: 'screens.reports.fileFallback' },
  { key: 'reports.lockedTitle', t: 'copy', p: 'screens.reports.lockedTitle' },
  { key: 'reports.lockedDesc', t: 'copy', p: 'screens.reports.lockedDesc' },
  { key: 'partnerJoin.eyebrow', t: 'copy', p: 'screens.partnerJoin.eyebrow' },
  { key: 'partnerJoin.headline', t: 'copy', p: 'screens.partnerJoin.headline' },
  { key: 'partnerJoin.subhead', t: 'copy', p: 'screens.partnerJoin.subhead' },
  { key: 'partnerJoin.codeLabel', t: 'copy', p: 'screens.partnerJoin.codeLabel' },
  { key: 'partnerJoin.codePlaceholder', t: 'copy', p: 'screens.partnerJoin.codePlaceholder' },
  { key: 'partnerJoin.passphraseLabel', t: 'copy', p: 'screens.partnerJoin.passphraseLabel' },
  { key: 'partnerJoin.passphrasePlaceholder', t: 'copy', p: 'screens.partnerJoin.passphrasePlaceholder' },
  { key: 'partnerJoin.encryptionNote', t: 'copy', p: 'screens.partnerJoin.encryptionNote' },
  { key: 'partnerJoin.fallback', t: 'copy', p: 'screens.partnerJoin.fallback' },
  { key: 'partnerJoin.button', t: 'copy', p: 'screens.partnerJoin.button' },
];

// Per-dimension narrative sheets.
export const COMPASS_COLUMNS = ['id', 'icon', 'name', 'meaning', 'leads', 'explore', 'reflection', 'nextStep'];
export const NAVIGATION_COLUMNS = ['id', 'icon', 'name', 'meaning', 'leads', 'decide', 'withOthers'];
export const CONVO_COLUMNS = ['category', 'prompt'];
export const KV_COLUMNS = ['key', 'text'];
export const SCORING_COLUMNS = ['question', 'type', 'ref', 'label', 'dimension', 'weight'];
