// app.js — Wealth Compass SPA. Loads the assessment + copy, drives the screen
// flow, renders every question type, scores answers and shows the results.
import { scoreAssessment } from './scoring.js';
import { buildCompassResult, buildNavigationResult, buildSharedResult, buildActionList, fill } from './results.js';
import { renderRose, renderSharedRose } from './charts.js';
import {
  encryptProfile, decryptProfile, uploadShare, fetchShare,
  downloadEncryptedFile, readEncryptedFile, isFirebaseEnabled,
} from './share.js';

const STORE_KEY = 'wealthcompass.v3';
const app = document.getElementById('app');

let ASSESSMENT, COPY;
const state = load() || { name: '', season: '', mode: '', answers: {}, partner: null };

function load() { try { return JSON.parse(localStorage.getItem(STORE_KEY)); } catch { return null; } }
function save() { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }

// ---- tiny helpers ----
const h = (html) => { app.innerHTML = html; app.classList.add('screen'); requestAnimationFrame(() => app.classList.remove('screen')); };
const $ = (sel) => app.querySelector(sel);
const $$ = (sel) => Array.from(app.querySelectorAll(sel));
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Decorative background used on most light screens
const glow = `<div class="absolute inset-0 overflow-hidden pointer-events-none">
  <div class="absolute -top-14 -right-16 w-48 h-48 rounded-full" style="background:radial-gradient(circle,rgba(139,133,255,.14),transparent 70%)"></div>
  <div class="absolute -bottom-16 -left-16 w-52 h-52 rounded-full" style="background:radial-gradient(circle,rgba(87,224,208,.12),transparent 70%)"></div>
</div>`;

const wave = (w = 54, hh = 18, sw = 4) => `<svg viewBox="0 0 120 40" width="${w}" height="${hh}" class="overflow-visible"><defs><clipPath id="wc${Math.random().toString(36).slice(2, 7)}"><rect width="120" height="40"/></clipPath></defs><g><path class="wave-a" d="M0,20 C10,6 26,6 36,20 C46,34 62,34 72,20 C82,6 98,6 108,20 C118,34 134,34 144,20 C154,6 170,6 180,20 C190,34 206,34 216,20 C226,6 242,6 252,20" fill="none" stroke="#FF8A3D" stroke-width="${sw}" stroke-linecap="round"/><path class="wave-b" d="M0,20 C10,34 26,34 36,20 C46,6 62,6 72,20 C82,34 98,34 108,20 C118,6 134,6 144,20 C154,34 170,34 180,20 C190,6 206,6 216,20 C226,34 242,34 252,20" fill="none" stroke="#57E0D0" stroke-width="${sw}" stroke-linecap="round"/></g></svg>`;

const btn = (label, cls = '') => `<button class="w-full py-4 rounded-xl bg-primary text-white font-medium text-[16px] lift-shadow ${cls}">${label}</button>`;

// ---- flow ----
const QUESTION_COUNT = () => ASSESSMENT.questions.length;

function go(screen, arg) {
  state.screen = screen; state.arg = arg; save();
  routes[screen](arg);
  app.scrollTo?.(0, 0);
  window.scrollTo(0, 0);
}

const routes = {
  home: renderHome,
  welcome: renderWelcome,
  safety: renderSafety,
  about: renderAbout,
  question: renderQuestion,
  calculating: renderCalculating,
  reveal: renderReveal,
  compass: renderCompassResult,
  compassInsights: renderCompassInsights,
  navigation: renderNavigationResult,
  navInsights: renderNavInsights,
  reports: renderReports,
  actions: renderActionList,
  conversation: renderConversation,
  partner: renderPartnerJoin,
  shared: renderShared,
};

// ---- shared chrome: keeps every deep screen escapable ----
const resetLight = () => { app.className = 'phone gradient-app'; };
function restart() {
  // Destructive — confirm before wiping answers the user has already given.
  if (Object.keys(state.answers || {}).length && !confirm('Start over? This clears your current answers.')) return;
  state.answers = {}; state.scores = null; state.partner = state.partner || null;
  save(); resetLight(); go('welcome');
}
// Home + Start-again bar. `dark` styles it for the ink-gradient screens.
// py-3 -my-2 grows the tap target to ~44px without changing the visual position.
function topBar(dark = false) {
  const tone = dark ? 'text-textdark/75' : 'text-muted';
  const hit = 'text-[13px] py-3 -my-2 px-1 flex items-center gap-1.5 hover:opacity-80';
  return `<div class="flex items-center justify-between px-6 safe-top pb-1 relative z-20">
    <button data-nav="home" class="${hit} ${tone}">🏠 <span>Home</span></button>
    <button data-nav="restart" class="${hit} ${tone}"><span>Start again</span> ↺</button>
  </div>`;
}
function wireTopBar() {
  const home = $('[data-nav="home"]'); if (home) home.onclick = () => { resetLight(); go('home'); };
  const re = $('[data-nav="restart"]'); if (re) re.onclick = restart;
}

// ============ 01 · HOME ============
function renderHome() {
  const c = COPY.screens.home;
  h(`<div class="relative overflow-hidden flex-1 flex flex-col" style="background:linear-gradient(158deg,#5B54EC 0%,#4239C6 56%,#332BA8 100%)">
    <div class="relative z-10 px-8 pt-12 flex-1">
      <div class="flex items-center gap-2.5"><span class="inline-flex items-center shrink-0 overflow-hidden" style="width:44px;height:26px">${wave(62, 26, 3.6)}</span><span class="text-white/95 font-display font-semibold text-[15px] tracking-tight">${COPY.brand.name}</span></div>
      <h1 class="mt-20 text-white font-display font-bold text-[42px] leading-[1.06]">${c.headline.replace(/ /, '<br>')}</h1>
      <p class="mt-6 text-white/70 text-[15px] leading-relaxed max-w-[244px]">${esc(c.subhead)}</p>
      <div class="mt-12 space-y-3.5 max-w-[320px]">
        ${state.scores ? `<button id="myreports" class="w-full py-4 rounded-2xl bg-white text-primary font-display font-semibold text-[16px] flex items-center justify-center gap-2 lift-shadow">🧭 ${esc(c.reportsLink)} <span class="text-xl leading-none">›</span></button>` : ''}
        <button id="start" class="w-full py-4 rounded-2xl text-white font-display font-semibold text-[16px] flex items-center justify-center gap-2" style="background:#FF8A3D;box-shadow:0 12px 28px -8px rgba(255,138,61,.7)">${esc(state.scores ? 'Retake the assessment' : c.primary)} <span class="text-xl leading-none">›</span></button>
        <button id="cards" class="w-full py-4 rounded-2xl text-white font-display font-medium text-[15px] flex items-center justify-center gap-2" style="background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.35)">${esc(c.secondary)}</button>
      </div>
      <p class="mt-6 text-[13px] text-white/60"><button id="partner" class="inline-block py-2 -my-1 text-[#FFC49B] font-medium underline underline-offset-2">${esc(c.partnerLink)}</button></p>
      ${state.scores ? `<p class="mt-3 text-[13px] text-white/60"><button id="myactions" class="inline-block py-2 -my-1 text-[#FFC49B] font-medium underline underline-offset-2">${esc(COPY.screens.actionList.homeLink)}</button></p>` : ''}
    </div>
  </div>`);
  $('#start').onclick = () => go('welcome');
  $('#cards').onclick = () => go('conversation');
  $('#partner').onclick = () => go('partner');
  $('#myreports')?.addEventListener('click', () => go('reports'));
  $('#myactions')?.addEventListener('click', () => go('actions'));
}

