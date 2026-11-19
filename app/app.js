// Leonida Trophy Guide — the tracker half of the guide.
// Loads the two data files that sit beside it, renders the checklist and the
// roadmap, and keeps the player's ticks in localStorage. It fetches nothing
// but its own data files: with the network off it works exactly the same.
//
// Shareable state: the page also reads its starting state from the URL —
//   ?earned=2,3,28   pre-tick those trophy ids
//   ?spoiler=1       start with spoiler mode on
//   ?view=roadmap    open on the roadmap
//   ?open=28         open that trophy's guide
// so a link can show a friend (or a screenshot) one exact view.

const STORAGE_KEY = 'leonida-trophy-guide-v1';

const els = {
  list: document.getElementById('trophy-list'),
  detail: document.getElementById('detail-panel'),
  search: document.getElementById('search'),
  kind: document.getElementById('kind-filter'),
  grade: document.getElementById('grade-filter'),
  spoiler: document.getElementById('spoiler-toggle'),
  hideEarned: document.getElementById('hide-earned-toggle'),
  earnedCount: document.getElementById('earned-count'),
  fill: document.getElementById('progress-fill'),
  progressDetail: document.getElementById('progress-detail'),
  checklistView: document.getElementById('checklist-view'),
  roadmapView: document.getElementById('roadmap-view'),
  roadmapBody: document.getElementById('roadmap-body'),
  tabChecklist: document.getElementById('tab-checklist'),
  tabRoadmap: document.getElementById('tab-roadmap'),
};

const params = new URLSearchParams(location.search);

const saved = readSavedState();
const state = {
  earned: new Set(saved.earned),
  spoiler: params.has('spoiler') ? params.get('spoiler') === '1' : saved.spoiler,
  hideEarned: saved.hideEarned,
  selectedId: null,
  view: params.get('view') === 'roadmap' ? 'roadmap' : 'checklist',
};
if (params.has('earned')) {
  state.earned = new Set(params.get('earned').split(',').map((n) => Number(n)).filter((n) => n >= 1 && n <= 55));
}

function readSavedState() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    return {
      earned: Array.isArray(raw.earned) ? raw.earned : [],
      spoiler: Boolean(raw.spoiler),
      hideEarned: Boolean(raw.hideEarned),
    };
  } catch {
    return { earned: [], spoiler: false, hideEarned: false };
  }
}

function persistState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    earned: [...state.earned],
    spoiler: state.spoiler,
    hideEarned: state.hideEarned,
  }));
}

const trophyData = await (await fetch('data/trophies.json')).json();
const roadmapData = await (await fetch('data/roadmap.json')).json();
const trophies = trophyData.trophies;
const byId = new Map(trophies.map((t) => [t.id, t]));

function isMasked(trophy) {
  return state.spoiler && trophy.kind === 'story' && !state.earned.has(trophy.id);
}

function displayName(trophy) {
  return isMasked(trophy) ? 'Hidden story trophy' : trophy.name;
}

function displayDescription(trophy) {
  return isMasked(trophy) ? 'Name and description hidden by spoiler mode until you earn it.' : trophy.description;
}

function matchesFilters(trophy) {
  const kind = els.kind.value;
  if (kind === 'missable' && !trophy.missable) return false;
  if (kind !== 'all' && kind !== 'missable' && trophy.kind !== kind) return false;
  if (els.grade.value !== 'all' && trophy.grade !== els.grade.value) return false;
  if (state.hideEarned && state.earned.has(trophy.id)) return false;
  const query = els.search.value.trim().toLowerCase();
  if (query) {
    const haystack = `${trophy.name} ${trophy.description} ${trophy.guide}`.toLowerCase();
    if (!haystack.includes(query)) return false;
  }
  return true;
}

function chip(text, cls) {
  const span = document.createElement('span');
  span.className = `chip ${cls ?? ''}`.trim();
  span.textContent = text;
  return span;
}

