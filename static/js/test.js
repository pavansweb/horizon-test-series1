/**
 * Horizon Test Series - CBT Examination Engine
 */

(function () {
  'use strict';

  // Elements
  const elHeaderTimer = document.getElementById('header-timer');
  const elQuestionNumber = document.getElementById('current-q-number');
  const elPdfContainer = document.getElementById('pdf-scroll-container');
  const elPdfCanvasContainer = document.getElementById('pdf-canvas-container');
  const elPdfIframe = document.getElementById('pdf-fallback-iframe');
  const elPdfLoading = document.getElementById('pdf-loading-indicator');
  const elZoomLevel = document.getElementById('zoom-level-text');
  const elOptionsContainer = document.getElementById('options-container');
  const elClearResponseBtn = document.getElementById('clear-response-btn');
  const elBtnSaveNext = document.getElementById('btn-save-next');
  const elBtnSaveMark = document.getElementById('btn-save-mark');
  const elBtnMarkNext = document.getElementById('btn-mark-next');
  const elBtnPrev = document.getElementById('btn-prev');
  const elBtnNext = document.getElementById('btn-next');
  const elBtnSubmit = document.getElementById('btn-submit');
  const elSubjectTabs = document.getElementById('subject-tabs');
  const elPaletteGrid = document.getElementById('palette-grid');
  const elSplitterToggle = document.getElementById('splitter-toggle-btn');
  const elRightPalette = document.getElementById('right-palette-panel');
  const elLeftArea = document.getElementById('left-question-panel');

  // Modals
  const elSubmitModal = document.getElementById('submit-modal');
  const elSubmitSummaryTbody = document.getElementById('submit-summary-tbody');
  const elModalCloseBtn = document.getElementById('modal-close-btn');
  const elModalCancelBtn = document.getElementById('modal-cancel-btn');
  const elModalConfirmBtn = document.getElementById('modal-confirm-btn');

  // State
  let testData = null;
  let currentQuestion = 1;
  let activeSubjectId = '';
  let activePaletteFilter = 'all'; // 'all' or subjectId ('physics', 'chemistry', 'mathematics')
  let selectedOption = null;
  let candidateResponses = {}; // qNum -> { selectedOption, status, visited }
  let timeRemaining = 180 * 60;
  let timerInterval = null;
  let isPaletteCollapsed = false;
  let isSubmitting = false;
  let zoomLevel = 90;
  let pdfDoc = null;

  const storageKey = `horizon_cbt_${window.TEST_ID}`;

  // Initialize
  async function init() {
    try {
      const res = await fetch(`/api/tests/${window.TEST_ID}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.error || 'Failed to load test paper');
        return;
      }

      testData = data.test;
      const totalQ = testData.totalQuestions || 90;

      // Restore session or init fresh
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.candidateResponses) candidateResponses = parsed.candidateResponses;
          if (parsed.timeRemaining !== undefined) timeRemaining = Math.max(parsed.timeRemaining, 10);
          if (parsed.currentQuestion) currentQuestion = parsed.currentQuestion;
          if (parsed.activeSubjectId) activeSubjectId = parsed.activeSubjectId;
          if (parsed.candidateName) {
            window.CANDIDATE_NAME = parsed.candidateName;
            const elName = document.getElementById('candidate-name-display');
            if (elName) elName.textContent = parsed.candidateName;
          }
        } catch (e) {
          console.warn('Failed to parse saved session', e);
        }
      } else {
        timeRemaining = (testData.duration || 180) * 60;
        candidateResponses[1] = { selectedOption: null, status: 'not_answered', visited: true };
        if (testData.subjects && testData.subjects[0]) {
          activeSubjectId = testData.subjects[0].id;
        }
      }

      // Render subjects
      renderSubjectTabs();

      // Initialize theme
      initTheme();

      // Start timer
      startTimer();

      // Load PDF
      initPdfViewer(testData.pdfUrl);

      // Render question view
      navigateToQuestion(currentQuestion, false);

      // Bind events
      bindEvents();
    } catch (err) {
      console.error('Initialization error:', err);
      alert('Network error loading test.');
    }
  }

  // Theme Management
  function initTheme() {
    const saved = localStorage.getItem('cbt_theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = saved || (prefersDark ? 'dark' : 'light');
    applyTheme(initialTheme);

    const toggleBtn = document.getElementById('theme-toggle-btn');
    if (toggleBtn) {
      toggleBtn.onclick = () => {
        const isDark = document.body.classList.contains('dark') || document.documentElement.getAttribute('data-theme') === 'dark';
        const newTheme = isDark ? 'light' : 'dark';
        applyTheme(newTheme);
        localStorage.setItem('cbt_theme', newTheme);
        renderOptions();
        renderPalette();
      };
    }
  }

  function applyTheme(theme) {
    const isDark = theme === 'dark';
    if (isDark) {
      document.body.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.body.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }

    const iconSun = document.getElementById('theme-icon-sun');
    const iconMoon = document.getElementById('theme-icon-moon');
    if (iconSun && iconMoon) {
      iconSun.style.display = isDark ? 'block' : 'none';
      iconMoon.style.display = isDark ? 'none' : 'block';
    }
  }

  // Timer
  function formatTime(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h}:${m}:${s.toString().padStart(2, '0')}`;
  }

  function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    elHeaderTimer.textContent = formatTime(timeRemaining);

    timerInterval = setInterval(() => {
      if (timeRemaining <= 1) {
        clearInterval(timerInterval);
        elHeaderTimer.textContent = '0:0:00';
        handleFinalSubmit();
        return;
      }
      timeRemaining--;
      elHeaderTimer.textContent = formatTime(timeRemaining);

      // Auto-save every 5 seconds
      if (timeRemaining % 5 === 0) {
        saveProgress();
      }
    }, 1000);
  }

  function saveProgress() {
    if (!testData) return;
    const sessionData = {
      testId: window.TEST_ID,
      candidateName: window.CANDIDATE_NAME || 'JEE Aspirant',
      candidateResponses,
      timeRemaining,
      currentQuestion,
      activeSubjectId,
      lastSaved: new Date().toISOString(),
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(sessionData));
    } catch (e) {
      // Ignore
    }
  }

  // Subject Tabs
  function renderSubjectTabs() {
    if (!testData) return;
    elSubjectTabs.innerHTML = '';

    // 1. "ALL QUESTIONS" Tab (Replaces JUT90 NEET)
    const allBtn = document.createElement('button');
    allBtn.type = 'button';
    allBtn.textContent = 'ALL QUESTIONS';
    allBtn.className = 'subject-tab-btn';
    const isAllActive = activePaletteFilter === 'all';

    allBtn.style.padding = '8px 18px';
    allBtn.style.fontSize = '12px';
    allBtn.style.fontWeight = '700';
    allBtn.style.cursor = 'pointer';
    allBtn.style.border = 'none';
    allBtn.style.borderRight = '1px solid #2b568c';
    allBtn.style.letterSpacing = '0.6px';
    allBtn.style.textTransform = 'uppercase';
    allBtn.style.background = isAllActive ? '#15345d' : 'transparent';
    allBtn.style.color = isAllActive ? '#ffffff' : '#bfdbfe';
    allBtn.style.borderBottom = isAllActive ? '3px solid #60a5fa' : '3px solid transparent';
    allBtn.style.whiteSpace = 'nowrap';
    allBtn.style.transition = 'all 0.15s ease';

    allBtn.onclick = () => {
      activePaletteFilter = 'all';
      renderSubjectTabs();
      renderPalette();
    };

    elSubjectTabs.appendChild(allBtn);

    // 2. Individual Subject Tabs (Physics, Chemistry, Mathematics)
    (testData.subjects || []).forEach((sub) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = sub.name;
      btn.className = 'subject-tab-btn';
      const isSubActive = activePaletteFilter === sub.id;

      btn.style.padding = '8px 18px';
      btn.style.fontSize = '12px';
      btn.style.fontWeight = '700';
      btn.style.cursor = 'pointer';
      btn.style.border = 'none';
      btn.style.borderRight = '1px solid #2b568c';
      btn.style.letterSpacing = '0.6px';
      btn.style.textTransform = 'uppercase';
      btn.style.background = isSubActive ? '#15345d' : 'transparent';
      btn.style.color = isSubActive ? '#ffffff' : '#bfdbfe';
      btn.style.borderBottom = isSubActive ? '3px solid #60a5fa' : '3px solid transparent';
      btn.style.whiteSpace = 'nowrap';
      btn.style.transition = 'all 0.15s ease';

      btn.onclick = () => {
        activePaletteFilter = sub.id;
        activeSubjectId = sub.id;
        renderSubjectTabs();
        // If current question is outside this subject, navigate to its start question
        if (currentQuestion < sub.startQuestion || currentQuestion > sub.endQuestion) {
          navigateToQuestion(sub.startQuestion);
        } else {
          renderPalette();
        }
      };

      elSubjectTabs.appendChild(btn);
    });
  }

  // Question Navigation
  function navigateToQuestion(qNum, autoSave = true) {
    const totalQ = testData.totalQuestions || 90;
    if (qNum < 1 || qNum > totalQ) return;

    currentQuestion = qNum;
    elQuestionNumber.textContent = qNum;

    // Check existing response
    const existing = candidateResponses[qNum];
    if (existing) {
      selectedOption = existing.selectedOption;
    } else {
      selectedOption = null;
      candidateResponses[qNum] = { selectedOption: null, status: 'not_answered', visited: true };
    }

    // Update active subject and palette filter if needed
    for (const sub of testData.subjects || []) {
      if (qNum >= sub.startQuestion && qNum <= sub.endQuestion) {
        activeSubjectId = sub.id;
        if (activePaletteFilter !== 'all' && activePaletteFilter !== sub.id) {
          activePaletteFilter = sub.id;
        }
        renderSubjectTabs();
        break;
      }
    }

    // Update options radio
    renderOptions();

    // Update button states
    updateActionButtons();

    // Re-render palette
    renderPalette();

    if (autoSave) saveProgress();
  }

  function isIntegerQuestion(qNum) {
    if (testData && testData.integerQuestions && testData.integerQuestions.length > 0) {
      return testData.integerQuestions.includes(qNum);
    }
    return (
      (qNum >= 21 && qNum <= 25) ||
      (qNum >= 45 && qNum <= 50) ||
      (qNum >= 70 && qNum <= 75)
    );
  }

  // Render Options 1), 2), 3), 4) or Numerical Keypad
  function renderOptions() {
    elOptionsContainer.innerHTML = '';
    const isDark = document.body.classList.contains('dark') || document.documentElement.getAttribute('data-theme') === 'dark';

    if (isIntegerQuestion(currentQuestion)) {
      const container = document.createElement('div');
      container.className = 'numerical-input-container';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.gap = '8px';
      container.style.maxWidth = '360px';

      const badge = document.createElement('div');
      badge.innerHTML = '<span style="font-size: 11px; font-weight: bold; background: #dbeafe; color: #1e3a8a; padding: 2px 6px; border-radius: 4px; border: 1px solid #bfdbfe; text-transform: uppercase;">Numerical Value Answer</span> <span style="font-size: 11px; color: #64748b;">(Use keyboard or keypad)</span>';
      container.appendChild(badge);

      const inputRow = document.createElement('div');
      inputRow.style.display = 'flex';
      inputRow.style.alignItems = 'center';
      inputRow.style.gap = '8px';

      const label = document.createElement('span');
      label.textContent = 'Answer:';
      label.style.fontWeight = 'bold';
      label.style.fontSize = '14px';
      label.style.color = isDark ? '#e2e8f0' : '#1e293b';
      inputRow.appendChild(label);

      const numInput = document.createElement('input');
      numInput.type = 'text';
      numInput.value = selectedOption || '';
      numInput.placeholder = 'e.g. 5 or -2.5';
      numInput.style.padding = '6px 10px';
      numInput.style.border = '2px solid #2563eb';
      numInput.style.borderRadius = '4px';
      numInput.style.fontWeight = 'bold';
      numInput.style.fontSize = '16px';
      numInput.style.width = '180px';
      numInput.style.background = isDark ? '#1e293b' : '#ffffff';
      numInput.style.color = isDark ? '#f8fafc' : '#0f172a';
      numInput.oninput = (e) => {
        selectedOption = e.target.value;
        updateActionButtons();
      };
      inputRow.appendChild(numInput);
      container.appendChild(inputRow);

      // Keypad
      const keypadWrap = document.createElement('div');
      keypadWrap.style.background = isDark ? '#0f172a' : '#f8fafc';
      keypadWrap.style.border = `1px solid ${isDark ? '#334155' : '#cbd5e1'}`;
      keypadWrap.style.borderRadius = '6px';
      keypadWrap.style.padding = '8px';
      keypadWrap.style.width = 'fit-content';

      const keysGrid = document.createElement('div');
      keysGrid.style.display = 'grid';
      keysGrid.style.gridTemplateColumns = 'repeat(3, 1fr)';
      keysGrid.style.gap = '6px';
      keysGrid.style.width = '180px';

      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '-'].forEach((k) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = k;
        btn.style.padding = '6px 0';
        btn.style.background = isDark ? '#1e293b' : '#ffffff';
        btn.style.color = isDark ? '#f8fafc' : '#0f172a';
        btn.style.border = `1px solid ${isDark ? '#334155' : '#cbd5e1'}`;
        btn.style.borderRadius = '4px';
        btn.style.fontWeight = 'bold';
        btn.style.fontSize = '14px';
        btn.style.cursor = 'pointer';
        btn.onclick = () => {
          selectedOption = (selectedOption || '') + k;
          numInput.value = selectedOption;
          updateActionButtons();
        };
        keysGrid.appendChild(btn);
      });

      // Backspace
      const btnBack = document.createElement('button');
      btnBack.type = 'button';
      btnBack.textContent = '⌫ Back';
      btnBack.style.padding = '6px 0';
      btnBack.style.background = '#fef3c7';
      btnBack.style.border = '1px solid #fcd34d';
      btnBack.style.borderRadius = '4px';
      btnBack.style.fontWeight = 'bold';
      btnBack.style.fontSize = '11px';
      btnBack.style.color = '#92400e';
      btnBack.style.cursor = 'pointer';
      btnBack.onclick = () => {
        const cur = selectedOption || '';
        if (cur.length > 0) {
          selectedOption = cur.slice(0, -1);
          numInput.value = selectedOption;
          updateActionButtons();
        }
      };
      keysGrid.appendChild(btnBack);

      // Clear
      const btnClr = document.createElement('button');
      btnClr.type = 'button';
      btnClr.textContent = 'Clear';
      btnClr.style.gridColumn = 'span 2';
      btnClr.style.padding = '6px 0';
      btnClr.style.background = '#fee2e2';
      btnClr.style.border = '1px solid #fca5a5';
      btnClr.style.borderRadius = '4px';
      btnClr.style.fontWeight = 'bold';
      btnClr.style.fontSize = '11px';
      btnClr.style.color = '#991b1b';
      btnClr.style.cursor = 'pointer';
      btnClr.onclick = () => {
        selectedOption = null;
        numInput.value = '';
        updateActionButtons();
      };
      keysGrid.appendChild(btnClr);

      keypadWrap.appendChild(keysGrid);
      container.appendChild(keypadWrap);
      elOptionsContainer.appendChild(container);

      elClearResponseBtn.style.display = selectedOption ? 'inline-block' : 'none';
      return;
    }

    const opts = [
      { key: 'A', num: '1', label: '1)' },
      { key: 'B', num: '2', label: '2)' },
      { key: 'C', num: '3', label: '3)' },
      { key: 'D', num: '4', label: '4)' },
    ];

    elOptionsContainer.innerHTML = '';
    const isDark = document.body.classList.contains('dark') || document.documentElement.getAttribute('data-theme') === 'dark';

    opts.forEach((opt) => {
      const isSelected = selectedOption === opt.key || selectedOption === opt.num;

      const label = document.createElement('label');
      label.className = 'flex items-center gap-3 cursor-pointer';
      label.style.display = 'flex';
      label.style.alignItems = 'center';
      label.style.gap = '12px';
      label.style.padding = '3px 0';
      label.style.width = 'fit-content';
      label.style.cursor = 'pointer';

      // Radio circle
      const circle = document.createElement('div');
      circle.className = `option-circle ${isSelected ? 'selected' : ''}`;
      circle.style.width = '22px';
      circle.style.height = '22px';
      circle.style.borderRadius = '50%';
      circle.style.border = isSelected
        ? `2.5px solid ${isDark ? '#60a5fa' : '#1e4273'}`
        : `2.5px solid ${isDark ? '#64748b' : '#64748b'}`;
      circle.style.display = 'flex';
      circle.style.alignItems = 'center';
      circle.style.justifyContent = 'center';
      circle.style.background = isDark ? '#1e293b' : '#ffffff';
      circle.style.flexShrink = '0';

      if (isSelected) {
        const dot = document.createElement('div');
        dot.style.width = '11px';
        dot.style.height = '11px';
        dot.style.borderRadius = '50%';
        dot.style.background = isDark ? '#60a5fa' : '#1e4273';
        circle.appendChild(dot);
      }

      const text = document.createElement('span');
      text.className = 'option-label-text';
      text.textContent = opt.label;
      text.style.fontSize = '16px';
      text.style.fontWeight = isSelected ? '700' : '600';
      text.style.color = isSelected
        ? (isDark ? '#93c5fd' : '#0f172a')
        : (isDark ? '#e2e8f0' : '#1e293b');

      label.appendChild(circle);
      label.appendChild(text);

      label.onclick = () => {
        selectedOption = opt.key;
        renderOptions();
        updateActionButtons();
      };

      elOptionsContainer.appendChild(label);
    });

    elClearResponseBtn.style.display = selectedOption ? 'inline-block' : 'none';
  }

  function updateActionButtons() {
    const totalQ = testData.totalQuestions || 75;
    elBtnPrev.disabled = currentQuestion <= 1;
    elBtnNext.disabled = currentQuestion >= totalQ;

    // Save & Mark for review enabled only when option selected
    elBtnSaveMark.disabled = !selectedOption;
    elBtnSaveMark.style.background = selectedOption ? '#d9822b' : '#e0e0e0';
    elBtnSaveMark.style.cursor = selectedOption ? 'pointer' : 'not-allowed';
    elBtnSaveMark.style.color = selectedOption ? '#ffffff' : '#9e9e9e';
  }

  // Render 9-Column Question Palette with section line-breaks and subject filtering
  function renderPalette() {
    if (!testData) return;
    elPaletteGrid.innerHTML = '';

    // Determine section ranges: either from testData.subjects or chunks of 25
    let sections = [];
    if (testData.subjects && testData.subjects.length > 0) {
      sections = testData.subjects.map((s) => ({
        id: s.id,
        name: s.name,
        start: s.startQuestion,
        end: s.endQuestion,
      }));
    } else {
      const totalQ = testData.totalQuestions || 75;
      for (let s = 1; s <= totalQ; s += 25) {
        sections.push({
          id: `sec_${s}`,
          name: `Section`,
          start: s,
          end: Math.min(s + 24, totalQ),
        });
      }
    }

    // Filter to specific subject if activePaletteFilter is not 'all'
    if (activePaletteFilter !== 'all') {
      sections = sections.filter((s) => s.id === activePaletteFilter);
    }

    sections.forEach((sec, secIdx) => {
      const secGrid = document.createElement('div');
      secGrid.style.display = 'grid';
      secGrid.style.gridTemplateColumns = 'repeat(9, minmax(0, 1fr))';
      secGrid.style.gap = '5px';
      secGrid.style.marginBottom = secIdx < sections.length - 1 ? '10px' : '0';

      for (let q = sec.start; q <= sec.end; q++) {
        const resp = candidateResponses[q];
        const status = resp ? resp.status : 'not_visited';
        const isActive = q === currentQuestion;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = q;
        btn.className = `palette-badge badge-${status.replace(/_/g, '-')}`;
        btn.style.width = '34px';
        btn.style.height = '34px';
        btn.style.fontSize = '12.5px';
        btn.style.fontWeight = '700';
        btn.style.display = 'inline-flex';
        btn.style.alignItems = 'center';
        btn.style.justifyContent = 'center';
        btn.style.cursor = 'pointer';
        btn.style.position = 'relative';
        btn.style.padding = '0';
        btn.style.fontFamily = '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif';

        if (isActive) {
          const isDark = document.body.classList.contains('dark') || document.documentElement.getAttribute('data-theme') === 'dark';
          btn.style.outline = isDark ? '2.5px solid #60a5fa' : '2.5px solid #2563eb';
          btn.style.outlineOffset = '1px';
        }

        btn.onclick = () => {
          navigateToQuestion(q);
        };

        secGrid.appendChild(btn);
      }

      elPaletteGrid.appendChild(secGrid);
    });
  }

  // Action Button Handlers
  function handleSaveAndNext() {
    const newStatus = selectedOption ? 'answered' : 'not_answered';
    candidateResponses[currentQuestion] = {
      selectedOption: selectedOption,
      status: newStatus,
      visited: true,
    };

    const totalQ = testData.totalQuestions || 90;
    if (currentQuestion < totalQ) {
      navigateToQuestion(currentQuestion + 1);
    } else {
      renderPalette();
      saveProgress();
    }
  }

  function handleSaveAndMarkForReview() {
    if (!selectedOption) return;
    candidateResponses[currentQuestion] = {
      selectedOption: selectedOption,
      status: 'answered_and_marked',
      visited: true,
    };

    const totalQ = testData.totalQuestions || 90;
    if (currentQuestion < totalQ) {
      navigateToQuestion(currentQuestion + 1);
    } else {
      renderPalette();
      saveProgress();
    }
  }

  function handleMarkForReviewAndNext() {
    const newStatus = selectedOption ? 'answered_and_marked' : 'marked_for_review';
    candidateResponses[currentQuestion] = {
      selectedOption: selectedOption,
      status: newStatus,
      visited: true,
    };

    const totalQ = testData.totalQuestions || 90;
    if (currentQuestion < totalQ) {
      navigateToQuestion(currentQuestion + 1);
    } else {
      renderPalette();
      saveProgress();
    }
  }

  function handleClearResponse() {
    selectedOption = null;
    candidateResponses[currentQuestion] = {
      selectedOption: null,
      status: 'not_answered',
      visited: true,
    };
    renderOptions();
    updateActionButtons();
    renderPalette();
    saveProgress();
  }

  // Submit Modal Summary
  function openSubmitModal() {
    if (!testData) return;
    elSubmitSummaryTbody.innerHTML = '';

    (testData.subjects || []).forEach((sub) => {
      let ans = 0, notAns = 0, marked = 0, ansMarked = 0, notVis = 0;

      for (let q = sub.startQuestion; q <= sub.endQuestion; q++) {
        const resp = candidateResponses[q];
        const st = resp ? resp.status : 'not_visited';
        if (st === 'answered') ans++;
        else if (st === 'not_answered') notAns++;
        else if (st === 'marked_for_review') marked++;
        else if (st === 'answered_and_marked') ansMarked++;
        else notVis++;
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="padding: 6px 8px; border: 1px solid #d1d5db; font-weight: 700; text-align: left;">${sub.name}</td>
        <td style="padding: 6px 8px; border: 1px solid #d1d5db; text-align: center;">${sub.totalQuestions}</td>
        <td style="padding: 6px 8px; border: 1px solid #d1d5db; text-align: center; color: #2e7d32; font-weight: 700;">${ans}</td>
        <td style="padding: 6px 8px; border: 1px solid #d1d5db; text-align: center; color: #c62828;">${notAns}</td>
        <td style="padding: 6px 8px; border: 1px solid #d1d5db; text-align: center; color: #7b1fa2;">${marked}</td>
        <td style="padding: 6px 8px; border: 1px solid #d1d5db; text-align: center; color: #512da8; font-weight: 700;">${ansMarked}</td>
        <td style="padding: 6px 8px; border: 1px solid #d1d5db; text-align: center; color: #6b7280;">${notVis}</td>
      `;
      elSubmitSummaryTbody.appendChild(tr);
    });

    elSubmitModal.style.display = 'flex';
  }

  function closeSubmitModal() {
    elSubmitModal.style.display = 'none';
  }

  async function handleFinalSubmit() {
    if (isSubmitting || !testData) return;
    try {
      isSubmitting = true;
      elModalConfirmBtn.textContent = 'Submitting...';
      elModalConfirmBtn.disabled = true;

      const answers = {};
      const totalQ = testData.totalQuestions || 90;
      for (let q = 1; q <= totalQ; q++) {
        answers[q] = candidateResponses[q]?.selectedOption || null;
      }

      const timeTaken = (testData.duration || 180) * 60 - timeRemaining;

      const res = await fetch(`/api/tests/${window.TEST_ID}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateResponses: answers,
          timeTakenSeconds: Math.max(timeTaken, 0),
          candidateName: window.CANDIDATE_NAME || 'JEE Aspirant',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || 'Failed to submit test');
        isSubmitting = false;
        elModalConfirmBtn.textContent = 'Yes, Submit Test';
        elModalConfirmBtn.disabled = false;
        return;
      }

      // Success - clear saved session and redirect
      localStorage.removeItem(storageKey);
      window.location.href = `/result/${data.submissionId}`;
    } catch (err) {
      console.error('Submission failed', err);
      alert('Network error while submitting test.');
      isSubmitting = false;
      elModalConfirmBtn.textContent = 'Yes, Submit Test';
      elModalConfirmBtn.disabled = false;
    }
  }

  // PDF Viewer initialization
  async function initPdfViewer(pdfUrl) {
    try {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

        const loadingTask = window.pdfjsLib.getDocument({
          url: pdfUrl,
          cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
          cMapPacked: true,
        });

        pdfDoc = await loadingTask.promise;
        elPdfLoading.style.display = 'none';
        renderPdfPages();
      } else {
        throw new Error('PDF.js not loaded, switching to iframe');
      }
    } catch (err) {
      console.warn('PDF.js error or fallback needed:', err);
      elPdfLoading.style.display = 'none';
      elPdfCanvasContainer.style.display = 'none';
      const startPage = Math.max(1, (testData && testData.pdfStartPage) || 1);
      elPdfIframe.src = `${pdfUrl}#page=${startPage}&toolbar=0&navpanes=0&scrollbar=1&view=FitH`;
      elPdfIframe.style.display = 'block';
    }
  }

  async function renderPdfPages() {
    if (!pdfDoc) return;
    elPdfCanvasContainer.innerHTML = '';
    const scale = (zoomLevel / 100) * 1.15;
    const pixelRatio = window.devicePixelRatio || 1;

    const startPage = Math.max(1, (testData && testData.pdfStartPage) || 1);
    const endPage = Math.min(pdfDoc.numPages, (testData && testData.pdfEndPage) || pdfDoc.numPages);

    for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
      try {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale });

        const isDark = document.body.classList.contains('dark') || document.documentElement.getAttribute('data-theme') === 'dark';
        const pageWrapper = document.createElement('div');
        pageWrapper.style.margin = '0 auto 8px auto';
        pageWrapper.style.boxShadow = isDark ? '0 2px 8px rgba(0,0,0,0.6)' : '0 1px 3px rgba(0,0,0,0.18)';
        pageWrapper.style.border = isDark ? '1px solid #334155' : '1px solid #e2e8f0';
        pageWrapper.style.backgroundColor = '#ffffff';
        pageWrapper.style.width = `${viewport.width}px`;
        pageWrapper.style.maxWidth = '100%';

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width * pixelRatio;
        canvas.height = viewport.height * pixelRatio;
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        canvas.style.maxWidth = '100%';
        canvas.style.display = 'block';

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.scale(pixelRatio, pixelRatio);
          pageWrapper.appendChild(canvas);
          elPdfCanvasContainer.appendChild(pageWrapper);

          await page.render({ canvasContext: ctx, viewport }).promise;
        }
      } catch (e) {
        console.warn('Error rendering page', pageNum, e);
      }
    }
  }

  // Event bindings
  function bindEvents() {
    elBtnSaveNext.onclick = handleSaveAndNext;
    elBtnSaveMark.onclick = handleSaveAndMarkForReview;
    elBtnMarkNext.onclick = handleMarkForReviewAndNext;
    elBtnPrev.onclick = () => navigateToQuestion(currentQuestion - 1);
    elBtnNext.onclick = () => navigateToQuestion(currentQuestion + 1);
    elClearResponseBtn.onclick = handleClearResponse;
    elBtnSubmit.onclick = openSubmitModal;

    elModalCloseBtn.onclick = closeSubmitModal;
    elModalCancelBtn.onclick = closeSubmitModal;
    elModalConfirmBtn.onclick = handleFinalSubmit;

    // Circular blue arrows: scroll PDF container smoothly
    document.getElementById('btn-scroll-down').onclick = () => {
      elPdfContainer.scrollBy({ top: 140, behavior: 'smooth' });
    };
    document.getElementById('btn-scroll-up').onclick = () => {
      elPdfContainer.scrollBy({ top: -140, behavior: 'smooth' });
    };

    // Zoom controls
    document.getElementById('btn-zoom-in').onclick = () => {
      zoomLevel = Math.min(150, zoomLevel + 10);
      elZoomLevel.textContent = `${zoomLevel}%`;
      renderPdfPages();
    };
    document.getElementById('btn-zoom-out').onclick = () => {
      zoomLevel = Math.max(50, zoomLevel - 10);
      elZoomLevel.textContent = `${zoomLevel}%`;
      renderPdfPages();
    };

    // Splitter Collapse Toggle
    elSplitterToggle.onclick = () => {
      isPaletteCollapsed = !isPaletteCollapsed;
      if (isPaletteCollapsed) {
        elRightPalette.style.display = 'none';
        elLeftArea.style.flex = '1 1 100%';
        elSplitterToggle.textContent = '<';
        elSplitterToggle.title = 'Show Question Palette';
      } else {
        elRightPalette.style.display = 'block';
        elLeftArea.style.flex = '1 1 68%';
        elSplitterToggle.textContent = '>';
        elSplitterToggle.title = 'Hide Question Palette';
      }
    };
  }

  // Boot
  document.addEventListener('DOMContentLoaded', init);
})();
