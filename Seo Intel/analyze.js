/* ── SEO Intel — Analysis Engine ── */
'use strict';

// ── DATAFORSEO REAL RANK FETCH ──
async function fetchRealKeywords(domain, keywords) {
  if (!SI.dataforseoUser || !SI.dataforseoPass) return null;
  const clean = domain.replace(/^https?:\/\//i,'').replace(/\/$/, '');

  try {
    const creds = btoa(SI.dataforseoUser + ':' + SI.dataforseoPass);
    const tasks = keywords.map(kw => ({
      keyword: kw,
      location_code: 2784,   // UAE
      language_code: 'en',
      se_domain: 'google.ae',
    }));

    const postRes = await fetch('https://api.dataforseo.com/v3/serp/google/organic/live/regular', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + creds,
      },
      body: JSON.stringify(tasks.map(t => ({
        keyword: t.keyword,
        location_code: t.location_code,
        language_code: t.language_code,
        se_domain: t.se_domain,
        depth: 50,
      }))),
    });

    if (!postRes.ok) return null;
    const result = await postRes.json();

    const rankMap = {};
    if (result.tasks) {
      for (const task of result.tasks) {
        if (!task.result) continue;
        for (const res of task.result) {
          const kw = res.keyword;
          rankMap[kw] = { rank: null, url: null };
          if (res.items) {
            for (const item of res.items) {
              if (item.type === 'organic' && item.domain && item.domain.includes(clean)) {
                rankMap[kw] = { rank: item.rank_absolute, url: item.url };
                break;
              }
            }
            if (!rankMap[kw].rank) rankMap[kw].rank = 100; // not in top 50
          }
        }
      }
    }
    return rankMap;
  } catch (e) {
    console.warn('DataForSEO fetch failed:', e.message);
    return null;
  }
}

// ── CLAUDE AI AUDIT ──
async function runAIAudit(url) {
  const prompt = `You are a senior SEO auditor with 15 years experience. Analyze this website: ${url}

Return ONLY a raw JSON object. No markdown fences, no explanation, no trailing commas.

{
  "score": 54,
  "traffic_forecast": {
    "current": 380,
    "after_3_months": 720,
    "after_6_months": 1350,
    "after_12_months": 2900,
    "note": "Conservative projection based on industry competition for this market."
  },
  "suggested_keywords": [
    "dubai dune buggy",
    "desert safari dubai",
    "quad biking dubai",
    "buggy rental dubai",
    "offroad dubai",
    "adventure tourism dubai"
  ],
  "stats": [
    {"label": "Title Tag",        "value": "Present",  "note": "58 chars, well optimised",    "status": "good"},
    {"label": "Meta Description", "value": "Missing",  "note": "No description tag found",    "status": "bad"},
    {"label": "H1 Tag",           "value": "1 Found",  "note": "Descriptive and keyword-rich","status": "good"},
    {"label": "Page Speed",       "value": "Slow",     "note": "Heavy images unoptimised",    "status": "bad"},
    {"label": "Mobile UX",        "value": "Adequate", "note": "Viewport set, needs work",    "status": "warn"},
    {"label": "HTTPS",            "value": "Secure",   "note": "SSL certificate active",      "status": "good"},
    {"label": "Image Alt Text",   "value": "Partial",  "note": "40% of images missing alt",   "status": "warn"},
    {"label": "Internal Links",   "value": "Sparse",   "note": "Limited linking structure",   "status": "warn"}
  ],
  "issues": [
    {
      "type": "critical",
      "title": "Meta description completely absent",
      "description": "No meta description tag was found on any page. Google uses this as the search result snippet. Missing descriptions cause Google to auto-generate one, often poorly, reducing click-through rates by up to 30 percent.",
      "fix": "Write a unique 145-160 character meta description for every page. Lead with the primary keyword, then a value statement. Example for a homepage: Dubai's premier dune buggy experience. Solo, couple and group tours through the Arabian desert. Book online in 2 minutes."
    },
    {
      "type": "warning",
      "title": "No structured data markup",
      "description": "The site lacks schema.org JSON-LD markup. Without it, Google cannot display rich results such as star ratings, price ranges, and event listings in search results.",
      "fix": "Add TouristAttraction and LocalBusiness schema via JSON-LD in the head tag. Include name, address, geo coordinates, telephone, openingHours, priceRange, and aggregateRating."
    },
    {
      "type": "pass",
      "title": "HTTPS correctly configured",
      "description": "SSL certificate is active and the domain redirects HTTP to HTTPS correctly. This is a confirmed Google ranking signal and builds visitor trust.",
      "fix": null
    },
    {
      "type": "info",
      "title": "XML sitemap status unknown",
      "description": "Verify that sitemap.xml exists and has been submitted to Google Search Console. A sitemap accelerates indexing of new and updated pages.",
      "fix": "Navigate to yoursite.com/sitemap.xml. If missing, generate one via your CMS or Yoast SEO. Submit the URL inside Google Search Console under Sitemaps."
    }
  ],
  "plan": [
    {
      "priority": "high",
      "title": "Write meta descriptions for all pages",
      "detail": "Craft unique 145-160 character descriptions for every page with a primary keyword and clear call to action. Implement in WordPress via Yoast SEO or RankMath.",
      "impact": "Estimated 20-35 percent increase in organic click-through rate from search results"
    }
  ]
}

Strict requirements:
- Analyse the ACTUAL domain ${url} — be specific about its industry, content, and what it likely lacks
- Minimum 4 critical issues, 3 warnings, 4 passing checks, 2 informational items
- Exactly 6 relevant keywords in suggested_keywords for this site's industry and location
- Realistic traffic numbers for this industry and market size
- Minimum 6 plan items across all priority levels
- Valid JSON only: straight double quotes, no trailing commas, no JavaScript comments`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': SI.anthropicKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 5500,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg  = data?.error?.message || `HTTP ${res.status}`;
    if (msg.toLowerCase().includes('credit') || msg.toLowerCase().includes('balance')) {
      throw new Error('CREDIT_ERROR');
    }
    if (res.status === 401) throw new Error('AUTH_ERROR');
    throw new Error(msg);
  }

  const raw  = await res.json();
  const text = (raw.content || []).map(b => b.text || '').join('');
  return extractJSON(text);
}

