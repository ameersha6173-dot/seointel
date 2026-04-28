/* ── SEO Intel — Core JS ── */
'use strict';

// ── STATE ──
window.SI = {
  anthropicKey: '',
  dataforseoUser: '',
  dataforseoPass: '',
  reportData: null,
  reportUrl: '',
  isAnnual: false,
  stepTimer: null,
};

// ── ROUTING ──
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const pg = document.getElementById('page-' + name);
  if (pg) pg.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── NAV ──
function showNav() { document.getElementById('main-nav').classList.add('visible'); }
function hideNav() { document.getElementById('main-nav').classList.remove('visible'); }

// ── ALERTS (setup page) ──
function showAlert(type, html) {
  ['alert-error','alert-warn','alert-info'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.classList.remove('show'); el.innerHTML = ''; }
  });
  const el = document.getElementById('alert-' + type);
  if (el) { el.innerHTML = html; el.classList.add('show'); }
}
function hideAlerts() {
  ['alert-error','alert-warn','alert-info'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('show');
  });
}

// ── ERROR (home page) ──
function setError(html) {
  const el = document.getElementById('error-msg');
  el.innerHTML = html; el.style.display = 'block';
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
function clearError() {
  const el = document.getElementById('error-msg');
  el.style.display = 'none';
}

// ── LOADING STEPS ──
const LOAD_STEPS = [
  'Crawling page structure and metadata',
  'Auditing title, meta and heading tags',
  'Analyzing images, links and speed signals',
  'Evaluating technical and mobile SEO factors',
  'Fetching real keyword ranks via DataForSEO',
  'Projecting traffic after improvements',
  'Generating improvement roadmap',
];

function startLoading() {
  const wrap = document.getElementById('loading-wrap');
  wrap.style.display = 'block';
  const list = document.getElementById('step-list');
  list.innerHTML = '';
  LOAD_STEPS.forEach((s, i) => {
    const el = document.createElement('div');
    el.className = 'step-row';
    el.style.animationDelay = i * 0.55 + 's';
    el.textContent = s;
    el.id = 'step-' + i;
    list.appendChild(el);
  });
  let idx = 0;
  SI.stepTimer = setInterval(() => {
    const items = list.querySelectorAll('.step-row');
    items.forEach(e => e.classList.remove('on'));
    if (idx < items.length) { items[idx].classList.add('on'); idx++; }
  }, 650);
}
function stopLoading() {
  if (SI.stepTimer) { clearInterval(SI.stepTimer); SI.stepTimer = null; }
  document.getElementById('loading-wrap').style.display = 'none';
}

// ── JSON EXTRACTOR ──
function extractJSON(text) {
  const stripped = text.replace(/^```(?:json)?\s*/im, '').replace(/```\s*$/m, '').trim();
  const start = stripped.indexOf('{');
  let depth = 0, end = -1;
  for (let i = start; i < stripped.length; i++) {
    if (stripped[i] === '{') depth++;
    else if (stripped[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  if (start === -1 || end === -1) throw new Error('No JSON object found in AI response.');
  const raw = stripped.slice(start, end + 1).replace(/,(\s*[}\]])/g, '$1');
  return JSON.parse(raw);
}

// ── ESCAPE HTML ──
function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── SCORE COLOR ──
function scoreColor(s) {
  return s >= 80 ? 'var(--jade)' : s >= 50 ? 'var(--amber)' : 'var(--rose)';
}

// ── RANK BADGE ──
function rankBadge(pos) {
  const p = Number(pos) || 99;
  if (p <= 3)  return `<span class="rank rank-1">#${p}</span>`;
  if (p <= 10) return `<span class="rank rank-10">#${p}</span>`;
  if (p <= 30) return `<span class="rank rank-30">#${p}</span>`;
  return `<span class="rank rank-out">#${p}</span>`;
}

// ── DELTA ──
function deltaHtml(d) {
  const n = Number(d) || 0;
  if (n > 0)  return `<span class="delta delta-up">+${n}</span>`;
  if (n < 0)  return `<span class="delta delta-down">${n}</span>`;
  return `<span class="delta delta-flat">—</span>`;
}

// ── BILLING TOGGLE ──
function toggleBilling() {
  SI.isAnnual = !SI.isAnnual;
  const t = document.getElementById('billing-toggle');
  t.classList.toggle('on', SI.isAnnual);
  document.querySelectorAll('.pro-price').forEach(el => el.textContent = SI.isAnnual ? '20' : '29');
  document.querySelectorAll('.agency-price').forEach(el => el.textContent = SI.isAnnual ? '62' : '89');
  document.querySelectorAll('.pro-note, .agency-note').forEach(el => el.style.display = SI.isAnnual ? 'block' : 'none');
}

// ── FAQ ──
function toggleFaq(btn) {
  btn.classList.toggle('open');
  btn.nextElementSibling.classList.toggle('open');
}

// ── MODAL ──
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
function openEmailModal() {
  const url = document.getElementById('url-input')?.value || '';
  if (url) document.getElementById('modal-site').value = url;
  document.getElementById('modal-form').style.display = 'block';
  document.getElementById('modal-success').style.display = 'none';
  openModal('email-modal');
}
function closeEmailModal() { closeModal('email-modal'); }

function submitEmail() {
  const name  = document.getElementById('modal-name').value.trim();
  const email = document.getElementById('modal-email').value.trim();
  if (!name || !email) { alert('Please enter your name and email.'); return; }
  document.getElementById('success-day').textContent = document.getElementById('modal-day').value;
  document.getElementById('modal-form').style.display = 'none';
  document.getElementById('modal-success').style.display = 'block';
}

// ── KEY MANAGEMENT ──
function changeKey() {
  SI.anthropicKey = ''; SI.dataforseoUser = ''; SI.dataforseoPass = '';
  try { localStorage.removeItem('si_akey'); localStorage.removeItem('si_duser'); localStorage.removeItem('si_dpass'); } catch(e) {}
  hideNav();
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-setup').classList.add('active');
  hideAlerts();
}

// ── CONNECT KEY ──
async function connectKey() {
  hideAlerts();
  const aKey  = document.getElementById('key-anthropic').value.trim();
  const dUser = document.getElementById('key-dfs-user').value.trim();
  const dPass = document.getElementById('key-dfs-pass').value.trim();

  if (!aKey) { showAlert('error', 'Please enter your Anthropic API key.'); return; }
  if (!aKey.startsWith('sk-ant-')) {
    showAlert('error', 'Anthropic key should start with <strong>sk-ant-</strong>. Please copy the full key.');
    return;
  }

  const btn = document.getElementById('connect-btn');
  const orig = btn.textContent; btn.textContent = 'Verifying...'; btn.disabled = true;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': aKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 5,
        messages: [{ role: 'user', content: 'ping' }],
      }),
    });

    const data = await res.json();

    if (res.status === 200) {
      SI.anthropicKey  = aKey;
      SI.dataforseoUser = dUser;
      SI.dataforseoPass = dPass;
      try {
        localStorage.setItem('si_akey', aKey);
        if (dUser) localStorage.setItem('si_duser', dUser);
        if (dPass) localStorage.setItem('si_dpass', dPass);
      } catch(e) {}
      showNav();
      showPage('home');
    } else {
      const msg = data?.error?.message || '';
      if (msg.toLowerCase().includes('credit') || msg.toLowerCase().includes('balance')) {
        showAlert('warn',
          `Your Anthropic key is valid but your account has no credits.<br>
           Add at least $5 at <a href="https://console.anthropic.com/settings/billing" target="_blank">console.anthropic.com/settings/billing</a>, then click Connect again.`
        );
      } else if (res.status === 401) {
        showAlert('error', 'Invalid API key. Please double-check you copied the full key.');
      } else if (res.status === 429) {
        showAlert('warn', 'Rate limit hit. Please wait a moment and try again.');
      } else {
        showAlert('error', 'Connection failed: ' + (msg || `HTTP ${res.status}`));
      }
    }
  } catch (e) {
    showAlert('error', 'Could not reach the Anthropic API. Check your internet connection.<br>Error: ' + e.message);
  }

  btn.textContent = orig; btn.disabled = false;
}

// ── AUTO-LOAD SAVED KEYS ──
window.addEventListener('DOMContentLoaded', () => {
  try {
    const aKey  = localStorage.getItem('si_akey');
    const dUser = localStorage.getItem('si_duser');
    const dPass = localStorage.getItem('si_dpass');
    if (aKey && aKey.startsWith('sk-ant-')) {
      SI.anthropicKey   = aKey;
      SI.dataforseoUser = dUser || '';
      SI.dataforseoPass = dPass || '';
      document.getElementById('key-anthropic').value = aKey;
      if (dUser) document.getElementById('key-dfs-user').value = dUser;
      if (dPass) document.getElementById('key-dfs-pass').value = dPass;
      showNav();
      showPage('home');
    }
  } catch(e) {}

  // Enter key handlers
  document.getElementById('key-anthropic')?.addEventListener('keydown', e => { if (e.key === 'Enter') connectKey(); });
  document.getElementById('url-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') analyze(); });

  // Close modals on overlay click
  document.querySelectorAll('.overlay').forEach(ov => {
    ov.addEventListener('click', function(e) { if (e.target === this) this.classList.remove('open'); });
  });
});