// ============ 02 · WELCOME — the two steps + where insight lives ============
// Combined illustration: a mini Compass rose (how you think & feel) and a mini
// Navigation journey (how you act) overlapping, with a spark where they meet.
const conceptArt = `<svg viewBox="0 0 320 190" class="w-full" xmlns="http://www.w3.org/2000/svg">
  <circle cx="112" cy="88" r="74" fill="rgba(88,81,232,0.07)" stroke="rgba(88,81,232,0.22)" stroke-width="1"/>
  <circle cx="208" cy="88" r="74" fill="rgba(44,166,164,0.09)" stroke="rgba(44,166,164,0.30)" stroke-width="1"/>
  <g stroke="rgba(88,81,232,0.28)" stroke-width="1" fill="none">
    <polygon points="112,48 140.3,59.7 152,88 140.3,116.3 112,128 83.7,116.3 72,88 83.7,59.7"/>
    <line x1="112" y1="88" x2="112" y2="48"/><line x1="112" y1="88" x2="152" y2="88"/><line x1="112" y1="88" x2="112" y2="128"/><line x1="112" y1="88" x2="72" y2="88"/>
  </g>
  <polygon points="112,50 127.6,72.4 142,88 124.7,100.7 112,108 100.7,99.3 84,88 95,71" fill="rgba(99,91,255,0.30)" stroke="#5851E8" stroke-width="1.5" stroke-linejoin="round"/>
  <text x="112" y="150" text-anchor="middle" font-size="11" font-weight="600" fill="#5851E8">Think &amp; feel</text>
  <path d="M176,111 C184,104 190,101 196,97 C204,92 212,90 218,87 C226,83 232,76 240,68" fill="none" stroke="#2CA6A4" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="176" cy="111" r="4.5" fill="#2CA6A4"/><circle cx="196" cy="97" r="4.5" fill="#3BB6A0"/><circle cx="218" cy="87" r="4.5" fill="#5851E8"/><circle cx="240" cy="68" r="4.5" fill="#2CA6A4"/>
  <text x="212" y="150" text-anchor="middle" font-size="11" font-weight="600" fill="#146B66">Act</text>
  <circle cx="160" cy="88" r="22" fill="rgba(255,138,61,0.16)"/>
  <path d="M160,68 L164.5,83.5 L180,88 L164.5,92.5 L160,108 L155.5,92.5 L140,88 L155.5,83.5 Z" fill="#FF8A3D"/>
  <circle cx="160" cy="88" r="3.2" fill="#fff"/>
</svg>`;

function renderWelcome() {
  resetLight();
  const c = COPY.screens.welcome;
  const accent = { primary: { chip: 'rgba(88,81,232,.12)', label: 'text-primary' }, teal: { chip: 'rgba(44,166,164,.14)', label: 'text-[#146B66]' } };
  const stepRow = (s) => {
    const a = accent[s.accent] || accent.primary;
    return `<div class="card-surface rounded-2xl p-4 soft-shadow flex items-center gap-3.5">
      <span class="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0" style="background:${a.chip}">${s.icon}</span>
      <div class="min-w-0"><p class="text-[10px] uppercase tracking-widest ${a.label}">${esc(s.label)}</p>
        <p class="text-[14px] text-text leading-snug mt-0.5"><span class="font-medium">${esc(s.title)}</span> — ${esc(s.body)}</p></div>
    </div>`;
  };
  h(`${glow}
    ${topBar()}
    <div class="relative z-10 flex-1 overflow-y-auto px-8 pt-2 pb-4 flex flex-col">
      <p class="text-xs tracking-[0.25em] uppercase text-primary mb-3">${esc(c.eyebrow)}</p>
      <h2 class="font-display font-semibold text-[26px] leading-snug text-text">${esc(c.headline)}</h2>
      <p class="mt-3 text-[14px] leading-relaxed text-muted">${esc(c.subhead)}</p>
      <div class="mt-4">${conceptArt}</div>
      <div class="mt-4 space-y-3">${c.steps.map(stepRow).join('')}</div>
      <div class="mt-3 rounded-2xl p-4 flex items-start gap-3" style="background:#111B34">
        <span class="text-[#FF8A3D] text-lg leading-none mt-0.5">✦</span>
        <p class="text-[13px] text-textdark/85 leading-relaxed">${esc(c.insight)}</p>
      </div>
    </div>
    <div class="relative z-10 px-8 pt-3 pb-8">${btn(c.button, 'rounded-xl')}</div>`);
  wireTopBar();
  $('button.bg-primary').onclick = () => go('safety');
}

// ============ 02b · SAFETY / REASSURANCE ============
function renderSafety() {
  resetLight();
  const c = COPY.screens.safety;
  h(`${glow}
    ${topBar()}
    <div class="relative z-10 flex-1 flex flex-col justify-center px-8">
      <p class="text-xs tracking-[0.25em] uppercase text-primary mb-3">${esc(c.eyebrow)}</p>
      <h2 class="font-display font-semibold text-3xl leading-snug text-text">${esc(c.headline)}</h2>
      <p class="mt-3 text-[15px] leading-relaxed text-muted">${esc(c.subhead)}</p>
      <div class="mt-8 space-y-4">
        ${c.cards.map((card) => `<div class="card-surface rounded-2xl p-5 soft-shadow flex items-start gap-3.5">
          <span class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-lg shrink-0">${card.icon}</span>
          <p class="text-[14px] leading-relaxed"><span class="font-medium text-text">${esc(card.title)}</span><br><span class="text-muted">${esc(card.body)}</span></p></div>`).join('')}
      </div>
    </div>
    <div class="relative z-10 px-8 pb-12">${btn(c.button, 'rounded-xl')}</div>`);
  wireTopBar();
  $('button.bg-primary').onclick = () => go('about');
}

// ============ 03 · ABOUT YOU ============
function renderAbout() {
  const c = COPY.screens.about;
  h(`${glow}
    ${topBar()}
    <div class="px-8 pt-3 relative z-10">${progress(0.04, 'ABOUT YOU')}</div>
    <div class="flex-1 flex flex-col justify-center px-8 relative z-10">
      <h2 class="font-display font-semibold text-3xl leading-snug text-text">${esc(c.headline)}</h2>
      <p class="mt-3 text-[15px] text-muted">${esc(c.subhead)}</p>
      <div class="mt-8 space-y-5">
        <div><label class="text-[13px] font-medium text-text">${esc(c.nameLabel)}</label>
          <input id="name" value="${esc(state.name)}" class="mt-2 w-full px-5 py-4 rounded-xl bg-card2 border border-line text-[16px] placeholder:text-muted/60" placeholder="${esc(c.namePlaceholder)}"></div>
        <div><label class="text-[13px] font-medium text-text">${esc(c.seasonLabel)}</label>
          <div class="mt-2 grid grid-cols-2 gap-2.5" id="seasons">
            ${c.seasons.map((s) => `<button data-v="${esc(s)}" class="answer-card py-3.5 rounded-xl border border-line text-[14px] ${state.season === s ? 'selected text-primary font-medium' : ''}">${esc(s)}</button>`).join('')}
          </div></div>
        <div><label class="text-[13px] font-medium text-text">${esc(c.modeLabel)}</label>
          <div class="mt-2 grid grid-cols-2 gap-2.5" id="modes">
            ${c.modes.map((m) => `<button data-v="${esc(m)}" class="answer-card py-3.5 rounded-xl border border-line text-[14px] ${state.mode === m ? 'selected text-primary font-medium' : ''}">${esc(m)}</button>`).join('')}
          </div></div>
      </div>
    </div>
    <div class="px-8 pb-12 relative z-10">${btn(c.button, 'rounded-xl')}</div>`);
  $('#name').oninput = (e) => { state.name = e.target.value; };
  pickOne('#seasons', (v) => { state.season = v; });
  pickOne('#modes', (v) => { state.mode = v; });
  wireTopBar();
  $('button.bg-primary').onclick = () => { save(); go('question', 0); };
}

