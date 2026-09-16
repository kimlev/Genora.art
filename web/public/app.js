(function () {
  const state = {
    description: null,
    competitors: [],
    priorities: null,
    draftCompetitors: [],
    editCompetitors: [],
    addButtonIsMore: false,
    pollTimer: null,
  };

  const screens = {
    home: document.getElementById('home'),
    step1: document.getElementById('step-1'),
    step2: document.getElementById('step-2'),
    step3: document.getElementById('step-3'),
    info: document.getElementById('info'),
  };

  const els = {
    btnGo: document.getElementById('btn-go'),
    btnInfo: document.getElementById('btn-info'),
    btnRescan: document.getElementById('btn-rescan'),
    anamnesisCard: document.getElementById('anamnesis-card'),
    previewDescription: document.getElementById('preview-description'),
    previewCompetitors: document.getElementById('preview-competitors'),
    previewPriorities: document.getElementById('preview-priorities'),
    projectLinks: document.getElementById('project-links'),
    githubStatus: document.getElementById('github-status'),
    description: document.getElementById('field-description'),
    errorDescription: document.getElementById('error-description'),
    btnNext1: document.getElementById('btn-next-1'),
    competitor: document.getElementById('field-competitor'),
    btnAddCompetitor: document.getElementById('btn-add-competitor'),
    competitorsList: document.getElementById('competitors-list'),
    btnNext2: document.getElementById('btn-next-2'),
    btnSkip2: document.getElementById('btn-skip-2'),
    priorities: document.getElementById('field-priorities'),
    errorStep3: document.getElementById('error-step3'),
    btnNext3: document.getElementById('btn-next-3'),
    btnSkip3: document.getElementById('btn-skip-3'),
    editDescription: document.getElementById('edit-description'),
    editPriorities: document.getElementById('edit-priorities'),
    editCompetitor: document.getElementById('edit-competitor'),
    btnEditAdd: document.getElementById('btn-edit-add'),
    editCompetitorsList: document.getElementById('edit-competitors-list'),
    btnSave: document.getElementById('btn-save'),
    btnCancel: document.getElementById('btn-cancel'),
  };

  function show(name) {
    Object.values(screens).forEach((el) => el.classList.add('hidden'));
    screens[name].classList.remove('hidden');
  }

  function hasAnamnesis(data) {
    return Boolean(data && data.description);
  }

  function renderAnamnesisPreview() {
    if (!els.anamnesisCard) return;
    if (!hasAnamnesis(state)) {
      els.anamnesisCard.classList.add('hidden');
      return;
    }
    els.anamnesisCard.classList.remove('hidden');
    if (els.previewDescription) {
      els.previewDescription.textContent = state.description || '—';
    }
    if (els.previewPriorities) {
      els.previewPriorities.textContent = state.priorities || '—';
    }
    if (els.previewCompetitors) {
      els.previewCompetitors.innerHTML = '';
      const list = state.competitors || [];
      if (!list.length) {
        const li = document.createElement('li');
        li.textContent = '—';
        els.previewCompetitors.appendChild(li);
      } else {
        list.forEach((url) => {
          const li = document.createElement('li');
          const a = document.createElement('a');
          a.href = url;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.textContent = url;
          li.appendChild(a);
          els.previewCompetitors.appendChild(li);
        });
      }
    }
  }

  function updateInfoVisibility() {
    if (hasAnamnesis(state)) {
      els.btnInfo.classList.remove('hidden');
      if (els.btnRescan) els.btnRescan.classList.remove('hidden');
    } else {
      els.btnInfo.classList.add('hidden');
      if (els.btnRescan) els.btnRescan.classList.add('hidden');
    }
    renderAnamnesisPreview();
  }

  function setGithubStatus(html, isError) {
    if (!html) {
      els.githubStatus.classList.add('hidden');
      els.githubStatus.textContent = '';
      return;
    }
    els.githubStatus.classList.remove('hidden');
    els.githubStatus.classList.toggle('error', Boolean(isError));
    els.githubStatus.innerHTML = html;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderProjectLinks(github, links) {
    const parts = [];
    if (github && github.url) {
      const url = escapeHtml(github.url);
      const priv = github.private ? ' (private)' : '';
      parts.push(
        `<div>Репозиторий: <a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>${priv}</div>`
      );
    }
    (Array.isArray(links) ? links : []).forEach((item) => {
      if (!item || !item.url || !item.label) return;
      const url = escapeHtml(item.url);
      const label = escapeHtml(item.label);
      parts.push(
        `<div>${label}: <a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a></div>`
      );
    });
    if (!parts.length) {
      els.projectLinks.classList.add('hidden');
      els.projectLinks.innerHTML = '';
      return;
    }
    els.projectLinks.innerHTML = parts.join('');
    els.projectLinks.classList.remove('hidden');
  }

  async function loadProjectLinks() {
    try {
      const res = await fetch('/api/project');
      if (!res.ok) throw new Error('project load failed');
      const data = await res.json();
      renderProjectLinks(data.github, data.links);
      return data;
    } catch (_) {
      return null;
    }
  }

  async function pollGithub() {
    try {
      const res = await fetch('/api/github');
      if (!res.ok) return false;
      const data = await res.json();
      if (data.status === 'pending') {
        setGithubStatus('Публикуем приватный репозиторий…');
        return false;
      }
      if (data.status === 'ok' && data.github && data.github.url) {
        renderProjectLinks(data.github, data.links);
        setGithubStatus('');
        return true;
      }
      if (data.status === 'error') {
        setGithubStatus(
          `Ошибка публикации: ${data.error || 'неизвестно'}. Проверьте gh auth login.`,
          true
        );
        return true;
      }
    } catch (_) {}
    return false;
  }

  function startGithubPolling() {
    setGithubStatus('Публикуем приватный репозиторий…');
    if (state.pollTimer) clearInterval(state.pollTimer);
    let tries = 0;
    state.pollTimer = setInterval(async () => {
      tries += 1;
      const done = await pollGithub();
      if (done || tries > 60) {
        clearInterval(state.pollTimer);
        state.pollTimer = null;
      }
    }, 2000);
  }

  function renderList(ul, items, onRemove) {
    ul.innerHTML = '';
    items.forEach((url, index) => {
      const li = document.createElement('li');
      const span = document.createElement('span');
      span.textContent = url;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = 'Удалить';
      btn.addEventListener('click', () => onRemove(index));
      li.appendChild(span);
      li.appendChild(btn);
      ul.appendChild(li);
    });
  }

  function renderDraftCompetitors() {
    renderList(els.competitorsList, state.draftCompetitors, (index) => {
      state.draftCompetitors.splice(index, 1);
      renderDraftCompetitors();
      updateAddButtonLabel();
    });
  }

  function renderEditCompetitors() {
    renderList(els.editCompetitorsList, state.editCompetitors, (index) => {
      state.editCompetitors.splice(index, 1);
      renderEditCompetitors();
    });
  }

  function updateAddButtonLabel() {
    els.btnAddCompetitor.textContent =
      state.addButtonIsMore || state.draftCompetitors.length
        ? 'Добавить еще'
        : 'Добавить';
  }

  async function loadAnamnesis() {
    try {
      const res = await fetch('/api/anamnesis');
      if (!res.ok) throw new Error('load failed');
      const data = await res.json();
      state.description = data.description ?? null;
      state.competitors = Array.isArray(data.competitors) ? data.competitors : [];
      state.priorities = data.priorities ?? null;
      state.updatedAt = data.updatedAt ?? null;
    } catch (_) {}
    updateInfoVisibility();
    await pollGithub();
  }

  async function saveAnamnesis(payload) {
    const res = await fetch('/api/anamnesis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    let data = null;
    try {
      data = await res.json();
    } catch (_) {}
    if (!res.ok) {
      throw new Error((data && (data.message || data.error)) || 'save failed');
    }
    state.description = data.description ?? null;
    state.competitors = Array.isArray(data.competitors) ? data.competitors : [];
    state.priorities = data.priorities ?? null;
    state.updatedAt = data.updatedAt ?? null;
    updateInfoVisibility();
    renderAnamnesisPreview();
    if (state.description) startGithubPolling();
    return data;
  }

  function startSurvey() {
    state.draftCompetitors = [];
    state.addButtonIsMore = false;
    els.description.value = '';
    els.priorities.value = '';
    els.competitor.value = '';
    els.errorDescription.classList.add('hidden');
    renderDraftCompetitors();
    updateAddButtonLabel();
    show('step1');
  }

  function openInfo() {
    els.editDescription.value = state.description || '';
    els.editPriorities.value = state.priorities || '';
    state.editCompetitors = [...state.competitors];
    els.editCompetitor.value = '';
    renderEditCompetitors();
    show('info');
  }

  if (els.btnInfo) {
    els.btnInfo.textContent = 'Информация о проекте';
  }

  els.btnGo.addEventListener('click', () => {
    if (hasAnamnesis(state)) {
      openInfo();
      return;
    }
    startSurvey();
  });

  els.btnNext1.addEventListener('click', () => {
    const value = els.description.value.trim();
    if (!value) {
      els.errorDescription.classList.remove('hidden');
      return;
    }
    els.errorDescription.classList.add('hidden');
    state.description = value;
    show('step2');
  });

  els.btnAddCompetitor.addEventListener('click', () => {
    const url = els.competitor.value.trim();
    if (!url) return;
    state.draftCompetitors.push(url);
    els.competitor.value = '';
    state.addButtonIsMore = true;
    renderDraftCompetitors();
    updateAddButtonLabel();
  });

  els.btnNext2.addEventListener('click', () => {
    state.competitors = [...state.draftCompetitors];
    show('step3');
  });

  els.btnSkip2.addEventListener('click', () => {
    state.competitors = [];
    show('step3');
  });

  async function finishSurvey(usePriorities) {
    if (usePriorities) {
      const value = els.priorities.value.trim();
      state.priorities = value || null;
    } else {
      state.priorities = null;
    }
    els.errorStep3.classList.add('hidden');
    els.errorStep3.textContent = '';
    els.btnNext3.disabled = true;
    els.btnSkip3.disabled = true;
    try {
      await saveAnamnesis({
        description: state.description,
        competitors: state.competitors,
        priorities: state.priorities,
      });
    } catch (_) {
      els.errorStep3.textContent =
        'Не удалось сохранить ответы. Проверьте, что сервер запущен (http://localhost:3300), и нажмите ещё раз.';
      els.errorStep3.classList.remove('hidden');
      els.btnNext3.disabled = false;
      els.btnSkip3.disabled = false;
      return;
    }
    els.btnNext3.disabled = false;
    els.btnSkip3.disabled = false;
    show('home');
    updateInfoVisibility();
  }

  els.btnNext3.addEventListener('click', () => finishSurvey(true));
  els.btnSkip3.addEventListener('click', () => finishSurvey(false));

  els.btnInfo.addEventListener('click', openInfo);
  if (els.btnRescan) {
    els.btnRescan.addEventListener('click', startSurvey);
  }

  els.btnEditAdd.addEventListener('click', () => {
    const url = els.editCompetitor.value.trim();
    if (!url) return;
    state.editCompetitors.push(url);
    els.editCompetitor.value = '';
    renderEditCompetitors();
  });

  els.btnSave.addEventListener('click', async () => {
    els.btnSave.disabled = true;
    try {
      await saveAnamnesis({
        description: els.editDescription.value.trim() || null,
        competitors: [...state.editCompetitors],
        priorities: els.editPriorities.value.trim() || null,
      });
      await loadAnamnesis();
      show('home');
      renderAnamnesisPreview();
    } catch (e) {
      alert('Не удалось сохранить: ' + (e && e.message ? e.message : 'ошибка сервера'));
    } finally {
      els.btnSave.disabled = false;
    }
  });

  els.btnCancel.addEventListener('click', () => {
    show('home');
  });

  Promise.all([loadAnamnesis(), loadProjectLinks()]).then(() => {
    show('home');
    renderAnamnesisPreview();
  });
})();