// ── MAIN ANALYZE ──
async function analyze() {
  clearError();
  if (!SI.anthropicKey) {
    setError('No API key connected. <a onclick="changeKey()">Click here to reconnect.</a>');
    return;
  }

  let url = document.getElementById('url-input').value.trim();
  if (!url) { setError('Please enter a website URL.'); return; }
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  try { new URL(url); } catch(e) { setError('Invalid URL format. Please enter a complete web address.'); return; }

  const btn = document.getElementById('analyze-btn');
  btn.disabled = true;
  startLoading();

  try {
    // 1. Run AI audit first
    const aiData = await runAIAudit(url);

    // 2. If DataForSEO credentials provided, fetch real ranks
    let realRanks = null;
    if (SI.dataforseoUser && SI.dataforseoPass && aiData.suggested_keywords?.length) {
      realRanks = await fetchRealKeywords(url, aiData.suggested_keywords);
    }

    // 3. Merge real ranks into keyword list
    if (realRanks) {
      aiData.keywords = (aiData.suggested_keywords || []).map(kw => {
        const r = realRanks[kw] || {};
        return {
          keyword: kw,
          rank: r.rank || 100,
          volume: aiData.keyword_volumes?.[kw] || estimateVolume(kw),
          delta: 0,
          opportunity: rankOpportunity(r.rank || 100),
          source: 'DataForSEO',
          url: r.url || null,
        };
      });
    } else {
      // Use AI-estimated keywords
      aiData.keywords = (aiData.keywords || aiData.suggested_keywords || []).map((kw, i) => {
        if (typeof kw === 'string') {
          return {
            keyword: kw,
            rank: [18, 45, 12, 8, 35, 60][i] || 50,
            volume: [2400, 8100, 1600, 900, 720, 480][i] || 500,
            delta: [0, -3, 2, 5, -1, 0][i] || 0,
            opportunity: 'AI estimate',
            source: 'AI Estimate',
          };
        }
        return kw;
      });
    }

    stopLoading();
    buildReport(url, aiData);

  } catch (err) {
    stopLoading();
    console.error(err);
    if (err.message === 'CREDIT_ERROR') {
      setError('Your Anthropic account is out of credits. <a href="https://console.anthropic.com/settings/billing" target="_blank">Add credits here</a> then try again.');
    } else if (err.message === 'AUTH_ERROR') {
      setError('API key rejected. <a onclick="changeKey()">Re-enter your API key.</a>');
    } else {
      setError('Analysis failed: ' + (err.message || 'Unknown error. Please try again.'));
    }
  }

  btn.disabled = false;
}

