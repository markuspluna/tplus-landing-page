// Beat Saylor — Client-side logic
(function () {
  'use strict';

  const SAYLOR_BENCHMARK = 73429;
  const API_BASE = '/api';

  // State
  let currentUser = null;
  let remainingSubmissions = 10;

  // --- Navigation ---
  const navLinks = document.querySelectorAll('.bs-nav-link');
  const views = document.querySelectorAll('.bs-view');

  function switchView(name) {
    navLinks.forEach(l => l.classList.toggle('active', l.dataset.view === name));
    views.forEach(v => v.classList.toggle('active', v.id === 'view-' + name));
    if (name === 'home') loadLeaderboard();
  }

  navLinks.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      switchView(link.dataset.view);
    });
  });

  document.getElementById('cta-submit')?.addEventListener('click', () => switchView('submit'));
  document.getElementById('view-leaderboard-btn')?.addEventListener('click', () => switchView('home'));

  // --- Auth ---
  document.getElementById('login-btn')?.addEventListener('click', () => {
    window.location.href = API_BASE + '/auth/login';
  });
  document.getElementById('nav-login-btn')?.addEventListener('click', () => {
    window.location.href = API_BASE + '/auth/login';
  });

  // Nav dropdown toggle
  document.getElementById('nav-handle-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('nav-dropdown').classList.toggle('open');
  });
  document.addEventListener('click', () => {
    document.getElementById('nav-dropdown')?.classList.remove('open');
  });

  // Logout
  document.getElementById('nav-logout-btn')?.addEventListener('click', async () => {
    await fetch(API_BASE + '/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.reload();
  });

  async function checkAuth() {
    try {
      const res = await fetch(API_BASE + '/auth/me', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      currentUser = data.user;
      remainingSubmissions = data.remaining_submissions;
      showLoggedIn();
    } catch (e) {
      // not logged in
    }
  }

  function showLoggedIn() {
    if (!currentUser) return;
    // Nav auth state
    document.getElementById('nav-login-btn').style.display = 'none';
    var navUser = document.getElementById('nav-user');
    navUser.style.display = 'block';
    document.getElementById('nav-handle-btn').textContent = '@' + currentUser.handle;

    // Submit view auth gate
    document.getElementById('auth-gate').style.display = 'none';
    document.getElementById('submit-form').style.display = 'block';
    document.getElementById('user-info').textContent = '@' + currentUser.handle;
    updateRateLimitDisplay();
  }

  function updateRateLimitDisplay() {
    const el = document.getElementById('rate-limit-info');
    el.textContent = remainingSubmissions + ' submission' + (remainingSubmissions !== 1 ? 's' : '') + ' remaining this hour';
    el.style.color = remainingSubmissions <= 0 ? '#ED1F24' : '';
  }

  // --- Textarea ---
  const textarea = document.getElementById('strategy-input');
  const charCount = document.getElementById('char-count');
  const submitBtn = document.getElementById('submit-btn');

  textarea?.addEventListener('input', () => {
    const len = textarea.value.length;
    charCount.textContent = len + ' / 500';
    submitBtn.disabled = len === 0 || remainingSubmissions <= 0;
  });

  // --- Submission ---
  submitBtn?.addEventListener('click', submitStrategy);

  document.getElementById('try-again-btn')?.addEventListener('click', () => {
    document.getElementById('results-section').style.display = 'none';
    textarea.value = '';
    charCount.textContent = '0 / 500';
    submitBtn.disabled = true;
    textarea.focus();
  });

  async function submitStrategy() {
    const strategy = textarea.value.trim();
    if (!strategy) return;

    submitBtn.disabled = true;
    document.getElementById('loading-section').style.display = 'block';
    document.getElementById('results-section').style.display = 'none';

    try {
      const res = await fetch(API_BASE + '/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ strategy }),
      });

      let data;
      const text = await res.text();
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        document.getElementById('loading-section').style.display = 'none';
        submitBtn.disabled = false;
        alert('Server error (status ' + res.status + '): ' + text.substring(0, 200));
        return;
      }

      if (!res.ok) {
        document.getElementById('loading-section').style.display = 'none';
        submitBtn.disabled = false;
        alert(data.error || 'Submission failed (status ' + res.status + ')');
        return;
      }

      remainingSubmissions = data.remaining_submissions ?? Math.max(0, remainingSubmissions - 1);
      updateRateLimitDisplay();
      if (remainingSubmissions <= 0) submitBtn.disabled = true;

      document.getElementById('loading-section').style.display = 'none';
      showResults(data);
    } catch (e) {
      document.getElementById('loading-section').style.display = 'none';
      submitBtn.disabled = false;
      alert('Network error: ' + (e.message || e));
    }
  }

  function showResults(data) {
    document.getElementById('results-section').style.display = 'block';

    // Rank
    const rankEl = document.getElementById('result-rank');
    if (data.rank != null) {
      rankEl.innerHTML = '<span class="rank-number">#' + data.rank + '</span>rank';
    } else {
      rankEl.innerHTML = '';
    }

    // Score
    const score = data.effective_price;
    document.getElementById('result-score').textContent = formatUSD(score);

    const deltaEl = document.getElementById('result-delta');
    const delta = score - SAYLOR_BENCHMARK;
    const pct = ((delta / SAYLOR_BENCHMARK) * 100).toFixed(1);
    if (delta < 0) {
      deltaEl.textContent = formatUSD(Math.abs(delta)) + '/BTC better than Saylor (' + pct + '%)';
      deltaEl.className = 'bs-result-delta better';
    } else if (delta > 0) {
      deltaEl.textContent = formatUSD(delta) + '/BTC worse than Saylor (+' + pct + '%)';
      deltaEl.className = 'bs-result-delta worse';
    } else {
      deltaEl.textContent = 'Exactly matching Saylor';
      deltaEl.className = 'bs-result-delta';
    }

    // Cost breakdown
    const breakdownEl = document.getElementById('result-cost-breakdown');
    if (data.cost_breakdown) {
      var cb = data.cost_breakdown;
      var rows = '';
      if (cb.exchange_fees_usd) rows += '<tr><td>Exchange/OTC fees</td><td>' + formatUSD(Math.abs(cb.exchange_fees_usd)) + '</td></tr>';
      if (cb.slippage_usd) rows += '<tr><td>Slippage / market impact</td><td>' + formatUSD(Math.abs(cb.slippage_usd)) + '</td></tr>';
      if (cb.opportunity_cost_usd) rows += '<tr><td>Opportunity cost (3.5%)</td><td>' + formatUSD(Math.abs(cb.opportunity_cost_usd)) + '</td></tr>';
      if (cb.funding_carry_usd) rows += '<tr><td>Funding / carry / theta</td><td class="' + (cb.funding_carry_usd < 0 ? 'bs-delta-better' : '') + '">' + (cb.funding_carry_usd < 0 ? '-' : '+') + formatUSD(Math.abs(cb.funding_carry_usd)) + '</td></tr>';
      if (cb.other_usd) rows += '<tr><td>Other</td><td>' + formatUSD(Math.abs(cb.other_usd)) + '</td></tr>';
      if (rows) {
        breakdownEl.innerHTML = '<table class="bs-breakdown-table"><thead><tr><th>Cost Component</th><th>Amount</th></tr></thead><tbody>' + rows + '</tbody></table>';
        breakdownEl.style.display = 'block';
      } else {
        breakdownEl.style.display = 'none';
      }
    } else {
      breakdownEl.style.display = 'none';
    }

    // Feedback
    const feedbackEl = document.getElementById('result-feedback');
    if (data.feedback) {
      feedbackEl.textContent = data.feedback;
      feedbackEl.style.display = 'block';
    } else {
      feedbackEl.style.display = 'none';
    }

    // Penalties
    const penaltiesEl = document.getElementById('result-penalties');
    if (data.penalties && data.penalties.length > 0) {
      penaltiesEl.innerHTML = '<strong>Penalties:</strong><ul>' +
        data.penalties.map(function (p) { return '<li>' + escapeHtml(p) + '</li>'; }).join('') +
        '</ul>';
      penaltiesEl.style.display = 'block';
    } else {
      penaltiesEl.style.display = 'none';
    }

    document.getElementById('results-section').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // --- Leaderboard ---
  let leaderboardLoaded = false;

  async function loadLeaderboard() {
    const tbody = document.getElementById('leaderboard-body');
    const emptyEl = document.getElementById('leaderboard-empty');
    const skeletonEl = document.getElementById('leaderboard-loading');

    if (!leaderboardLoaded) {
      skeletonEl.classList.add('active');
      emptyEl.style.display = 'none';
    }

    try {
      const res = await fetch(API_BASE + '/leaderboard');
      if (!res.ok) return;
      const data = await res.json();

      skeletonEl.classList.remove('active');

      const entries = data.entries || [];

      if (entries.length === 0) {
        emptyEl.style.display = 'block';
        tbody.innerHTML = saylorRow();
        return;
      }

      emptyEl.style.display = 'none';

      let html = '';
      let saylorInserted = false;
      let rank = 1;

      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];

        // Insert Saylor row at the right position
        if (!saylorInserted && entry.best_score > SAYLOR_BENCHMARK) {
          html += saylorRow();
          saylorInserted = true;
        }

        const delta = entry.best_score - SAYLOR_BENCHMARK;
        const deltaStr = delta < 0
          ? '<span class="bs-delta-better">-' + formatUSD(Math.abs(delta)) + '</span>'
          : delta > 0
            ? '<span class="bs-delta-worse">+' + formatUSD(delta) + '</span>'
            : '<span>—</span>';

        const isUser = currentUser && entry.handle === currentUser.handle;
        const rowClass = isUser ? 'bs-user-row' : '';

        html += '<tr class="' + rowClass + '">' +
          '<td>' + rank + '</td>' +
          '<td>@' + escapeHtml(entry.handle) + '</td>' +
          '<td>' + formatUSD(entry.best_score) + '</td>' +
          '<td>' + deltaStr + '</td>' +
          '<td>' + entry.submission_count + '</td>' +
          '</tr>';

        rank++;
      }

      if (!saylorInserted) html += saylorRow();

      tbody.innerHTML = html;
    } catch (e) {
      skeletonEl.classList.remove('active');
    }
  }

  function saylorRow() {
    return '<tr class="bs-saylor-row">' +
      '<td>—</td>' +
      '<td>@saylor</td>' +
      '<td>$73,429</td>' +
      '<td>BENCHMARK</td>' +
      '<td>1</td>' +
      '</tr>';
  }

  // --- Helpers ---
  function formatUSD(num) {
    if (num == null) return '—';
    return '$' + Math.round(num).toLocaleString();
  }

  function escapeHtml(str) {
    const el = document.createElement('span');
    el.textContent = str;
    return el.innerHTML;
  }

  // --- Init ---
  checkAuth();
  loadLeaderboard();
})();