function pickOne(container, cb) {
  $$(`${container} button`).forEach((b) => {
    b.onclick = () => {
      $$(`${container} button`).forEach((x) => x.classList.remove('selected', 'text-primary', 'font-medium'));
      b.classList.add('selected', 'text-primary', 'font-medium');
      cb(b.dataset.v);
    };
  });
}

function progress(frac, label) {
  return `<div class="h-1.5 rounded-full bg-card3 overflow-hidden"><div class="h-full bg-primary rounded-full" style="width:${Math.round(frac * 100)}%"></div></div>
    <p class="text-[11px] text-muted mt-2 tracking-wide">${esc(label)}</p>`;
}

// ============ QUESTIONS (generic) ============
function renderQuestion(index) {
  const q = ASSESSMENT.questions[index];
  const sec = ASSESSMENT.sections.find((s) => s.id === q.section);
  const label = `${sec.label.toUpperCase()} · ${index + 1} OF ${QUESTION_COUNT()}`;
  const eyebrow = q.eyebrow ? `<p class="text-xs tracking-[0.2em] uppercase text-primary mb-3">${esc(q.eyebrow)}</p>` : '';

  h(`${glow}
    <div class="px-8 pt-14 relative z-10">${progress((index + 1) / (QUESTION_COUNT() + 1), label)}</div>
    <div class="flex-1 flex flex-col justify-center px-8 relative z-10" id="qbody">
      ${eyebrow}
      <h2 class="font-display font-semibold text-[25px] leading-snug text-text">${esc(q.prompt)}</h2>
      <div id="qinput" class="mt-7"></div>
      ${q.helper ? `<p class="mt-6 text-center text-[12px] text-muted">${esc(q.helper)}</p>` : ''}
    </div>
    <div class="px-8 pb-8 relative z-10" id="qfoot"></div>`);

  const inputEl = $('#qinput');
  const footEl = $('#qfoot');
  const back = `<button id="back" class="text-[13px] text-muted py-2.5 pr-3 -my-1">← Back</button>`;

  const advance = () => (index + 1 < QUESTION_COUNT() ? go('question', index + 1) : go('calculating'));
  const continueBtn = () => { footEl.innerHTML = btn('Continue'); $('#qfoot button').onclick = advance; };
  const wireBack = () => { const b = $('#back'); if (b) b.onclick = () => (index > 0 ? go('question', index - 1) : go('about')); };

  const setAnswer = (val) => { state.answers[q.id] = val; save(); };

  switch (q.type) {
    case 'single': {
      inputEl.innerHTML = `<div class="space-y-3">${q.options.map((o, i) => `
        <button data-i="${i}" class="answer-card w-full text-left p-5 rounded-2xl border border-line ${state.answers[q.id] === i ? 'selected' : ''}">
          <p class="text-[15px] font-medium text-text">${esc(o.label)}</p>
          ${o.sub ? `<p class="text-[13px] text-muted mt-1">${esc(o.sub)}</p>` : ''}
        </button>`).join('')}</div>`;
      footEl.innerHTML = `<div class="flex items-center justify-between">${back}<button id="skip" class="text-[13px] text-muted underline underline-offset-2 py-2.5 pl-3 -my-1">Not sure — skip</button></div>`;
      $$('#qinput button').forEach((b) => (b.onclick = () => { setAnswer(+b.dataset.i); advance(); }));
      $('#skip').onclick = () => { setAnswer(null); advance(); };
      break;
    }
    case 'slider': {
      const val = state.answers[q.id] ?? q.default ?? 50;
      const leanLabel = (v) => (v <= 33 ? q.leftLabel : v >= 67 ? q.rightLabel : (q.midLabel || 'A bit of both'));
      inputEl.innerHTML = `<div class="card-surface rounded-2xl p-6 soft-shadow">
        <p class="text-center text-[10px] uppercase tracking-[0.2em] text-muted mb-1.5">You're leaning</p>
        <p id="slabel" class="text-center font-display font-semibold text-[20px] text-primary mb-5">${esc(leanLabel(val))}</p>
        <input id="slider" type="range" min="0" max="100" value="${val}" class="w-full">
        <div class="flex justify-between gap-4 text-[12px] mt-3">
          <span id="lend" class="flex-1 text-left leading-tight">← ${esc(q.leftLabel)}</span>
          <span id="rend" class="flex-1 text-right leading-tight">${esc(q.rightLabel)} →</span>
        </div>
      </div>`;
      setAnswer(val);
      const paint = (v) => {
        $('#slabel').textContent = leanLabel(v);
        $('#lend').className = `flex-1 text-left leading-tight ${v <= 49 ? 'text-primary font-medium' : 'text-muted'}`;
        $('#rend').className = `flex-1 text-right leading-tight ${v >= 51 ? 'text-primary font-medium' : 'text-muted'}`;
      };
      paint(val);
      $('#slider').oninput = (e) => { const v = +e.target.value; setAnswer(v); paint(v); };
      continueBtn();
      break;
    }
    case 'allocation': {
      renderAllocation(q, inputEl, setAnswer);
      continueBtn();
      break;
    }
    case 'ranking': {
      renderRanking(q, inputEl, setAnswer, continueBtn, footEl, advance);
      break;
    }
    case 'multi': {
      renderMulti(q, inputEl, setAnswer, footEl, advance);
      break;
    }
  }
  wireBack();
}

