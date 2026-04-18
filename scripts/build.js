#!/usr/bin/env node

/**
 * Collapse Signal — Build Script
 * Reads posts/*.json → generates /signal/{slug}/index.html + /signal/index.html + rss.xml
 * Run: node scripts/build.js
 * Output goes to /dist/
 */

const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://collapse.chartreuseexplosives.com';
const SITE_TITLE = 'The Signal — Collapse Risk Instrument';
const SITE_DESCRIPTION = 'Public figure legitimacy collapse analysis. Five variables. Real-time verdicts.';

const postsDir = path.join(__dirname, '../posts');
const signalDir = path.join(__dirname, '../signal');

// Ensure output dirs exist
fs.mkdirSync(signalDir, { recursive: true });

// Load all posts
const postFiles = fs.readdirSync(postsDir).filter(f => f.endsWith('.json'));
const posts = postFiles
  .map(f => {
    const raw = fs.readFileSync(path.join(postsDir, f), 'utf8');
    return JSON.parse(raw);
  })
  .sort((a, b) => new Date(b.date_published) - new Date(a.date_published));

// ── Helpers ──────────────────────────────────────────────────────────────────

const stageLabel = (n) => ['Zero', 'Drift', 'Erosion', 'Acceleration', 'Collapse', 'Inversion'][n] || n;
const stageColor = (n) => ['#4ade80','#facc15','#fb923c','#f87171','#ef4444','#dc2626'][n] || '#888';
const rootCauseLabel = (r) => r === 'betrayal' ? 'Betrayal' : 'Shame';
const depthLabel = (d) => ({
  'surface fans': 'Surface',
  'moderate': 'Moderate',
  'true believers': 'True Believers'
}[d] || d);

const escapeXml = (str) => str
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const formatDate = (str) => {
  const d = new Date(str + 'T12:00:00Z');
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

// ── Shared CSS ────────────────────────────────────────────────────────────────

const sharedCSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #0a0a0a;
    --bg2: #111;
    --bg3: #1a1a1a;
    --border: #222;
    --text: #e8e8e8;
    --muted: #666;
    --accent: #c8f035;
    --danger: #ef4444;
    --mono: 'IBM Plex Mono', monospace;
    --sans: 'IBM Plex Sans', sans-serif;
  }

  html { background: var(--bg); color: var(--text); font-family: var(--sans); font-size: 16px; }
  body { min-height: 100vh; }

  a { color: var(--accent); text-decoration: none; }
  a:hover { text-decoration: underline; }

  .nav {
    display: flex; align-items: center; justify-content: space-between;
    padding: 1.25rem 2rem; border-bottom: 1px solid var(--border);
    font-family: var(--mono); font-size: 0.75rem; letter-spacing: 0.08em;
  }
  .nav-brand { color: var(--accent); font-weight: 600; text-transform: uppercase; }
  .nav-links { display: flex; gap: 2rem; }
  .nav-links a { color: var(--muted); }
  .nav-links a:hover { color: var(--text); text-decoration: none; }

  .score-pill {
    display: inline-flex; align-items: center; gap: 0.4rem;
    font-family: var(--mono); font-size: 0.7rem; font-weight: 600;
    padding: 0.2rem 0.6rem; border-radius: 2px; letter-spacing: 0.06em;
    text-transform: uppercase; color: #000;
  }

  footer {
    border-top: 1px solid var(--border); padding: 2rem;
    font-family: var(--mono); font-size: 0.7rem; color: var(--muted);
    display: flex; justify-content: space-between; align-items: center; margin-top: 4rem;
  }
`;

// ── Nav HTML ──────────────────────────────────────────────────────────────────

const navHTML = `
  <nav class="nav">
    <a class="nav-brand" href="${SITE_URL}">Collapse Risk Instrument</a>
    <div class="nav-links">
      <a href="${SITE_URL}/signal/">The Signal</a>
      <a href="${SITE_URL}/about">Framework</a>
      <a href="${SITE_URL}/signal/rss.xml">RSS</a>
      <a href="${SITE_URL}">Run Analysis</a>
    </div>
  </nav>