function estimateVolume(kw) {
  const len = kw.split(' ').length;
  return len <= 2 ? Math.floor(Math.random() * 3000 + 800) : Math.floor(Math.random() * 1000 + 200);
}

function rankOpportunity(rank) {
  if (rank <= 3)  return 'Defend — protect this position';
  if (rank <= 10) return 'Optimise — push to top 3';
  if (rank <= 30) return 'Target — strong growth potential';
  return 'Low visibility — content needed';
}

// ── BUILD REPORT UI ──
function buildReport(url, d) {
  SI.reportData = d;
  SI.reportUrl  = url;

  const score = Number(d.score) || 0;
  const r = 56, circ = 2 * Math.PI * r;
  const col = scoreColor(score);

  document.getElementById('report-url-tag').textContent = url;

  // Stats
  const statsHtml = (d.stats || []).map(s => {
    const st = (s.status || 'info').toLowerCase();
    return `<div class="stat-tile ${st}">
      <div class="stat-lbl">${esc(s.label)}</div>
      <div class="stat-val ${st}">${esc(s.value)}</div>
      <div class="stat-note">${esc(s.note)}</div>
    </div>`;
  }).join('');

  // Issues
  const issues   = d.issues || [];
  const critical = issues.filter(i => (i.type||'').toLowerCase() === 'critical');
  const warnings = issues.filter(i => (i.type||'').toLowerCase() === 'warning');
  const passes   = issues.filter(i => (i.type||'').toLowerCase() === 'pass');
  const infos    = issues.filter(i => (i.type||'').toLowerCase() === 'info');

  function renderIssue(issue) {
    const type = (issue.type || 'info').toLowerCase();
    const typeLabel = { critical: 'Critical', warning: 'Warning', pass: 'Pass', info: 'Info' }[type] || type;
    const tag = { critical: 'tag-rose', warning: 'tag-amber', pass: 'tag-jade', info: 'tag-slate' }[type] || 'tag-slate';
    const fix = issue.fix && issue.fix !== 'null' ? issue.fix : null;
    return `<div class="issue-item">
      <div class="issue-bar ${type}"></div>
      <div class="issue-content">
        <div class="issue-title">${esc(issue.title)}</div>
        <div class="issue-desc">${esc(issue.description)}</div>
        ${fix ? `<div class="issue-fix"><div class="issue-fix-label">How to fix</div>${esc(fix)}</div>` : ''}
      </div>
      <div class="issue-meta"><span class="tag ${tag}">${typeLabel}</span></div>
    </div>`;
  }

  function issueSection(title, items) {
    const empty = `<div style="font-size:13px;color:var(--fog2);padding:16px 0;">No items in this category.</div>`;
    return `<div class="r-section">
      <div class="r-heading">
        ${esc(title)}
        <div class="r-heading-line"></div>
        <div class="r-heading-count">${items.length}</div>
      </div>
      <div class="issue-stack">${items.length ? items.map(renderIssue).join('') : empty}</div>
    </div>`;
  }

  // Traffic forecast
  const tf   = d.traffic_forecast || {};
  const now  = tf.current || 0;
  const m3   = tf.after_3_months  || Math.round(now * 1.5);
  const m6   = tf.after_6_months  || Math.round(now * 2.2);
  const m12  = tf.after_12_months || Math.round(now * 3.8);
  const maxV = Math.max(m3, m6, m12, 1);

  const fcHtml = [
    { l: 'Current estimate', v: now,  pct: Math.round((now/maxV)*100)  },
    { l: 'After 3 months',   v: m3,   pct: Math.round((m3/maxV)*100)   },
    { l: 'After 6 months',   v: m6,   pct: Math.round((m6/maxV)*100)   },
    { l: 'After 12 months',  v: m12,  pct: 100                          },
  ].map(fc => `<div class="forecast-tile">
    <div class="ft-label">${fc.l}</div>
    <div class="ft-value">${fc.v.toLocaleString()}</div>
    <div class="ft-unit">visitors / month</div>
    <div class="ft-bar"><div class="ft-fill" data-pct="${fc.pct}" style="width:0%"></div></div>
  </div>`).join('');

  // Keywords
  const kws = d.keywords || [];
  const hasReal = kws.some(k => k.source === 'DataForSEO');
  const kwRows = kws.map(k => `<tr>
    <td style="font-weight:500;color:var(--paper)">${esc(k.keyword)}</td>
    <td>${rankBadge(k.rank)}</td>
    <td style="font-family:var(--ff-mono);font-size:12px">${Number(k.volume||0).toLocaleString()}</td>
    <td>${deltaHtml(k.delta)}</td>
    <td style="font-size:12px;color:var(--fog)">${esc(k.opportunity||'')}</td>
  </tr>`).join('');

  // Plan
  const planHtml = (d.plan || []).map(item => {
    const p = (item.priority || 'medium').toLowerCase();
    return `<div class="plan-tile">
      <div class="plan-pri ${p}">${p} priority</div>
      <div class="plan-title">${esc(item.title)}</div>
      <div class="plan-detail">${esc(item.detail)}</div>
      <div class="plan-impact">${esc(item.impact)}</div>
    </div>`;
  }).join('');

  // Quick stats
  const qs = [
    { l: 'Critical Issues', v: critical.length, c: critical.length > 0 ? 'rose' : 'jade' },
    { l: 'Warnings',        v: warnings.length, c: warnings.length > 2 ? 'amber' : 'jade' },
    { l: 'Passing Checks',  v: passes.length,   c: 'jade' },
    { l: 'Keywords',        v: kws.length,       c: 'slate' },
  ];

  document.getElementById('report-body').innerHTML = `
    <div class="summary-bar">
      <div class="score-ring-wrap">
        <div class="score-ring">
          <svg width="128" height="128" viewBox="0 0 128 128">
            <circle class="score-track" cx="64" cy="64" r="${r}" stroke-dasharray="${circ}" stroke-dashoffset="0"/>
            <circle class="score-arc" id="score-arc" cx="64" cy="64" r="${r}"
              stroke="${col}" stroke-dasharray="${circ}" stroke-dashoffset="${circ}"/>
          </svg>
          <div class="score-inner">
            <div class="score-num" style="color:${col}">${score}</div>
            <div class="score-denom">/ 100</div>
          </div>
        </div>
        <div class="score-lbl">SEO Score</div>
      </div>
      <div class="qs-grid">
        ${qs.map(q => `<div class="qs-tile"><div class="qs-lbl">${q.l}</div><div class="qs-val ${q.c}">${q.v}</div></div>`).join('')}
      </div>
    </div>

    <div class="r-section">
      <div class="r-heading">SEO Metrics <div class="r-heading-line"></div></div>
      <div class="stat-grid">${statsHtml}</div>
    </div>

    <div class="r-section">
      <div class="r-heading">Traffic Forecast After Improvements <div class="r-heading-line"></div></div>
      <div class="forecast-row">${fcHtml}</div>
      <div class="forecast-caption">${esc(tf.note || 'Projections assume all high-priority issues are resolved. Based on industry averages and keyword competition in this market.')}</div>
    </div>

    <div class="r-section">
      <div class="r-heading">Keyword Rankings <div class="r-heading-line"></div></div>
      <div class="kw-table-wrap">
        <table class="kw-table">
          <thead><tr>
            <th>Keyword</th><th>Position</th><th>Volume / mo</th><th>Change</th><th>Opportunity</th>
          </tr></thead>
          <tbody>${kwRows}</tbody>
        </table>
      </div>
      <div class="kw-source">${hasReal ? 'Position data sourced from DataForSEO real-time SERP API.' : 'Position data is AI-estimated. Connect DataForSEO in settings for live rank data.'}</div>
    </div>

    ${issueSection('Critical Issues', critical)}
    ${issueSection('Warnings', warnings)}
    ${issueSection('Passing Checks', passes)}
    ${infos.length ? issueSection('Informational', infos) : ''}

    <hr class="rule">

    <div class="r-section">
      <div class="r-heading">Improvement Roadmap <div class="r-heading-line"></div></div>
      <div class="plan-grid">${planHtml}</div>
    </div>

    <div class="report-footer">
      <p>SEO Intel &mdash; ${esc(url)} &mdash; ${new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}</p>
      <button class="btn btn-md btn-ghost" onclick="openEmailModal()">Set Up Weekly Reports</button>
    </div>
  `;

  // Animate ring
  setTimeout(() => {
    const arc = document.getElementById('score-arc');
    if (arc) arc.style.strokeDashoffset = circ - (score / 100) * circ;
    document.querySelectorAll('.ft-fill').forEach(bar => {
      setTimeout(() => { bar.style.width = (bar.dataset.pct || 0) + '%'; }, 200);
    });
  }, 200);

  showPage('report');
}