function renderAllocation(q, inputEl, setAnswer) {
  // work in integer percentages that always sum to 100
  const stored = state.answers[q.id];
  let pct = q.buckets.map((b) => (stored ? Math.round((stored[b.dim] / q.total) * 100) : b.default));
  const fmt = (p) => `$${Math.round((p / 100) * q.total / 1000)}k`;

  const commit = () => {
    const alloc = {};
    q.buckets.forEach((b, i) => (alloc[b.dim] = Math.round((pct[i] / 100) * q.total)));
    setAnswer(alloc);
  };
  const draw = () => {
    const total = pct.reduce((a, b) => a + b, 0);
    inputEl.querySelectorAll('[data-amt]').forEach((el, i) => (el.textContent = fmt(pct[i])));
    inputEl.querySelectorAll('[data-bar]').forEach((el, i) => (el.style.width = pct[i] + '%'));
    $('#alloctotal').innerHTML = total === 100
      ? `<span class="text-success font-medium"><span class="font-mono">$${(q.total).toLocaleString()}</span> allocated ✓</span>`
      : `<span class="text-warn font-medium"><span class="font-mono">${total}%</span> allocated — drag to reach 100%</span>`;
  };

  inputEl.innerHTML = `<p class="text-[13px] text-muted mb-4">Drag the amounts — keep them adding to <span class="font-mono">$${(q.total / 1000)}k</span>.</p>
    <div class="space-y-4">${q.buckets.map((b, i) => `
      <div>
        <div class="flex justify-between text-[13px] mb-1.5"><span class="font-medium text-text">${esc(b.label)}</span><span class="text-primary font-mono" data-amt>${fmt(pct[i])}</span></div>
        <input type="range" min="0" max="100" value="${pct[i]}" data-slider="${i}" class="w-full">
        <div class="h-2 rounded-full bg-card3 mt-1"><div class="h-full rounded-full bg-primary" data-bar style="width:${pct[i]}%"></div></div>
      </div>`).join('')}</div>
    <p id="alloctotal" class="mt-5 text-center text-[13px]"></p>`;

  inputEl.querySelectorAll('[data-slider]').forEach((sl) => {
    sl.oninput = (e) => {
      const i = +e.target.dataset.slider;
      const delta = +e.target.value - pct[i];
      pct[i] = +e.target.value;
      // pull the difference proportionally from the others so the total holds at 100
      const others = pct.map((_, j) => j).filter((j) => j !== i);
      let remaining = delta;
      const pool = others.reduce((a, j) => a + pct[j], 0) || 1;
      others.forEach((j) => {
        const share = Math.round((pct[j] / pool) * delta);
        pct[j] = Math.max(0, pct[j] - share);
        remaining -= share;
      });
      // fix rounding drift on the largest other bucket
      if (remaining !== 0 && others.length) {
        const j = others.sort((a, b) => pct[b] - pct[a])[0];
        pct[j] = Math.max(0, pct[j] - remaining);
      }
      draw(); commit();
    };
  });
  draw(); commit();
}

function renderRanking(q, inputEl, setAnswer, continueBtn, footEl, advance) {
  let order = (state.answers[q.id] || []).slice(); // itemIndex[] top-first
  const draw = () => {
    inputEl.innerHTML = `<p class="text-[13px] text-muted mb-3">Tap up to ${q.rankCount} in order — tap again to remove.</p>
      <div class="space-y-3">${q.items.map((it, i) => {
        const rank = order.indexOf(i);
        const chosen = rank > -1;
        return `<button data-i="${i}" class="w-full text-left card-surface rounded-xl p-4 soft-shadow flex items-center gap-3 ${chosen ? 'selected' : ''}" style="${chosen ? 'border:2px solid var(--primary)' : ''}">
          <span class="w-7 h-7 rounded-full ${chosen ? 'bg-primary text-white' : 'bg-card3 text-muted'} flex items-center justify-center text-[13px] font-mono shrink-0">${chosen ? rank + 1 : '–'}</span>
          <p class="text-[15px] flex-1 ${chosen ? 'text-text' : 'text-muted'}">${esc(it.label)}</p>
        </button>`;
      }).join('')}</div>`;
    inputEl.querySelectorAll('[data-i]').forEach((b) => {
      b.onclick = () => {
        const i = +b.dataset.i;
        const at = order.indexOf(i);
        if (at > -1) order.splice(at, 1);
        else if (order.length < q.rankCount) order.push(i);
        setAnswer(order.slice());
        draw();
        footEl.style.opacity = order.length === q.rankCount ? '1' : '.5';
      };
    });
  };
  draw();
  continueBtn();
  footEl.style.opacity = order.length === q.rankCount ? '1' : '.5';
  $('#qfoot button').onclick = () => (order.length === q.rankCount ? advance() : null);
}

function renderMulti(q, inputEl, setAnswer, footEl, advance) {
  let chosen = (state.answers[q.id] || []).slice();
  const draw = () => {
    inputEl.innerHTML = `<div class="flex flex-wrap gap-2.5">${q.options.map((o, i) => {
      const on = chosen.includes(i);
      return `<button data-i="${i}" class="px-5 py-3 rounded-full text-[14px] ${on ? 'bg-primary text-white font-medium soft-shadow' : 'bg-card border border-line'}">${esc(o.label)}</button>`;
    }).join('')}</div>
    <p class="mt-6 text-[13px] text-muted text-center">${chosen.length} of ${q.choose} chosen</p>`;
    inputEl.querySelectorAll('[data-i]').forEach((b) => {
      b.onclick = () => {
        const i = +b.dataset.i;
        const at = chosen.indexOf(i);
        if (at > -1) chosen.splice(at, 1);
        else if (chosen.length < q.choose) chosen.push(i);
        setAnswer(chosen.slice());
        draw();
        footEl.querySelector('.bg-primary').style.opacity = chosen.length === q.choose ? '1' : '.5';
      };
    });
  };
  draw();
  footEl.innerHTML = `${btn('Continue')}<button id="mskip" class="w-full mt-2 py-2.5 text-[13px] text-muted underline underline-offset-2">Not sure — skip this one</button>`;
  footEl.querySelector('.bg-primary').style.opacity = chosen.length === q.choose ? '1' : '.5';
  footEl.querySelector('.bg-primary').onclick = () => (chosen.length === q.choose ? advance() : null);
  $('#mskip').onclick = () => { setAnswer([]); advance(); };
}

// ============ 11 · CALCULATING ============
function renderCalculating() {
  const c = COPY.screens.calculating;
  app.className = 'phone gradient-ink';
  h(`<div class="flex-1 flex flex-col items-center justify-center px-10 text-center">
    <div class="relative mb-12 mx-auto overflow-hidden" style="width:240px;height:80px">${wave(240, 80, 4)}</div>
    <p id="calcmsg" class="font-display font-semibold text-[22px] text-textdark">${esc(c.main)}</p>
    <div class="mt-6 flex gap-2 justify-center"><span class="w-1.5 h-1.5 rounded-full bg-purplelight"></span><span class="w-1.5 h-1.5 rounded-full bg-purplelight/50"></span><span class="w-1.5 h-1.5 rounded-full bg-purplelight/25"></span></div>
  </div>`);
  // compute + persist scores while the animation plays
  state.scores = scoreAssessment(ASSESSMENT, state.answers);
  save();
  let i = 0;
  const msgs = [c.main, ...c.rotating];
  const timer = setInterval(() => { i = (i + 1) % msgs.length; const el = $('#calcmsg'); if (el) el.textContent = msgs[i]; }, 1600);
  setTimeout(() => { clearInterval(timer); app.className = 'phone gradient-app'; go('reveal'); }, 3200);
}

// ============ 12 · REVEAL ============
function renderReveal() {
  const scores = state.scores || (state.scores = scoreAssessment(ASSESSMENT, state.answers));
  const result = buildCompassResult(ASSESSMENT, COPY, scores);
  app.className = 'phone gradient-ink';
  const eyebrow = fill(COPY.screens.reveal.eyebrowTemplate, { name: state.name || 'Here' });
  h(`${topBar(true)}
  <div class="flex-1 flex flex-col items-center px-6 pt-4 pb-10 text-center overflow-y-auto">
    ${wave(54, 18, 4)}
    <p class="text-xs tracking-[0.3em] uppercase text-purplelight mt-4">${esc(eyebrow)}</p>
    <h2 class="font-display font-semibold text-[30px] text-textdark mt-2">${esc(COPY.screens.reveal.headline)}</h2>
    <div class="mt-6 w-full rounded-2xl p-3 border" style="background:#111B34;border-color:rgba(107,124,153,.22)"><canvas id="revealRadar" width="330" height="330" role="img" aria-label="Your Wealth Compass — a radar chart of your eight financial directions. The ranked list follows on the next screen."></canvas></div>
    <p class="mt-5 text-[14px] leading-relaxed text-textdark/85 px-2">${highlightTop(result.summary, result.ranked.slice(0, 3))}</p>
    <button id="explore" class="mt-6 w-full py-4 rounded-xl bg-primarybright text-white font-medium text-[16px] lift-shadow">${esc(COPY.screens.reveal.button)}</button>
  </div>`);
  renderRose($('#revealRadar'), ASSESSMENT, scores);
  wireTopBar();
  $('#explore').onclick = () => { app.className = 'phone gradient-app'; go('compass'); };
}