`;

// ── Individual Post Page ──────────────────────────────────────────────────────

function buildPostPage(post) {
  const postURL = `${SITE_URL}/signal/${post.slug}/`;
  const stage = post.collapse_stage;
  const sColor = stageColor(stage);

  const variableBlocks = Object.entries(post.variables).map(([key, v]) => {
    const label = {
      contract_drift: 'Contract Drift',
      root_cause: 'Root Cause',
      contract_depth: 'Contract Depth',
      collapse_stage: 'Collapse Stage',
      immunity_load: 'Immunity Load'
    }[key] || key;

    const score = v.score !== undefined ? v.score
      : v.stage !== undefined ? v.stage
      : v.type || v.level || '';

    return `
      <div class="variable-block">
        <div class="variable-header">
          <span class="variable-label">${label}</span>
          <span class="variable-score">${score}</span>
        </div>
        <p class="variable-analysis">${v.analysis}</p>
      </div>
    `;
  }).join('');

  const sourceLinks = post.sources.map(s =>
    `<li><a href="${s.url}" target="_blank" rel="noopener noreferrer">${s.label} ↗</a></li>`
  ).join('');

  const categoryTag = post.subcategory
    ? `${post.category} / ${post.subcategory}`
    : post.category;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${post.subject} — Collapse Risk Analysis</title>
  <meta name="description" content="${post.verdict}">
  <link rel="canonical" href="${postURL}">

  <!-- OG -->
  <meta property="og:type" content="article">
  <meta property="og:url" content="${postURL}">
  <meta property="og:title" content="${post.subject} — Collapse Risk Analysis">
  <meta property="og:description" content="${post.verdict}">
  <meta property="og:site_name" content="Collapse Risk Instrument">

  <!-- Twitter -->
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${post.subject} — Stage ${stage}: ${stageLabel(stage)}">
  <meta name="twitter:description" content="${post.verdict}">

  <!-- Article metadata -->
  <meta property="article:published_time" content="${post.date_published}">
  <meta property="article:modified_time" content="${post.date_updated}">

  <!-- RSS -->
  <link rel="alternate" type="application/rss+xml" title="${SITE_TITLE}" href="${SITE_URL}/signal/rss.xml">

  <style>
    ${sharedCSS}

    .post-hero {
      padding: 3rem 2rem 2rem;
      border-bottom: 1px solid var(--border);
      max-width: 800px;
    }

    .post-meta {
      font-family: var(--mono); font-size: 0.7rem; color: var(--muted);
      letter-spacing: 0.06em; text-transform: uppercase;
      display: flex; gap: 1.5rem; flex-wrap: wrap; margin-bottom: 1.5rem;
    }

    .post-subject {
      font-size: clamp(2rem, 5vw, 3.5rem); font-weight: 300;
      line-height: 1.1; letter-spacing: -0.02em; margin-bottom: 1rem;
    }

    .post-verdict {
      font-size: 1.1rem; color: var(--muted); line-height: 1.6;
      font-weight: 300; max-width: 600px;
    }

    .stage-display {
      display: flex; align-items: center; gap: 1rem; margin: 2rem 0;
      padding: 1.5rem; background: var(--bg2); border: 1px solid var(--border);
      border-left: 3px solid ${sColor};
    }

    .stage-number {
      font-family: var(--mono); font-size: 3rem; font-weight: 600;
      color: ${sColor}; line-height: 1;
    }

    .stage-info { display: flex; flex-direction: column; gap: 0.25rem; }
    .stage-name { font-family: var(--mono); font-size: 0.8rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.1em; }
    .stage-label-text { font-size: 1.1rem; font-weight: 500; }

    .post-body { max-width: 800px; padding: 2rem; }

    .section-label {
      font-family: var(--mono); font-size: 0.65rem; color: var(--muted);
      text-transform: uppercase; letter-spacing: 0.12em;
      margin-bottom: 1rem; margin-top: 2.5rem;
      border-bottom: 1px solid var(--border); padding-bottom: 0.5rem;
    }

    .summary-text {
      font-size: 1rem; line-height: 1.8; color: #ccc; font-weight: 300;
    }

    .scores-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 1px; background: var(--border); margin: 1.5rem 0;
    }

    .score-cell {
      background: var(--bg2); padding: 1rem;
      display: flex; flex-direction: column; gap: 0.4rem;
    }

    .score-cell-label {
      font-family: var(--mono); font-size: 0.6rem; color: var(--muted);
      text-transform: uppercase; letter-spacing: 0.1em;
    }

    .score-cell-value {
      font-family: var(--mono); font-size: 1.4rem; font-weight: 600; color: var(--accent);
    }

    .score-cell-sub {
      font-size: 0.75rem; color: var(--muted);
    }

    .variable-block {
      padding: 1.5rem 0; border-bottom: 1px solid var(--border);
    }

    .variable-header {
      display: flex; justify-content: space-between; align-items: baseline;
      margin-bottom: 0.75rem;
    }

    .variable-label {
      font-family: var(--mono); font-size: 0.75rem; text-transform: uppercase;
      letter-spacing: 0.08em; color: var(--accent);
    }

    .variable-score {
      font-family: var(--mono); font-size: 0.8rem; color: var(--muted);
    }

    .variable-analysis {
      font-size: 0.95rem; line-height: 1.75; color: #bbb; font-weight: 300;
    }

    .prescription-block {
      background: var(--bg2); border: 1px solid var(--border);
      border-left: 3px solid var(--accent);
      padding: 1.5rem; margin: 1.5rem 0;
    }

    .prescription-text {
      font-size: 0.95rem; line-height: 1.75; color: #ccc;
    }

    .sources-list {
      list-style: none; display: flex; flex-direction: column; gap: 0.5rem;
    }

    .sources-list a {
      font-family: var(--mono); font-size: 0.75rem; color: var(--muted);
    }

    .sources-list a:hover { color: var(--accent); }

    .back-link {
      font-family: var(--mono); font-size: 0.75rem; color: var(--muted);
      display: inline-flex; align-items: center; gap: 0.4rem;
      padding: 2rem 2rem 0; text-transform: uppercase; letter-spacing: 0.08em;
    }

    .back-link:hover { color: var(--accent); text-decoration: none; }

    @media (max-width: 600px) {
      .post-hero, .post-body { padding: 1.5rem 1rem; }
      .nav { padding: 1rem; }
      .nav-links { gap: 1rem; }
      .scores-grid { grid-template-columns: repeat(2, 1fr); }
    }
  </style>
</head>
<body>
  ${navHTML}

  <a class="back-link" href="${SITE_URL}/signal/">← The Signal</a>

  <div class="post-hero">
    <div class="post-meta">
      <span>${categoryTag}</span>
      <span>${formatDate(post.date_published)}</span>
      ${post.date_updated !== post.date_published ? `<span>Updated ${formatDate(post.date_updated)}</span>` : ''}
    </div>

    <h1 class="post-subject">${post.subject}</h1>
    <p class="post-verdict">${post.verdict}</p>

    <div class="stage-display">
      <div class="stage-number">${stage}</div>
      <div class="stage-info">
        <span class="stage-name">Collapse Stage</span>
        <span class="stage-label-text">${stageLabel(stage)}</span>
      </div>
    </div>
  </div>

  <div class="post-body">

    <div class="scores-grid">
      <div class="score-cell">
        <span class="score-cell-label">Contract Drift</span>
        <span class="score-cell-value">${post.contract_drift}/10</span>
      </div>
      <div class="score-cell">
        <span class="score-cell-label">Root Cause</span>
        <span class="score-cell-value" style="font-size:1rem;margin-top:0.25rem">${rootCauseLabel(post.root_cause)}</span>
      </div>
      <div class="score-cell">
        <span class="score-cell-label">Contract Depth</span>
        <span class="score-cell-sub" style="font-size:0.9rem;color:var(--text);margin-top:0.25rem">${depthLabel(post.contract_depth)}</span>
      </div>
      <div class="score-cell">
        <span class="score-cell-label">Immunity Load</span>
        <span class="score-cell-value">${post.immunity_load}/10</span>
      </div>
    </div>

    <div class="section-label">Analysis</div>
    <p class="summary-text">${post.summary}</p>

    <div class="section-label">Five Variables</div>
    ${variableBlocks}

    <div class="section-label">Prescription</div>
    <div class="prescription-block">
      <p class="prescription-text">${post.prescription}</p>
    </div>

    <div class="section-label">Sources</div>
    <ul class="sources-list">
      ${sourceLinks}
    </ul>

  </div>

  <footer>
    <span>Collapse Risk Instrument v1.0 · <a href="${SITE_URL}">Run your own analysis</a></span>
    <span><a href="${SITE_URL}/signal/rss.xml">RSS Feed</a></span>
  </footer>

</body>
</html>`;
}

