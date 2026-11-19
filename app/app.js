// GTA VI trophy guide and tracker: loads the trophy list and roadmap from app/data,
// renders the checklist, the roadmap and one trophy's guide at a time, and keeps the
// player's earned trophies in localStorage with export/import. Everything runs offline:
// the only requests this file makes are relative fetches of files under app/.
const STORE_KEY = 'gta6-trophy-guide-progress-v1';
const KINDS = ['all', 'story', 'missable', 'collectibles', 'activities', 'online'];

const listEl = document.getElementById('trophies');
const detailEl = document.getElementById('detail');
const searchEl = document.getElementById('search');
const gradeEl = document.getElementById('grade');
const missableEl = document.getElementById('missable-only');
const spoilerEl = document.getElementById('spoiler');
const chipsEl = document.getElementById('kind-chips');

const data = await (await fetch('data/trophies.json')).json();
const roadmap = await (await fetch('data/roadmap.json')).json();
const trophies = data.trophies;
const byId = new Map(trophies.map((t) => [t.id, t]));

let earned = new Set(loadEarned());
let kind = 'all';
let selectedId = 28; // Positive Mental Attitude: the one missable trophy, a good first guide.
let spoilerOn = false;

function loadEarned() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) ?? '[]');
    return Array.isArray(raw) ? raw.filter((id) => byId.has(id)) : [];
  } catch {
    return [];
  }
}

function saveEarned() {
  localStorage.setItem(STORE_KEY, JSON.stringify([...earned].sort((a, b) => a - b)));
}

function isHiddenFromSpoilers(t) {
  return spoilerOn && t.kind === 'story' && !earned.has(t.id);
}

function gradeBadge(t) {
  return `<span class="badge ${t.grade}">${t.grade}</span>`;
}

function metaBadges(t) {
  const bits = [gradeBadge(t), `<span class="badge kind">${t.kind}</span>`];
  if (t.hidden) bits.push('<span class="badge hidden">Hidden on PS5</span>');
  if (t.missable) bits.push('<span class="badge missable">Missable</span>');
  return bits.join('');
}

function targetLine(t) {
  if (t.target == null) return '';
  const unit = t.id === 14 ? '%' : t.id === 52 || t.id === 53 ? '$' : '×';
  return unit === '$' ? `$${t.target.toLocaleString('en-US')}` : `${t.target}${unit === '%' ? '%' : ' ×'}`;
}

function matchesFilters(t) {
  if (kind === 'missable' && !t.missable) return false;
  if (kind !== 'all' && kind !== 'missable' && t.kind !== kind) return false;
  if (gradeEl.value !== 'all' && t.grade !== gradeEl.value) return false;
  if (missableEl.checked && !t.missable) return false;
  const q = searchEl.value.trim().toLowerCase();
  if (q && !`${t.name} ${t.description} ${t.guide}`.toLowerCase().includes(q)) return false;
  return true;
}

function renderProgress() {
  const total = trophies.length;
  const pct = Math.round((earned.size / total) * 100);
  document.getElementById('progress-count').textContent = `${earned.size} / ${total} earned`;
  document.getElementById('progress-pct').textContent = `${pct}%`;
  document.getElementById('progress-fill').style.width = `${pct}%`;
  document.getElementById('grade-counts').innerHTML = ['platinum', 'gold', 'silver', 'bronze']
    .map((g) => {
      const have = trophies.filter((t) => t.grade === g && earned.has(t.id)).length;
      const all = trophies.filter((t) => t.grade === g).length;
      return `<span><b>${have}/${all}</b> ${g}</span>`;
    })
    .join('');
}

function renderList() {
  const visible = trophies.filter(matchesFilters);
  document.getElementById('list-count').textContent = `— showing ${visible.length} of ${trophies.length}`;
  listEl.replaceChildren();
  for (const t of visible) {
    const li = document.createElement('li');
    li.className = `trophy${earned.has(t.id) ? ' earned' : ''}${t.id === selectedId ? ' selected' : ''}`;
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = earned.has(t.id);
    box.setAttribute('aria-label', `Mark ${t.name} earned`);
    box.addEventListener('change', () => {
      if (box.checked) earned.add(t.id);
      else earned.delete(t.id);
      saveEarned();
      renderAll();
    });
    const body = document.createElement('div');
    const masked = isHiddenFromSpoilers(t);
    body.innerHTML = `<div class="name">${masked ? 'Hidden story trophy — earn it to reveal' : escapeHtml(t.name)}</div>
      <div class="desc">${masked ? 'Its name and description stay hidden in spoiler mode until you earn it.' : escapeHtml(t.description)}</div>
      <div class="meta">${metaBadges(t)}</div>`;
    const target = document.createElement('div');
    target.className = 'target';
    target.textContent = targetLine(t);
    li.append(box, body, target);
    li.addEventListener('click', (e) => {
      if (e.target === box) return;
      selectedId = t.id;
      renderAll();
    });
    listEl.append(li);
  }
  if (!visible.length) {
    const li = document.createElement('li');
    li.className = 'detail-empty';
    li.textContent = 'No trophies match these filters.';
    listEl.append(li);
  }
}