function highlightTop(text, dims) {
  let out = esc(text);
  dims.forEach((d) => { out = out.replace(esc(d.name), `<span class="text-purplelight font-medium">${esc(d.name)}</span>`); });
  return out;
}

// ============ 13 · MY WEALTH COMPASS — explore all directions ============
function renderCompassResult() {
  resetLight();
  const scores = state.scores;
  const r = buildCompassResult(ASSESSMENT, COPY, scores);
  const c = COPY.screens.compassResult;
  h(`${glow}
    ${topBar()}
    <div class="flex-1 overflow-y-auto px-7 pt-2 pb-6 space-y-4 relative z-10">
      <div><p class="text-xs tracking-[0.25em] uppercase text-primary">${esc(c.eyebrow)}</p>
        <h2 class="font-display font-semibold text-[24px] text-text mt-1">${esc(c.headline)}</h2>
        <p class="text-[13px] text-muted mt-1">${esc(c.exploreHint)}</p></div>
      <div class="rounded-2xl p-3 border" style="background:#111B34;border-color:rgba(107,124,153,.22)"><canvas id="compassRadar" width="330" height="330" class="mx-auto block" role="img" aria-label="Radar chart of your eight compass directions. Each direction and its score is listed below."></canvas></div>
      <div id="dirlist" class="space-y-2.5"></div>
      ${btn(c.exploreButton)}
    </div>`);
  renderRose($('#compassRadar'), ASSESSMENT, scores);

  const listEl = $('#dirlist');
  let open = 0; // strongest direction expanded first
  const drawList = () => {
    listEl.innerHTML = r.ranked.map((d, i) => `
      <div class="card-surface rounded-2xl soft-shadow overflow-hidden">
        <button data-i="${i}" class="w-full flex items-center gap-3 p-4 text-left">
          <span class="text-lg shrink-0">${d.icon}</span>
          <span class="flex-1 min-w-0"><span class="text-[15px] font-medium text-text">${esc(d.name)}</span><span class="block text-[11px] text-muted">${esc(d.tier)}</span></span>
          <span class="w-16 h-1.5 rounded-full bg-card3 shrink-0 overflow-hidden"><span class="block h-full rounded-full bg-primary" style="width:${d.score}%"></span></span>
          <span class="text-muted text-[16px] shrink-0 w-4 text-center leading-none">${open === i ? '–' : '+'}</span>
        </button>
        ${open === i ? `<div class="px-4 pb-4"><p class="text-[12px] text-muted mb-1.5">${esc(d.meaning)}</p><p class="text-[13px] text-text leading-relaxed">${esc(d.leads || '')}</p></div>` : ''}
      </div>`).join('');
    listEl.querySelectorAll('[data-i]').forEach((b) => (b.onclick = () => { const i = +b.dataset.i; open = open === i ? -1 : i; drawList(); }));
  };
  drawList();
  $('button.bg-primary').onclick = () => go('compassInsights');
  wireTopBar();
}

// ============ 13b · WHAT YOUR COMPASS SUGGESTS ============
function renderCompassInsights() {
  resetLight();
  const r = buildCompassResult(ASSESSMENT, COPY, state.scores);
  const c = COPY.screens.compassResult;
  const top = r.ranked[0];
  h(`${glow}
    ${topBar()}
    <div class="flex-1 overflow-y-auto px-7 pt-2 pb-6 space-y-5 relative z-10">
      <div><p class="text-xs tracking-[0.25em] uppercase text-primary">${esc(c.insightsEyebrow)}</p>
        <h2 class="font-display font-semibold text-[24px] text-text mt-1">${esc(c.insightsHeadline)}</h2></div>
      <div class="rounded-2xl p-5 lift-shadow" style="background:#111B34">
        <p class="text-[11px] tracking-[0.2em] uppercase text-purplelight mb-2">What this means</p>
        <p class="font-display font-semibold text-[18px] leading-snug text-textdark">${esc(r.whatThisMeans.lead)}</p>
        <p class="text-[13px] text-textdark/70 mt-2 leading-relaxed">${esc(r.whatThisMeans.body)}</p>
      </div>
      <div class="card-surface rounded-2xl p-5 soft-shadow border-l-4" style="border-left-color:#5851E8">
        <p class="text-[11px] tracking-[0.2em] uppercase text-primary mb-2">An area to explore</p>
        <p class="text-[14px] leading-relaxed text-text">${esc(r.areaToExplore)}</p>
      </div>
      <div class="card-surface rounded-2xl p-5 soft-shadow">
        <p class="text-[11px] tracking-[0.2em] uppercase text-purple mb-2">Worth reflecting on</p>
        <p class="font-display font-medium text-[16px] text-text leading-snug">"${esc(r.reflection)}"</p>
      </div>
      ${top.nextStep ? `<div class="card-surface rounded-2xl p-5 soft-shadow border-l-4" style="border-left-color:#0F9E73">
        <p class="text-[11px] tracking-[0.2em] uppercase text-success mb-2">A first action</p>
        <p class="text-[14px] leading-relaxed text-text">${esc(top.nextStep)}</p>
        <button id="allactions" class="mt-3 text-[13px] text-primary font-medium underline underline-offset-2">${esc(COPY.screens.actionList.homeLink)}</button>
      </div>` : ''}
      ${btn(c.insightsButton)}
    </div>`);
  $('#allactions')?.addEventListener('click', () => go('actions'));
  $('button.bg-primary').onclick = () => go('navigation');
  wireTopBar();
}