// ── Index Page ────────────────────────────────────────────────────────────────

function buildIndexPage(posts) {
  const categories = [...new Set(posts.map(p => p.category))].sort();

  const postCards = posts.map(post => {
    const sColor = stageColor(post.collapse_stage);
    return `
      <article class="post-card" data-stage="${post.collapse_stage}" data-category="${post.category}">
        <a class="post-card-link" href="${SITE_URL}/signal/${post.slug}/">
          <div class="post-card-top">
            <div class="post-card-meta">
              <span class="card-category">${post.category}</span>
              <span class="card-date">${formatDate(post.date_published)}</span>
            </div>
            <div class="card-stage-badge" style="color:${sColor}; border-color:${sColor}20; background:${sColor}10;">
              Stage ${post.collapse_stage} — ${stageLabel(post.collapse_stage)}
            </div>
          </div>
          <h2 class="post-card-subject">${post.subject}</h2>
          <p class="post-card-verdict">${post.verdict}</p>
          <div class="post-card-scores">
            <span>Drift <strong>${post.contract_drift}/10</strong></span>
            <span>Immunity <strong>${post.immunity_load}/10</strong></span>
            <span>${rootCauseLabel(post.root_cause)}</span>
          </div>
        </a>
      </article>
    `;
  }).join('');

  const stageFilters = [0,1,2,3,4,5].map(n => `
    <button class="filter-btn" data-filter="stage" data-value="${n}" style="--stage-color:${stageColor(n)}">
      ${n} — ${stageLabel(n)}
    </button>
  `).join('');

  const categoryFilters = categories.map(c => `
    <button class="filter-btn" data-filter="category" data-value="${c}">
      ${c}
    </button>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>The Signal — Collapse Risk Instrument</title>
  <meta name="description" content="${SITE_DESCRIPTION}">
  <link rel="canonical" href="${SITE_URL}/signal/">
  <meta property="og:url" content="${SITE_URL}/signal/">
  <meta property="og:title" content="The Signal — Collapse Risk Analysis">
  <meta property="og:description" content="${SITE_DESCRIPTION}">
  <link rel="alternate" type="application/rss+xml" title="${SITE_TITLE}" href="${SITE_URL}/signal/rss.xml">

  <style>
    ${sharedCSS}

    .signal-hero {
      padding: 3rem 2rem 2rem;
      border-bottom: 1px solid var(--border);
    }

    .signal-eyebrow {
      font-family: var(--mono); font-size: 0.7rem; color: var(--muted);
      text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 0.75rem;
    }

    .signal-title {
      font-size: clamp(1.8rem, 4vw, 2.8rem); font-weight: 300;
      letter-spacing: -0.02em; margin-bottom: 0.75rem;
    }

    .signal-sub {
      font-size: 0.9rem; color: var(--muted); max-width: 500px; line-height: 1.6;
    }

    .filters {
      padding: 1.25rem 2rem; border-bottom: 1px solid var(--border);
      display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center;
    }

    .filter-label {
      font-family: var(--mono); font-size: 0.65rem; color: var(--muted);
      text-transform: uppercase; letter-spacing: 0.1em; margin-right: 0.5rem;
    }

    .filter-btn {
      font-family: var(--mono); font-size: 0.68rem; letter-spacing: 0.06em;
      padding: 0.3rem 0.75rem; border: 1px solid var(--border);
      background: transparent; color: var(--muted); cursor: pointer;
      text-transform: uppercase; transition: all 0.15s;
    }

    .filter-btn:hover { border-color: var(--accent); color: var(--accent); }
    .filter-btn.active { border-color: var(--accent); color: var(--accent); background: var(--accent)12; }
    .filter-btn[data-filter="stage"].active { border-color: var(--stage-color); color: var(--stage-color); }

    .filter-divider {
      width: 1px; height: 1.5rem; background: var(--border); margin: 0 0.5rem;
    }

    .clear-btn {
      font-family: var(--mono); font-size: 0.65rem; color: var(--muted);
      background: none; border: none; cursor: pointer; text-decoration: underline;
      display: none;
    }

    .clear-btn.visible { display: inline; }

    .posts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 1px; background: var(--border);
      padding: 0;
    }

    .post-card {
      background: var(--bg);
      transition: background 0.15s;
    }

    .post-card:hover { background: var(--bg2); }
    .post-card.hidden { display: none; }

    .post-card-link {
      display: block; padding: 1.75rem 2rem; color: inherit; height: 100%;
    }

    .post-card-link:hover { text-decoration: none; }

    .post-card-top {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 1rem; gap: 1rem;
    }

    .post-card-meta {
      display: flex; flex-direction: column; gap: 0.25rem;
    }

    .card-category {
      font-family: var(--mono); font-size: 0.65rem; color: var(--muted);
      text-transform: uppercase; letter-spacing: 0.1em;
    }

    .card-date {
      font-family: var(--mono); font-size: 0.65rem; color: var(--muted);
    }

    .card-stage-badge {
      font-family: var(--mono); font-size: 0.65rem; font-weight: 600;
      padding: 0.25rem 0.6rem; border: 1px solid; letter-spacing: 0.06em;
      text-transform: uppercase; white-space: nowrap; flex-shrink: 0;
    }

    .post-card-subject {
      font-size: 1.5rem; font-weight: 300; letter-spacing: -0.01em;
      margin-bottom: 0.6rem; line-height: 1.2;
    }

    .post-card-verdict {
      font-size: 0.85rem; color: var(--muted); line-height: 1.6;
      margin-bottom: 1.25rem; font-weight: 300;
    }

    .post-card-scores {
      display: flex; gap: 1.25rem; flex-wrap: wrap;
      font-family: var(--mono); font-size: 0.7rem; color: var(--muted);
    }

    .post-card-scores strong { color: var(--accent); }

    .empty-state {
      padding: 4rem 2rem; text-align: center;
      font-family: var(--mono); font-size: 0.8rem; color: var(--muted);
      display: none;
    }

    .empty-state.visible { display: block; }

    @media (max-width: 600px) {
      .signal-hero { padding: 1.5rem 1rem; }
      .filters { padding: 1rem; }
      .post-card-link { padding: 1.25rem 1rem; }
      .posts-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  ${navHTML}

  <div class="signal-hero">
    <div class="signal-eyebrow">Collapse Risk Instrument · The Signal</div>
    <h1 class="signal-title">Public collapse, documented.</h1>
    <p class="signal-sub">Long-form analysis using the five-variable collapse framework. Each report is a timestamped read of where a figure or brand stands — and what comes next.</p>
  </div>

  <div class="filters">
    <span class="filter-label">Stage</span>
    ${stageFilters}
    <div class="filter-divider"></div>
    <span class="filter-label">Type</span>
    ${categoryFilters}
    <button class="clear-btn" id="clearFilters">Clear</button>
  </div>

  <div class="posts-grid" id="postsGrid">
    ${postCards}
  </div>

  <div class="empty-state" id="emptyState">No reports match the current filter.</div>

  <footer>
    <span>${posts.length} report${posts.length !== 1 ? 's' : ''} · <a href="${SITE_URL}">Run your own analysis</a></span>
    <span><a href="${SITE_URL}/signal/rss.xml">RSS</a></span>
  </footer>

  <script>
    const cards = document.querySelectorAll('.post-card');
    const clearBtn = document.getElementById('clearFilters');
    const emptyState = document.getElementById('emptyState');
    let activeFilters = { stage: null, category: null };

    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.filter;
        const value = btn.dataset.value;

        if (activeFilters[type] === value) {
          activeFilters[type] = null;
          btn.classList.remove('active');
        } else {
          document.querySelectorAll(\`.filter-btn[data-filter="\${type}"]\`).forEach(b => b.classList.remove('active'));
          activeFilters[type] = value;
          btn.classList.add('active');
        }

        applyFilters();
      });
    });

    clearBtn.addEventListener('click', () => {
      activeFilters = { stage: null, category: null };
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      applyFilters();
    });

    function applyFilters() {
      let visible = 0;
      cards.forEach(card => {
        const stageMatch = !activeFilters.stage || card.dataset.stage === activeFilters.stage;
        const catMatch = !activeFilters.category || card.dataset.category === activeFilters.category;
        const show = stageMatch && catMatch;
        card.classList.toggle('hidden', !show);
        if (show) visible++;
      });

      const hasFilter = activeFilters.stage || activeFilters.category;
      clearBtn.classList.toggle('visible', !!hasFilter);
      emptyState.classList.toggle('visible', visible === 0);
    }
  </script>

</body>
</html>`;
}

// ── RSS Feed ──────────────────────────────────────────────────────────────────

function buildRSS(posts) {
  const items = posts.map(post => `
    <item>
      <title>${escapeXml(post.subject)} — Stage ${post.collapse_stage}: ${stageLabel(post.collapse_stage)}</title>
      <link>${SITE_URL}/signal/${post.slug}/</link>
      <guid isPermaLink="true">${SITE_URL}/signal/${post.slug}/</guid>
      <pubDate>${new Date(post.date_published + 'T12:00:00Z').toUTCString()}</pubDate>
      <description>${escapeXml(post.verdict + ' ' + post.summary)}</description>
      <category>${escapeXml(post.category)}</category>
    </item>
  `).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE_TITLE)}</title>
    <link>${SITE_URL}/signal/</link>
    <description>${escapeXml(SITE_DESCRIPTION)}</description>
    <language>en-us</language>
    <atom:link href="${SITE_URL}/signal/rss.xml" rel="self" type="application/rss+xml"/>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${items}
  </channel>
</rss>`;
}

// ── Build ─────────────────────────────────────────────────────────────────────

// Individual post pages
posts.forEach(post => {
  const postOutDir = path.join(signalDir, post.slug);
  fs.mkdirSync(postOutDir, { recursive: true });
  fs.writeFileSync(path.join(postOutDir, 'index.html'), buildPostPage(post));
  console.log(`✓ /signal/${post.slug}/`);
});

// Index page
fs.writeFileSync(path.join(signalDir, 'index.html'), buildIndexPage(posts));
console.log('✓ /signal/index.html');

// RSS
fs.writeFileSync(path.join(signalDir, 'rss.xml'), buildRSS(posts));
console.log('✓ /signal/rss.xml');

console.log(`\nDone. ${posts.length} posts built.`);