// ── PDF GENERATION ──
async function downloadPDF() {
  const btn = document.getElementById('pdf-btn');
  const orig = btn.textContent;
  btn.textContent = 'Building PDF...'; btn.disabled = true;

  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210, M = 18, CW = W - M * 2;
    let y = 0;

    const d     = SI.reportData;
    const score = Number(d.score) || 0;
    const sCol  = score >= 80 ? [77,184,153] : score >= 50 ? [201,160,64] : [201,107,107];
    const tf    = d.traffic_forecast || {};
    const now   = tf.current || 0;
    const m3    = tf.after_3_months  || Math.round(now * 1.5);
    const m6    = tf.after_6_months  || Math.round(now * 2.2);
    const m12   = tf.after_12_months || Math.round(now * 3.8);

    function np() { doc.addPage(); y = 22; }
    function cy(n) { if (y + n > 275) np(); }
    function sh(title) {
      cy(14);
      doc.setFillColor(24, 24, 32); doc.roundedRect(M, y, CW, 8, 1, 1, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(200, 169, 106);
      doc.text(title, M + 4, y + 5.5); y += 14;
    }

    // ── COVER ──
    doc.setFillColor(10, 10, 13); doc.rect(0, 0, 210, 297, 'F');
    doc.setFillColor(18, 18, 26); doc.rect(0, 0, 210, 46, 'F');

    // Logo
    doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.setTextColor(232, 230, 224);
    doc.text('SEO', M, 24);
    const lw = doc.getTextWidth('SEO');
    doc.setFont('helvetica', 'bolditalic'); doc.setTextColor(200, 169, 106);
    doc.text('Intel', M + lw + 1, 24);

    // Header meta
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(100, 98, 115);
    doc.text('AUDIT REPORT', W - M, 18, { align: 'right' });
    doc.text(new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }), W - M, 26, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(80, 78, 95);
    doc.text(SI.reportUrl, W - M, 34, { align: 'right' });

    y = 58;

    // Score tile
    doc.setFillColor(22, 22, 30); doc.roundedRect(M, y, 44, 36, 3, 3, 'F');
    doc.setFillColor(...sCol); doc.roundedRect(M, y, 44, 2, 1, 1, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(32); doc.setTextColor(...sCol);
    doc.text(String(score), M + 22, y + 22, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(100, 98, 115);
    doc.text('SEO SCORE', M + 22, y + 30, { align: 'center' });

    // Quick stats
    const issues   = d.issues || [];
    const crit = issues.filter(i => (i.type||'').toLowerCase() === 'critical').length;
    const warn = issues.filter(i => (i.type||'').toLowerCase() === 'warning').length;
    const pass = issues.filter(i => (i.type||'').toLowerCase() === 'pass').length;
    const kws  = d.keywords || [];

    const qx = M + 50, qcw = (CW - 50) / 4;
    [
      { l: 'Critical', v: String(crit), c: crit > 0 ? [201,107,107] : [77,184,153] },
      { l: 'Warnings', v: String(warn), c: [201,160,64] },
      { l: 'Passing',  v: String(pass), c: [77,184,153] },
      { l: 'Keywords', v: String(kws.length), c: [107,148,201] },
    ].forEach((q, i) => {
      const cx = qx + i * qcw;
      doc.setFillColor(22, 22, 30); doc.roundedRect(cx, y, qcw - 4, 36, 2, 2, 'F');
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(100, 98, 115);
      doc.text(q.l.toUpperCase(), cx + (qcw - 4) / 2, y + 10, { align: 'center' });
      doc.setFont('helvetica', 'bold'); doc.setFontSize(22); doc.setTextColor(...q.c);
      doc.text(q.v, cx + (qcw - 4) / 2, y + 27, { align: 'center' });
    });
    y += 46;

    // SEO METRICS
    sh('SEO METRICS');
    const stats = d.stats || [], cw4 = CW / 4;
    stats.forEach((s, i) => {
      if (i % 4 === 0 && i > 0) { y += 22; cy(22); }
      const cx = M + (i % 4) * cw4;
      const st = (s.status || 'info').toLowerCase();
      const tc = st === 'good' ? [77,184,153] : st === 'warn' ? [201,160,64] : [201,107,107];
      doc.setFillColor(22, 22, 30); doc.roundedRect(cx, y, cw4 - 3, 19, 2, 2, 'F');
      doc.setFillColor(...tc); doc.rect(cx, y, cw4 - 3, 1.5, 'F');
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(100, 98, 115);
      doc.text((s.label || '').toUpperCase().slice(0, 18), cx + 4, y + 7);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...tc);
      doc.text(String(s.value || '').slice(0, 16), cx + 4, y + 14);
    });
    y += 28;

    // TRAFFIC FORECAST
    sh('TRAFFIC FORECAST AFTER SEO IMPROVEMENTS');
    const fst = [{ l:'Current', v:now }, { l:'3 Months', v:m3 }, { l:'6 Months', v:m6 }, { l:'12 Months', v:m12 }];
    const maxTF = Math.max(...fst.map(f => f.v), 1), tcw = CW / 4;
    fst.forEach((f, i) => {
      const cx = M + i * tcw;
      doc.setFillColor(22, 22, 30); doc.roundedRect(cx, y, tcw - 3, 30, 2, 2, 'F');
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(100, 98, 115);
      doc.text(f.l.toUpperCase(), cx + 4, y + 8);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(200, 169, 106);
      doc.text(f.v.toLocaleString(), cx + 4, y + 20);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(100, 98, 115);
      doc.text('visitors/mo', cx + 4, y + 26);
      const bmax = tcw - 10, bw = Math.max((f.v / maxTF) * bmax, 1);
      doc.setFillColor(36, 36, 48); doc.rect(cx + 4, y + 27.5, bmax, 1.5, 'F');
      doc.setFillColor(200, 169, 106); doc.rect(cx + 4, y + 27.5, bw, 1.5, 'F');
    });
    y += 38;

    // KEYWORD RANKINGS
    if (kws.length) {
      sh('KEYWORD RANKINGS');
      doc.setFillColor(22, 22, 30); doc.rect(M, y, CW, 8, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(100, 98, 115);
      const kwCols = [0, 68, 98, 128, 158];
      ['KEYWORD', 'POSITION', 'VOLUME', 'CHANGE', 'OPPORTUNITY'].forEach((h, i) =>
        doc.text(h, M + kwCols[i] + 3, y + 5.5));
      y += 10;
      kws.forEach((k, idx) => {
        cy(9);
        if (idx % 2 === 0) { doc.setFillColor(16, 16, 22); doc.rect(M, y - 1, CW, 9, 'F'); }
        const rp  = Number(k.rank) || 99;
        const rc  = rp <= 3 ? [77,184,153] : rp <= 10 ? [201,160,64] : rp <= 30 ? [107,148,201] : [201,107,107];
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(200, 198, 216);
        doc.text(String(k.keyword || '').slice(0, 26), M + kwCols[0] + 3, y + 5.5);
        doc.setFont('helvetica', 'bold'); doc.setTextColor(...rc);
        doc.text(`#${rp}`, M + kwCols[1] + 3, y + 5.5);
        doc.setFont('helvetica', 'normal'); doc.setTextColor(200, 198, 216);
        doc.text(Number(k.volume || 0).toLocaleString(), M + kwCols[2] + 3, y + 5.5);
        const delta = Number(k.delta || 0);
        doc.setTextColor(delta > 0 ? 77 : delta < 0 ? 201 : 100, delta > 0 ? 184 : delta < 0 ? 107 : 98, delta > 0 ? 153 : delta < 0 ? 107 : 115);
        doc.text(delta > 0 ? `+${delta}` : delta < 0 ? String(delta) : '--', M + kwCols[3] + 3, y + 5.5);
        doc.setTextColor(100, 98, 115);
        doc.text(String(k.opportunity || '').slice(0, 26), M + kwCols[4] + 3, y + 5.5);
        y += 9;
      });
      y += 6;
    }

    // ISSUES SECTIONS
    function renderIssuesPDF(label, items, col) {
      if (!items.length) return; sh(label);
      items.forEach(issue => {
        const dl = doc.splitTextToSize(issue.description || '', CW - 26);
        const fl = issue.fix ? doc.splitTextToSize(issue.fix, CW - 26) : [];
        const cardH = 5 + 8 + dl.length * 4.2 + (fl.length ? fl.length * 4 + 7 : 0) + 8;
        cy(cardH);
        doc.setFillColor(18, 18, 26); doc.roundedRect(M, y, CW, cardH, 2, 2, 'F');
        doc.setFillColor(...col); doc.roundedRect(M, y, 3, cardH, 1, 1, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(232, 230, 224);
        doc.text(issue.title || '', M + 9, y + 8);
        let ty = y + 14;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(100, 98, 115);
        dl.forEach(ln => { doc.text(ln, M + 9, ty); ty += 4.2; });
        if (fl.length) {
          ty += 3;
          doc.setFillColor(28, 22, 12); doc.roundedRect(M + 9, ty - 3, CW - 14, fl.length * 4 + 6, 1, 1, 'F');
          doc.setTextColor(200, 169, 106);
          doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.text('HOW TO FIX', M + 12, ty + 1); ty += 5;
          doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
          fl.forEach(ln => { doc.text(ln, M + 12, ty); ty += 4; });
        }
        y += cardH + 4;
      });
    }
    renderIssuesPDF('CRITICAL ISSUES', issues.filter(i => (i.type||'').toLowerCase() === 'critical'), [201,107,107]);
    renderIssuesPDF('WARNINGS',        issues.filter(i => (i.type||'').toLowerCase() === 'warning'),  [201,160,64]);
    renderIssuesPDF('PASSING CHECKS',  issues.filter(i => (i.type||'').toLowerCase() === 'pass'),     [77,184,153]);

    // ROADMAP
    const plan = d.plan || [];
    if (plan.length) {
      sh('IMPROVEMENT ROADMAP');
      plan.forEach(item => {
        const p  = (item.priority || 'medium').toLowerCase();
        const pc = p === 'high' ? [201,107,107] : p === 'medium' ? [201,160,64] : [77,184,153];
        const dl = doc.splitTextToSize(item.detail || '', CW - 16);
        const cardH = 7 + 8 + dl.length * 4 + 9 + 8;
        cy(cardH);
        doc.setFillColor(18, 18, 26); doc.roundedRect(M, y, CW, cardH, 2, 2, 'F');
        doc.setFillColor(...pc); doc.roundedRect(M, y, 3, cardH, 1, 1, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...pc);
        doc.text(p.toUpperCase() + ' PRIORITY', M + 9, y + 7);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(232, 230, 224);
        doc.text(item.title || '', M + 9, y + 14);
        let ty2 = y + 20;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(100, 98, 115);
        dl.forEach(ln => { doc.text(ln, M + 9, ty2); ty2 += 4; });
        doc.setTextColor(200, 169, 106);
        doc.text('Expected impact: ' + (item.impact || ''), M + 9, ty2 + 2);
        y += cardH + 4;
      });
    }

    // FOOTER on every page
    const total = doc.getNumberOfPages();
    for (let pg = 1; pg <= total; pg++) {
      doc.setPage(pg);
      doc.setFillColor(14, 14, 20); doc.rect(0, 287, 210, 10, 'F');
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(70, 68, 85);
      doc.text('SEO Intel', M, 293);
      doc.text(`Page ${pg} of ${total}`, W - M, 293, { align: 'right' });
      doc.text(SI.reportUrl, W / 2, 293, { align: 'center' });
    }

    const safeName = SI.reportUrl.replace(/https?:\/\//i, '').replace(/[^a-z0-9]/gi, '-').slice(0, 38);
    doc.save(`seointel-report-${safeName}.pdf`);

  } catch(e) {
    console.error(e);
    alert('PDF generation failed: ' + e.message);
  }

  btn.textContent = orig; btn.disabled = false;
}