// ============ 14 · MY NAVIGATION PREFERENCES — explore the results ============
function renderNavigationResult() {
  resetLight();
  const r = buildNavigationResult(ASSESSMENT, COPY, state.scores);
  const nc = COPY.screens.navigationResult;
  // build the journey line from scores: x evenly spaced, y inverted (higher score = higher point)
  const xs = [40, 110, 180, 250, 320];
  const y = (s) => 190 - (s / 100) * 130; // 60..190 band
  const pts = r.ordered.map((d, i) => ({ x: xs[i], ...d, y: y(d.score) }));
  const colors = ['#5851E8', '#2CA6A4', '#6C63E0', '#E3A94B', '#17A673'];
  const path = pts.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `C${pts[i - 1].x + 35},${pts[i - 1].y} ${p.x - 35},${p.y} ${p.x},${p.y}`)).join(' ');
  h(`${glow}
    ${topBar()}
    <div class="flex-1 overflow-y-auto px-7 pt-2 pb-6 space-y-4 relative z-10">
      <div><p class="text-xs tracking-[0.25em] uppercase text-primary">${esc(nc.eyebrow)}</p>
        <h2 class="font-display font-semibold text-[24px] text-text mt-1">${esc(nc.headline)}</h2>
        <p class="text-[13px] text-muted mt-2">${esc(nc.subhead)}</p></div>
      <div class="card-surface rounded-2xl p-5 pt-6 soft-shadow">
        <div class="flex justify-between text-[10px] uppercase tracking-widest text-muted mb-1"><span>How you navigate</span><span class="text-primary">${esc(nc.caption)}</span></div>
        <svg viewBox="0 0 360 252" class="w-full" role="img" aria-label="Line chart of your five navigation preferences; each is listed with its score below.">
          <g stroke="#EEF1F7" stroke-width="1"><line x1="24" y1="48" x2="336" y2="48"/><line x1="24" y1="128" x2="336" y2="128"/><line x1="24" y1="208" x2="336" y2="208"/></g>
          <path d="${path} L320,208 L40,208 Z" fill="rgba(88,81,232,.05)"/>
          <path d="${path}" fill="none" stroke="#5851E8" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
          ${pts.map((p, i) => `<circle cx="${p.x}" cy="${p.y}" r="7" fill="${colors[i]}"/><circle cx="${p.x}" cy="${p.y}" r="3" fill="#fff"/><text x="${p.x}" y="${p.y - 16}" text-anchor="middle" font-size="14">${p.icon}</text>`).join('')}
          ${pts.map((p) => `<text x="${p.x}" y="234" text-anchor="middle" font-size="10.5" font-weight="500" fill="#3A4A63">${esc(p.name)}</text>`).join('')}
        </svg>
      </div>
      <div class="card-surface rounded-2xl p-4 soft-shadow flex items-start gap-3"><span class="text-lg">${r.strongest.icon}</span>
        <p class="text-[13px] text-text leading-relaxed">${esc(r.summary)}</p></div>
      <p class="text-[13px] text-muted">${esc(nc.exploreHint)}</p>
      <div id="navlist" class="space-y-2.5"></div>
      ${btn(nc.exploreButton)}
    </div>`);

  const listEl = $('#navlist');
  const ordered = [...r.ordered].sort((a, b) => b.score - a.score);
  let open = 0;
  const drawList = () => {
    listEl.innerHTML = ordered.map((d, i) => `
      <div class="card-surface rounded-2xl soft-shadow overflow-hidden">
        <button data-i="${i}" class="w-full flex items-center gap-3 p-4 text-left">
          <span class="text-lg shrink-0">${d.icon}</span>
          <span class="flex-1 min-w-0 text-[15px] font-medium text-text">${esc(d.name)}</span>
          <span class="w-16 h-1.5 rounded-full bg-card3 shrink-0 overflow-hidden"><span class="block h-full rounded-full bg-primary" style="width:${d.score}%"></span></span>
          <span class="text-muted text-[16px] shrink-0 w-4 text-center leading-none">${open === i ? '–' : '+'}</span>
        </button>
        ${open === i ? `<div class="px-4 pb-4"><p class="text-[12px] text-muted mb-1.5">${esc(d.meaning)}</p><p class="text-[13px] text-text leading-relaxed">${esc(d.leads || '')}</p></div>` : ''}
      </div>`).join('');
    listEl.querySelectorAll('[data-i]').forEach((b) => (b.onclick = () => { const i = +b.dataset.i; open = open === i ? -1 : i; drawList(); }));
  };
  drawList();
  $('button.bg-primary').onclick = () => go('navInsights');
  wireTopBar();
}

// ============ 14b · NAVIGATION — recommendations & insights ============
function renderNavInsights() {
  resetLight();
  const r = buildNavigationResult(ASSESSMENT, COPY, state.scores);
  const nc = COPY.screens.navigationResult;
  h(`${glow}
    ${topBar()}
    <div class="flex-1 overflow-y-auto px-7 pt-2 pb-6 space-y-5 relative z-10">
      <div><p class="text-xs tracking-[0.25em] uppercase text-primary">${esc(nc.insightsEyebrow)}</p>
        <h2 class="font-display font-semibold text-[24px] text-text mt-1">${esc(nc.insightsHeadline)}</h2></div>
      <div class="rounded-2xl p-5 lift-shadow" style="background:#111B34">
        <p class="text-[11px] tracking-[0.2em] uppercase text-purplelight mb-2">How you tend to decide</p>
        <p class="text-[14px] text-textdark/85 leading-relaxed">${esc(r.decide)}</p></div>
      <div class="card-surface rounded-2xl p-5 soft-shadow border-l-4" style="border-left-color:#6C63E0">
        <p class="text-[11px] tracking-[0.2em] uppercase text-purple mb-2">Working with others</p>
        <p class="text-[14px] leading-relaxed text-text">${esc(r.withOthers)}</p></div>
      ${btn(nc.insightsButton)}
    </div>`);
  $('button.bg-primary').onclick = () => go('reports');
  wireTopBar();
}