function renderChecklist() {
  els.list.replaceChildren();
  let shown = 0;
  for (const trophy of trophies) {
    if (!matchesFilters(trophy)) continue;
    shown += 1;
    const row = document.createElement('li');
    row.className = `trophy-row grade-${trophy.grade}`;
    if (state.earned.has(trophy.id)) row.classList.add('earned');
    if (state.selectedId === trophy.id) row.classList.add('selected');

    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = state.earned.has(trophy.id);
    box.setAttribute('aria-label', `Mark ${trophy.name} as earned`);
    box.addEventListener('click', (event) => event.stopPropagation());
    box.addEventListener('change', () => {
      if (box.checked) state.earned.add(trophy.id);
      else state.earned.delete(trophy.id);
      persistState();
      renderAll();
    });

    const main = document.createElement('div');
    main.className = 'row-main';
    const name = document.createElement('div');
    name.className = 'row-name';
    name.textContent = displayName(trophy);
    const desc = document.createElement('div');
    desc.className = 'row-desc';
    desc.textContent = displayDescription(trophy);
    const meta = document.createElement('div');
    meta.className = 'row-meta';
    meta.append(chip(trophy.grade, `grade-${trophy.grade}`));
    meta.append(chip(trophy.missable ? 'missable' : trophy.kind));
    if (trophy.hidden) meta.append(chip('hidden on PSN', 'hidden-chip'));
    if (trophy.target !== null) meta.append(chip(`target ${trophy.target.toLocaleString('en-US')}`));
    main.append(name, desc, meta);

    row.append(box, main);
    row.addEventListener('click', () => {
      state.selectedId = trophy.id;
      renderAll();
    });
    els.list.append(row);
  }
  if (shown === 0) {
    const empty = document.createElement('li');
    empty.className = 'trophy-row';
    if (els.kind.value === 'online') {
      empty.textContent = 'The official list has no online trophies — all 55 are offline and single-player.';
    } else {
      empty.textContent = 'No trophies match the current filters.';
    }
    els.list.append(empty);
  }
  renderProgress();
}

function renderProgress() {
  const total = trophies.length;
  const done = state.earned.size;
  els.earnedCount.textContent = String(done);
  els.fill.style.width = `${(done / total) * 100}%`;
  const perGrade = ['platinum', 'gold', 'silver', 'bronze'].map((grade) => {
    const all = trophies.filter((t) => t.grade === grade);
    const got = all.filter((t) => state.earned.has(t.id)).length;
    return `${got}/${all.length} ${grade}`;
  });
  els.progressDetail.textContent = done === total
    ? 'All 55 earned — platinum unlocked. Welcome to the legend club.'
    : perGrade.join(' · ');
}

function renderDetail() {
  const trophy = byId.get(state.selectedId);
  els.detail.replaceChildren();
  if (!trophy) {
    const hint = document.createElement('p');
    hint.className = 'detail-hint';
    hint.textContent = 'Pick a trophy from the list to read its guide, its steps and the sources it cites.';
    els.detail.append(hint);
    return;
  }
  const title = document.createElement('h2');
  title.textContent = displayName(trophy);
  const desc = document.createElement('p');
  desc.className = 'detail-desc';
  desc.textContent = displayDescription(trophy);
  els.detail.append(title, desc);

  const meta = document.createElement('div');
  meta.className = 'row-meta';
  meta.append(chip(trophy.grade, `grade-${trophy.grade}`));
  meta.append(chip(trophy.missable ? 'missable' : trophy.kind));
  if (trophy.hidden) meta.append(chip('hidden on PSN', 'hidden-chip'));
  if (trophy.target !== null) meta.append(chip(`PSN target ${trophy.target.toLocaleString('en-US')}`));
  meta.append(chip(`roadmap stage ${trophy.roadmap_stage}`));
  els.detail.append(meta);

  if (trophy.missable) {
    const warn = document.createElement('p');
    const strong = document.createElement('strong');
    strong.textContent = 'Missable: ';
    warn.append(strong, document.createTextNode('the only trophy in the game that can be lost for good on a single playthrough. Read the guide before you finish Chapter 1.'));
    els.detail.append(warn);
  }

  const guideHead = document.createElement('h3');
  guideHead.textContent = 'Guide';
  const guide = document.createElement('p');
  guide.textContent = trophy.guide;
  els.detail.append(guideHead, guide);

  const stepsHead = document.createElement('h3');
  stepsHead.textContent = 'Steps';
  const steps = document.createElement('ol');
  for (const step of trophy.steps) {
    const li = document.createElement('li');
    li.textContent = step;
    steps.append(li);
  }
  els.detail.append(stepsHead, steps);

  const sourcesHead = document.createElement('h3');
  sourcesHead.textContent = 'Sources';
  const sources = document.createElement('ul');
  sources.className = 'source-list';
  for (const source of trophy.sources) {
    const li = document.createElement('li');
    const link = document.createElement('a');
    link.href = source.url;
    link.textContent = source.name;
    link.target = '_blank';
    link.rel = 'noreferrer';
    li.append(link);
    sources.append(li);
  }
  els.detail.append(sourcesHead, sources);

  const earnLabel = document.createElement('label');
  earnLabel.className = 'detail-earn';
  const earnBox = document.createElement('input');
  earnBox.type = 'checkbox';
  earnBox.checked = state.earned.has(trophy.id);
  earnBox.addEventListener('change', () => {
    if (earnBox.checked) state.earned.add(trophy.id);
    else state.earned.delete(trophy.id);
    persistState();
    renderAll();
  });
  earnLabel.append(earnBox, document.createTextNode('I have earned this trophy'));
  els.detail.append(earnLabel);
}