function renderDetail() {
  const t = byId.get(selectedId) ?? trophies[0];
  if (!t) return;
  const masked = isHiddenFromSpoilers(t);
  const stage = roadmap.stages.find((s) => s.stage === t.roadmap_stage);
  const sources = t.sources
    .map((s) => `<li><a href="${escapeAttr(s.url)}">${escapeHtml(s.name)}</a></li>`)
    .join('');
  const steps = t.steps.map((s) => `<li>${escapeHtml(s)}</li>`).join('');
  detailEl.innerHTML = `
    <h2>${masked ? 'Hidden story trophy' : escapeHtml(t.name)}</h2>
    <p class="desc">${masked ? 'Its name and description stay hidden in spoiler mode until you earn it.' : escapeHtml(t.description)}</p>
    <div class="meta">${metaBadges(t)}</div>
    ${t.missable ? '<p class="warn">Missable — do this in Chapter 1, before the chapter ends.</p>' : ''}
    ${masked
      ? '<p>Turn spoiler mode off, or earn this trophy, to read its guide.</p>'
      : `<h3>Guide</h3><p>${escapeHtml(t.guide)}</p>
         <h3>Steps</h3><ol>${steps}</ol>
         <h3>Roadmap</h3><p>Stage ${t.roadmap_stage} — ${escapeHtml(stage ? stage.title : '')}</p>
         <h3>Sources</h3><ul class="sources">${sources}</ul>
         <p class="hint">Guide written in our own words for this guide; facts cite the sources above.</p>`}
    <p><button type="button" class="ghost" id="detail-toggle">${earned.has(t.id) ? 'Mark as not earned' : 'Mark as earned'}</button></p>`;
  document.getElementById('detail-toggle').addEventListener('click', () => {
    if (earned.has(t.id)) earned.delete(t.id);
    else earned.add(t.id);
    saveEarned();
    renderAll();
  });
}

function renderRoadmap() {
  document.getElementById('roadmap-summary').textContent = roadmap.summary;
  const wrap = document.getElementById('stages');
  wrap.replaceChildren();
  for (const s of roadmap.stages) {
    const card = document.createElement('article');
    card.className = 'stage';
    const names = s.trophies
      .map((id) => byId.get(id))
      .filter(Boolean)
      .map((t) => (isHiddenFromSpoilers(t) ? 'Hidden story trophy' : escapeHtml(t.name)))
      .join(' · ');
    card.innerHTML = `<h3><span class="num">Stage ${s.stage}.</span> ${escapeHtml(s.title)}</h3>
      <p class="time">${escapeHtml(s.time)}</p>
      <p>${escapeHtml(s.summary)}</p>
      <ul>${s.tips.map((tip) => `<li>${escapeHtml(tip)}</li>`).join('')}</ul>
      <p class="stage-trophies"><b>Trophies:</b> ${names}</p>`;
    wrap.append(card);
  }
}

function renderChips() {
  chipsEl.replaceChildren();
  for (const k of KINDS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = k === 'all' ? 'All kinds' : k[0].toUpperCase() + k.slice(1);
    b.setAttribute('aria-pressed', String(kind === k));
    b.addEventListener('click', () => {
      kind = k;
      renderAll();
    });
    chipsEl.append(b);
  }
}

function renderAll() {
  renderProgress();
  renderChips();
  renderList();
  renderDetail();
  renderRoadmap();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/"/g, '&quot;');
}

function readHash() {
  const params = new URLSearchParams(location.hash.slice(1));
  if (params.has('spoiler')) spoilerOn = params.get('spoiler') === 'on';
  if (params.has('kind') && KINDS.includes(params.get('kind'))) kind = params.get('kind');
  if (params.has('grade')) gradeEl.value = params.get('grade');
  if (params.has('q')) searchEl.value = params.get('q');
  if (params.has('missable')) missableEl.checked = params.get('missable') === 'on';
  if (params.has('trophy')) {
    const id = Number(params.get('trophy'));
    if (byId.has(id)) selectedId = id;
  }
  spoilerEl.checked = spoilerOn;
}

function scrollToHashView() {
  // Scroll after renderAll: the roadmap's height is only known once it is filled in.
  const view = new URLSearchParams(location.hash.slice(1)).get('view');
  if (view === 'roadmap') document.getElementById('roadmap').scrollIntoView();
  if (view === 'detail') detailEl.scrollIntoView();
}

document.getElementById('export').addEventListener('click', () => {
  const payload = { game: 'Grand Theft Auto VI', platform: 'PlayStation 5', exported: new Date().toISOString(), earned: [...earned].sort((a, b) => a - b) };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  a.download = 'gta6-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
});

document.getElementById('import').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const raw = JSON.parse(await file.text());
    const ids = Array.isArray(raw) ? raw : raw.earned;
    if (!Array.isArray(ids)) throw new Error('bad file');
    earned = new Set(ids.filter((id) => byId.has(id)));
    saveEarned();
    renderAll();
  } catch {
    alert('That file is not a trophy progress export from this guide.');
  }
  e.target.value = '';
});

document.getElementById('reset').addEventListener('click', () => {
  if (confirm('Clear all earned trophies?')) {
    earned = new Set();
    saveEarned();
    renderAll();
  }
});

searchEl.addEventListener('input', renderList);
gradeEl.addEventListener('change', renderList);
missableEl.addEventListener('change', renderList);
spoilerEl.addEventListener('change', () => {
  spoilerOn = spoilerEl.checked;
  renderAll();
});

readHash();
renderAll();
scrollToHashView();