// ============ 16 · REPORTS & SHARE ============
function renderReports() {
  resetLight();
  const c = COPY.screens.reports;
  h(`${glow}
    ${topBar()}
    <div class="flex-1 overflow-y-auto px-7 pt-2 pb-10 space-y-4 relative z-10">
      <div class="flex justify-center pb-1"><span class="inline-flex overflow-hidden" style="width:38px;height:17px">${wave(52, 17, 4)}</span></div>
      <div><p class="text-xs tracking-[0.25em] uppercase text-primary">${esc(c.eyebrow)}</p><h2 class="font-display font-semibold text-[24px] text-text mt-1">${esc(c.headline)}</h2></div>
      ${c.items.map((it, i) => `<div class="card-surface rounded-2xl p-4 soft-shadow flex items-center gap-4"><div class="w-11 h-11 rounded-xl bg-primary/12 flex items-center justify-center text-primary text-lg shrink-0">${it.icon}</div><div class="flex-1"><p class="text-[15px] font-medium text-text">${esc(it.title)}</p><p class="text-[12px] text-muted">${esc(it.desc)}</p></div><button class="px-4 py-3 rounded-lg bg-primary text-white text-[13px] font-medium" onclick="location.href='reports-mobile.html?tab=${i === 1 ? 'navigation' : 'compass'}'">View</button></div>`).join('')}
      <div class="rounded-2xl p-5 lift-shadow" style="background:#111B34">
        <p class="text-[11px] tracking-[0.2em] uppercase text-purplelight mb-2">${esc(c.partnerEyebrow)}</p>
        <p class="font-display font-semibold text-[18px] leading-snug text-textdark">${esc(c.partnerHeadline)}</p>
        <p class="text-[13px] text-textdark/70 mt-2 leading-relaxed">${esc(isFirebaseEnabled() ? c.partnerBody : c.partnerBodyFile)}</p>
        <input id="passphrase" class="mt-4 w-full px-4 py-3 rounded-lg bg-white/5 border border-linedark text-[16px] text-textdark placeholder:text-muteddark" placeholder="${esc(c.passphrasePlaceholder)}">
        ${isFirebaseEnabled() ? `
        <div class="mt-3 rounded-lg bg-white/5 border border-linedark p-4 flex items-center justify-between">
          <div><p class="text-[10px] uppercase tracking-widest text-muteddark">${esc(c.shareCodeLabel)}</p><p id="sharecode" class="font-mono text-[24px] tracking-[0.2em] text-purplelight">— — — —</p></div>
          <button id="genshare" class="px-3.5 py-2 rounded-full bg-primarybright text-white text-[12px] font-medium">Create code</button>
        </div>
        <p id="sharestatus" class="text-[11px] text-muteddark mt-2">${esc(c.encryptionNote)}</p>
        <button id="filedl" class="mt-2 w-full py-2 text-[12px] text-muteddark underline underline-offset-2">${esc(c.fileFallback)}</button>
        ` : `
        <button id="genshare" class="mt-4 w-full py-3.5 rounded-xl bg-primarybright text-white font-medium text-[15px]">${esc(c.shareFileButton)}</button>
        <p id="sharestatus" class="text-[11px] text-muteddark mt-3 leading-relaxed">${esc(c.shareFileNote)}</p>
        `}
      </div>
      <div class="card-surface rounded-2xl p-4 soft-shadow flex items-center gap-4 opacity-70"><div class="w-11 h-11 rounded-xl bg-card3 flex items-center justify-center text-muted text-lg shrink-0">🔒</div><div class="flex-1"><p class="text-[15px] font-medium text-text">${esc(c.lockedTitle)}</p><p class="text-[12px] text-muted">${esc(c.lockedDesc)}</p></div></div>
      <div class="rounded-2xl p-5 mt-1" style="background:linear-gradient(150deg,#5B54EC,#3F37C0)">
        <p class="text-[11px] tracking-[0.2em] uppercase text-white/70 mb-1">${esc(c.actionEyebrow)}</p>
        <p class="text-[13px] text-white/85 leading-relaxed mb-3">${esc(c.actionCtaNote)}</p>
        <button id="goactions" class="w-full py-3.5 rounded-xl bg-white text-primary font-display font-semibold text-[15px] lift-shadow">${esc(c.actionCta)}</button>
      </div>
    </div>`);
  wireTopBar();
  $('#goactions').onclick = () => go('actions');

  const profile = () => ({ name: state.name, scores: state.scores });
  const passOk = () => { const p = $('#passphrase').value.trim(); if (!p) { $('#sharestatus').textContent = 'Choose a passphrase first.'; return null; } return p; };

  $('#genshare').onclick = async () => {
    const pass = passOk(); if (!pass) return;
    const bundle = await encryptProfile(profile(), pass);
    if (isFirebaseEnabled()) {
      try {
        const code = await uploadShare(bundle);
        $('#sharecode').textContent = code.split('').join(' ');
        $('#sharestatus').textContent = '🔒 Uploaded encrypted. Share the code + passphrase with your partner.';
      } catch (e) {
        $('#sharestatus').textContent = 'Upload failed — try again in a moment.';
      }
    } else {
      downloadEncryptedFile(bundle, `${(state.name || 'my').toLowerCase()}-compass.wc`);
      $('#sharestatus').textContent = '🔒 Downloaded. Send this file to your partner — they open it with the passphrase.';
    }
  };
  const fdl = $('#filedl');
  if (fdl) fdl.onclick = async () => {
    const pass = passOk(); if (!pass) return;
    const bundle = await encryptProfile(profile(), pass);
    downloadEncryptedFile(bundle, `${(state.name || 'my').toLowerCase()}-compass.wc`);
  };
}

// ============ 16b · MY ACTION LIST (persistent) ============
function renderActionList() {
  resetLight();
  if (!state.scores) { go('home'); return; }
  const c = COPY.screens.actionList;
  const items = buildActionList(ASSESSMENT, COPY, state.scores);
  state.actionsDone = state.actionsDone || {};
  const doneCount = () => items.filter((it) => state.actionsDone[it.id]).length;
  h(`${glow}
    ${topBar()}
    <div class="flex-1 overflow-y-auto px-7 pt-2 pb-10 space-y-4 relative z-10">
      <div><p class="text-xs tracking-[0.25em] uppercase text-primary">${esc(c.eyebrow)}</p>
        <h2 class="font-display font-semibold text-[24px] text-text mt-1">${esc(c.headline)}</h2>
        <p class="text-[13px] text-muted mt-2">${esc(c.subhead)}</p></div>
      <p id="aprogress" class="text-[12px] font-medium text-primary"></p>
      <div id="actionitems" class="space-y-3"></div>
      <p class="text-[12px] text-muted text-center pt-2">${esc(c.doneAll)}</p>
    </div>`);
  const listEl = $('#actionitems');
  const draw = () => {
    listEl.innerHTML = items.map((it) => {
      const done = !!state.actionsDone[it.id];
      return `<button data-id="${esc(it.id)}" class="w-full text-left card-surface rounded-2xl p-4 soft-shadow flex items-start gap-3 ${done ? 'opacity-60' : ''}">
        <span class="w-6 h-6 rounded-full shrink-0 mt-0.5 flex items-center justify-center text-[13px] ${done ? 'bg-success text-white' : 'border border-line text-transparent'}">✓</span>
        <span class="flex-1"><span class="block text-[10px] uppercase tracking-widest text-muted mb-0.5">${it.icon} ${esc(it.dim)}</span>
          <span class="block text-[14px] text-text leading-relaxed ${done ? 'line-through' : ''}">${esc(it.text)}</span></span>
      </button>`;
    }).join('');
    $('#aprogress').textContent = fill(c.progressTemplate, { done: doneCount(), total: items.length });
    listEl.querySelectorAll('[data-id]').forEach((b) => (b.onclick = () => {
      const id = b.dataset.id;
      state.actionsDone[id] = !state.actionsDone[id];
      save(); draw();
    }));
  };
  draw();
  wireTopBar();
}

// ============ 15 · CONVERSATION CARDS ============
function renderConversation() {
  resetLight();
  const c = COPY.screens.conversation;
  const cards = [];
  for (const [cat, items] of Object.entries(COPY.conversationCards)) items.forEach((q) => cards.push({ cat, q }));
  // shuffle
  for (let i = cards.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [cards[i], cards[j]] = [cards[j], cards[i]]; }
  let idx = 0;
  const draw = () => {
    const card = cards[idx];
    $('#cardslot').innerHTML = `<span class="absolute top-5 px-3 py-1 rounded-full bg-card2 text-[11px] tracking-wide text-primary uppercase">${esc(card.cat)}</span>
      <p class="font-display font-semibold text-[22px] leading-snug text-text px-2">${esc(card.q)}</p>
      <p class="absolute bottom-5 text-[11px] text-muted font-mono">${idx + 1} / ${cards.length}</p>`;
  };
  h(`${glow}
    ${topBar()}
    <div class="px-8 pt-2 text-center relative z-10">
      <p class="text-xs tracking-[0.25em] uppercase text-primary">${esc(c.eyebrow)}</p>
      <h2 class="font-display font-semibold text-[24px] text-text mt-1">${esc(c.headline)}</h2>
      <p class="text-[13px] text-muted mt-2">${esc(c.subhead)}</p>
    </div>
    <div class="flex-1 flex items-center justify-center px-8 relative z-10">
      <div id="cardslot" class="relative w-[92%] min-h-[300px] rounded-2xl bg-card lift-shadow border border-line flex flex-col items-center justify-center p-8 text-center"></div>
    </div>
    <div class="px-8 pb-4 flex justify-center gap-5 relative z-10">
      <button id="prev" class="w-14 h-14 rounded-full bg-card border border-line soft-shadow text-muted text-xl">←</button>
      <button id="next" class="w-14 h-14 rounded-full bg-primary text-white lift-shadow text-xl">→</button>
    </div>
    <div class="px-7 pb-8 relative z-10"><div class="rounded-2xl p-4 text-center" style="background:#111B34">
      <p class="text-[13px] text-textdark/80 leading-relaxed">${esc(c.goDeeper)}</p>
      <button id="godeep" class="mt-3 w-full py-3.5 rounded-xl bg-primarybright text-white font-medium text-[15px] flex items-center justify-center gap-2">${esc(c.goDeeperButton)}</button>
    </div></div>`);
  draw();
  $('#next').onclick = () => { idx = (idx + 1) % cards.length; draw(); };
  $('#prev').onclick = () => { idx = (idx - 1 + cards.length) % cards.length; draw(); };
  $('#godeep').onclick = () => go('welcome');
  wireTopBar();
}