function renderRoadmap() {
  els.roadmapBody.replaceChildren();
  const heading = document.createElement('h2');
  heading.textContent = roadmapData.title;
  const intro = document.createElement('p');
  intro.className = 'roadmap-intro';
  intro.textContent = roadmapData.summary;
  els.roadmapBody.append(heading, intro);
  for (const stage of roadmapData.stages) {
    const card = document.createElement('article');
    card.className = 'stage-card';
    const time = document.createElement('div');
    time.className = 'stage-time';
    time.textContent = `Stage ${stage.stage} · ${stage.time}`;
    const title = document.createElement('h3');
    title.textContent = stage.title;
    const summary = document.createElement('p');
    summary.textContent = stage.summary;
    const tips = document.createElement('ul');
    for (const tip of stage.tips) {
      const li = document.createElement('li');
      li.textContent = tip;
      tips.append(li);
    }
    const names = document.createElement('p');
    names.className = 'stage-trophies';
    const label = document.createElement('strong');
    label.textContent = 'Trophies in this stage: ';
    names.append(label, document.createTextNode(stage.trophies.map((id) => {
      const t = byId.get(id);
      return t ? `${t.name}${t.missable ? ' (MISSABLE)' : ''}` : '';
    }).join(' · ')));
    card.append(time, title, summary, tips, names);
    els.roadmapBody.append(card);
  }
}

function showView(view) {
  state.view = view;
  els.checklistView.hidden = view !== 'checklist';
  els.roadmapView.hidden = view !== 'roadmap';
  els.tabChecklist.classList.toggle('active', view === 'checklist');
  els.tabRoadmap.classList.toggle('active', view === 'roadmap');
}

function renderAll() {
  renderChecklist();
  renderDetail();
  renderRoadmap();
  showView(state.view);
}

els.tabChecklist.addEventListener('click', () => showView('checklist'));
els.tabRoadmap.addEventListener('click', () => showView('roadmap'));
for (const input of [els.search, els.kind, els.grade, els.hideEarned]) {
  input.addEventListener('input', renderChecklist);
  input.addEventListener('change', renderChecklist);
}
els.spoiler.addEventListener('change', () => {
  state.spoiler = els.spoiler.checked;
  persistState();
  renderAll();
});
els.hideEarned.addEventListener('change', () => {
  state.hideEarned = els.hideEarned.checked;
  persistState();
  renderChecklist();
});

document.getElementById('export-button').addEventListener('click', () => {
  const payload = JSON.stringify({ game: 'Grand Theft Auto VI', earned: [...state.earned].sort((a, b) => a - b) }, null, 2);
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
  anchor.download = 'leonida-trophy-progress.json';
  anchor.click();
  URL.revokeObjectURL(anchor.href);
});

document.getElementById('import-input').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    const items = Array.isArray(parsed) ? parsed : parsed.earned;
    const ids = new Set();
    for (const item of items ?? []) {
      if (typeof item === 'number' && byId.has(item)) ids.add(item);
      if (typeof item === 'string') {
        const found = trophies.find((t) => t.name === item);
        if (found) ids.add(found.id);
      }
    }
    state.earned = ids;
    persistState();
    renderAll();
  } catch {
    // A malformed file changes nothing; the current progress stays as it was.
  }
  event.target.value = '';
});

document.getElementById('reset-button').addEventListener('click', () => {
  state.earned = new Set();
  persistState();
  renderAll();
});

els.spoiler.checked = state.spoiler;
els.hideEarned.checked = state.hideEarned;
if (params.has('open')) {
  const id = Number(params.get('open'));
  if (byId.has(id)) state.selectedId = id;
}
renderAll();