// ============ 17 · PARTNER JOIN ============
function renderPartnerJoin() {
  resetLight();
  const c = COPY.screens.partnerJoin;
  const fb = isFirebaseEnabled();
  h(`${glow}
    ${topBar()}
    <div class="flex-1 flex flex-col justify-center px-8 relative z-10">
      <p class="text-xs tracking-[0.25em] uppercase text-primary mb-3">${esc(c.eyebrow)}</p>
      <h2 class="font-display font-semibold text-[28px] leading-snug text-text">${esc(c.headline)}</h2>
      <p class="mt-3 text-[15px] text-muted leading-relaxed">${esc(fb ? c.subhead : c.subheadFile)}</p>
      ${fb ? `<div class="mt-8"><label class="text-[13px] font-medium text-text">${esc(c.codeLabel)}</label>
        <input id="code" class="mt-2 w-full px-5 py-4 rounded-xl bg-card2 border border-line text-center font-mono text-2xl tracking-[0.35em] uppercase text-text placeholder:text-muted/40 placeholder:tracking-normal placeholder:text-[15px]" placeholder="${esc(c.codePlaceholder)}"></div>` : ''}
      <div class="mt-4"><label class="text-[13px] font-medium text-text">${esc(c.passphraseLabel)}</label>
        <input id="pass" class="mt-2 w-full px-5 py-4 rounded-xl bg-card2 border border-line text-[16px] placeholder:text-muted/60" placeholder="${esc(c.passphrasePlaceholder)}"></div>
      <p class="mt-3 text-[12px] text-muted text-center">${esc(c.encryptionNote)}</p>
      ${fb ? `<p class="mt-4 text-[13px] text-muted text-center"><label class="text-primary font-medium underline underline-offset-2 cursor-pointer">${esc(c.fallback)}<input id="file" type="file" accept=".wc,application/json" class="hidden"></label></p>` : ''}
      <p id="joinstatus" class="mt-3 text-[12px] text-center text-warn"></p>
    </div>
    <div class="px-8 pb-12 relative z-10">${fb
      ? btn(c.button, 'rounded-xl')
      : `<label class="block w-full py-4 rounded-xl bg-primary text-white font-medium text-[16px] text-center lift-shadow cursor-pointer">${esc(c.fileButton)}<input id="file" type="file" accept=".wc,application/json" class="hidden"></label>`}</div>`);
  wireTopBar();

  const finish = (partnerProfile) => {
    state.partner = partnerProfile; save();
    // if I've already finished my own assessment, go straight to the shared view
    if (state.scores) go('shared'); else go('welcome');
  };

  const fileEl = $('#file');
  if (fileEl) fileEl.onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    const pass = $('#pass').value.trim();
    if (!pass) { $('#joinstatus').textContent = 'Enter the shared passphrase, then choose the file.'; return; }
    try { const bundle = await readEncryptedFile(f); finish(await decryptProfile(bundle, pass)); }
    catch { $('#joinstatus').textContent = 'That passphrase or file didn\'t work.'; }
  };
  if (fb) $('button.bg-primary').onclick = async () => {
    const code = $('#code').value.trim(); const pass = $('#pass').value.trim();
    if (!code || !pass) { $('#joinstatus').textContent = 'Enter both the code and passphrase.'; return; }
    try { const bundle = await fetchShare(code); finish(await decryptProfile(bundle, pass)); }
    catch { $('#joinstatus').textContent = 'Couldn\'t find or decrypt that code.'; }
  };
}

// ============ 18 · OUR SHARED COMPASS ============
function renderShared() {
  if (!state.scores || !state.partner) { go('home'); return; }
  const names = { me: state.name || 'You', partner: state.partner.name || 'Partner' };
  const mine = state.scores; const theirs = state.partner.scores;
  const r = buildSharedResult(ASSESSMENT, COPY, mine, theirs, names);
  app.className = 'phone gradient-ink';
  h(`${topBar(true)}
  <div class="flex-1 flex flex-col items-center px-7 pt-4 pb-8 text-center overflow-y-auto">
    ${wave(54, 18, 4)}
    <p class="text-xs tracking-[0.3em] uppercase text-purplelight mt-4">${esc(names.me)} &amp; ${esc(names.partner)}</p>
    <h2 class="font-display font-semibold text-[28px] text-textdark mt-2">${esc(COPY.screens.shared.headline)}</h2>
    <div class="mt-5 w-full rounded-2xl p-3 border" style="background:#111B34;border-color:rgba(107,124,153,.22)"><canvas id="sharedRadar" width="300" height="300" role="img" aria-label="Overlaid radar chart comparing you and your partner across the eight compass directions."></canvas></div>
    <div class="flex gap-5 text-[12px] text-textdark/80 mt-3"><span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-primarybright"></span>${esc(names.me)}</span><span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-purplelight"></span>${esc(names.partner)}</span></div>
    <div class="mt-5 w-full rounded-2xl p-4 text-left" style="background:rgba(255,255,255,.05);border:1px solid rgba(107,124,153,.22)"><p class="text-[11px] tracking-[0.2em] uppercase text-purplelight mb-1.5">${esc(COPY.screens.shared.directionLabel)}</p><p class="text-[13px] text-textdark/85 leading-relaxed">${esc(r.sharedDirection)}</p></div>
    <div class="mt-3 w-full rounded-2xl p-4 text-left" style="background:rgba(255,255,255,.05);border:1px solid rgba(107,124,153,.22)"><p class="text-[11px] tracking-[0.2em] uppercase text-purple mb-1.5">${esc(COPY.screens.shared.focusLabel)}</p><p class="text-[13px] text-textdark/85 leading-relaxed">${esc(r.differentFocus)}</p></div>
    <p class="mt-4 text-[13px] text-textdark/70 italic px-4">${esc(r.closing)}</p>
    <button class="mt-5 w-full py-4 rounded-xl bg-primarybright text-white font-medium text-[15px] lift-shadow" onclick="location.href='reports-mobile.html?tab=shared'">${esc(COPY.screens.shared.button)}</button>
  </div>`);
  renderSharedRose($('#sharedRadar'), ASSESSMENT, mine, theirs, names);
  wireTopBar();
}

// ============ boot ============
async function boot() {
  const base = new URL('.', import.meta.url);
  [ASSESSMENT, COPY] = await Promise.all([
    fetch(new URL('data/assessment.json', base)).then((r) => r.json()),
    fetch(new URL('data/copy.json', base)).then((r) => r.json()),
  ]);
  go('home');
}
boot();
