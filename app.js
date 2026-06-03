/* ============================================================
   PayEdgePro — app.js
   Core: navigation, dashboard, charts, theme, global events
   ============================================================ */

'use strict';

// ── Utilities ──────────────────────────────────────────────
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
const fmt = (n) => '$' + parseFloat(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const today = () => new Date().toISOString().split('T')[0];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// Storage helpers
const store = {
  get: (k) => { try { return JSON.parse(localStorage.getItem('pep_' + k)) || []; } catch { return []; } },
  set: (k, v) => localStorage.setItem('pep_' + k, JSON.stringify(v)),
  obj: (k) => { try { return JSON.parse(localStorage.getItem('pep_' + k)) || {}; } catch { return {}; } }
};

// Toast
let toastTimer;
function showToast(msg, type = 'success') {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'toast show ' + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.className = 'toast', 3000);
}

// Confirm helper
function confirmAction(msg) { return window.confirm(msg); }

// ── Navigation ─────────────────────────────────────────────
const PAGES = ['dashboard','expenses','invoices','debts','profit','clients','reports','pricing','support'];
let currentPage = 'dashboard';

function navigateTo(page) {
  if (!PAGES.includes(page)) return;
  currentPage = page;

  // Update pages
  $$('.page').forEach(p => p.classList.remove('active'));
  const target = $('#page-' + page);
  if (target) target.classList.add('active');

  // Update nav
  $$('.nav-item').forEach(a => {
    a.classList.toggle('active', a.dataset.page === page);
  });

  // Update title
  const titles = {
    dashboard: 'Dashboard', expenses: 'Expenses', invoices: 'Invoices',
    debts: 'Debt Tracker', profit: 'Profit Calculator', clients: 'Clients',
    reports: 'Reports', pricing: 'Pricing', support: 'Support'
  };
  $('#pageTitle').textContent = titles[page] || page;

  // Close mobile sidebar
  $('#sidebar').classList.remove('open');

  // Refresh page data
  if (page === 'dashboard') refreshDashboard();
  if (page === 'expenses')  Expenses.render();
  if (page === 'invoices')  Invoices.render();
  if (page === 'debts')     Debts.render();
  if (page === 'profit')    refreshProfitPage();
  if (page === 'clients')   Clients.render();
  if (page === 'reports')   Reports.init();
}

// Link clicks (nav + footer + card-links)
document.addEventListener('click', (e) => {
  const link = e.target.closest('[data-page]');
  if (link) { e.preventDefault(); navigateTo(link.dataset.page); }
});

// ── Theme Toggle ───────────────────────────────────────────
(function initTheme() {
  const saved = localStorage.getItem('pep_theme') || 'dark';
  document.documentElement.dataset.theme = saved;
})();

$('#themeToggle').addEventListener('click', () => {
  const cur = document.documentElement.dataset.theme;
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('pep_theme', next);
  refreshDashboard();
});

// ── Mobile Sidebar ─────────────────────────────────────────
$('#mobileMenuBtn').addEventListener('click', () => {
  $('#sidebar').classList.toggle('open');
});

// ── Page Date ──────────────────────────────────────────────
function setPageDate() {
  $('#pageDate').textContent = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
}
setPageDate();

// ── Quick Add Button ───────────────────────────────────────
$('#quickAddBtn').addEventListener('click', () => {
  if (currentPage === 'invoices') Invoices.openModal();
  else if (currentPage === 'debts') Debts.openModal();
  else if (currentPage === 'clients') Clients.openModal();
  else Expenses.openModal();
});

// ── Modal Infrastructure ───────────────────────────────────
function openModal(id) { $('#' + id).classList.add('open'); }
function closeModal(id) { $('#' + id).classList.remove('open'); }

document.addEventListener('click', (e) => {
  // Close button
  if (e.target.closest('.modal-close') || e.target.dataset.modal) {
    const id = e.target.closest('.modal-close')?.dataset?.modal || e.target.dataset.modal;
    if (id) closeModal(id);
  }
  // Click outside
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
  }
});

// ── Dashboard Charts ───────────────────────────────────────
let incomeExpenseChartInst = null;
let expensePieChartInst    = null;

function getChartColors() {
  const dark = document.documentElement.dataset.theme === 'dark';
  return {
    grid:  dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)',
    text:  dark ? '#8b949e' : '#5a6478',
    bg:    dark ? '#161b22' : '#ffffff',
  };
}

function buildMonthLabels(count) {
  const labels = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));
  }
  return labels;
}

function getMonthlyData(months) {
  const expenses = store.get('expenses');
  const revenues = store.get('revenues');
  const now = new Date();
  const inc = [], exp = [];

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yr = d.getFullYear(), mo = d.getMonth();

    const incAmt = revenues.filter(r => {
      const rd = new Date(r.date);
      return rd.getFullYear() === yr && rd.getMonth() === mo;
    }).reduce((s, r) => s + parseFloat(r.amount || 0), 0);

    const expAmt = expenses.filter(r => {
      const rd = new Date(r.date);
      return rd.getFullYear() === yr && rd.getMonth() === mo;
    }).reduce((s, r) => s + parseFloat(r.amount || 0), 0);

    inc.push(parseFloat(incAmt.toFixed(2)));
    exp.push(parseFloat(expAmt.toFixed(2)));
  }
  return { inc, exp };
}

function renderIncomeExpenseChart(period = '6m') {
  const months = period === '1y' ? 12 : 6;
  const labels = buildMonthLabels(months);
  const { inc, exp } = getMonthlyData(months);
  const c = getChartColors();
  const ctx = $('#incomeExpenseChart');
  if (!ctx) return;

  if (incomeExpenseChartInst) incomeExpenseChartInst.destroy();

  incomeExpenseChartInst = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Revenue',
          data: inc,
          backgroundColor: 'rgba(63,185,80,0.7)',
          borderColor: '#3fb950',
          borderWidth: 1.5,
          borderRadius: 4,
        },
        {
          label: 'Expenses',
          data: exp,
          backgroundColor: 'rgba(248,81,73,0.55)',
          borderColor: '#f85149',
          borderWidth: 1.5,
          borderRadius: 4,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: c.text, font: { family: 'DM Sans', size: 12 }, boxWidth: 12 } },
        tooltip: { backgroundColor: '#1c2333', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 }
      },
      scales: {
        x: { ticks: { color: c.text, font: { size: 11 } }, grid: { color: c.grid } },
        y: { ticks: { color: c.text, font: { size: 11 }, callback: v => '$' + v }, grid: { color: c.grid } }
      }
    }
  });
}

function renderExpensePieChart() {
  const expenses = store.get('expenses');
  const catMap = {};
  expenses.forEach(e => {
    const cat = e.category || 'Other';
    catMap[cat] = (catMap[cat] || 0) + parseFloat(e.amount || 0);
  });
  const labels = Object.keys(catMap);
  const data   = Object.values(catMap).map(v => parseFloat(v.toFixed(2)));
  const ctx = $('#expensePieChart');
  if (!ctx) return;

  const COLORS = ['#3fb950','#58a6ff','#f85149','#e3b341','#bc8cff','#79c0ff','#56d364'];
  if (expensePieChartInst) expensePieChartInst.destroy();

  expensePieChartInst = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels.length ? labels : ['No data'],
      datasets: [{
        data: data.length ? data : [1],
        backgroundColor: COLORS.slice(0, Math.max(labels.length, 1)),
        borderColor: document.documentElement.dataset.theme === 'dark' ? '#161b22' : '#ffffff',
        borderWidth: 2,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: getChartColors().text, font: { family: 'DM Sans', size: 11 }, boxWidth: 10, padding: 12 }
        },
        tooltip: { backgroundColor: '#1c2333', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 }
      }
    }
  });
}

// Period buttons
document.addEventListener('click', e => {
  const btn = e.target.closest('.period-btn');
  if (!btn) return;
  $$('.period-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderIncomeExpenseChart(btn.dataset.period);
});

// ── Dashboard Stats ────────────────────────────────────────
function refreshDashboard() {
  const expenses = store.get('expenses');
  const revenues = store.get('revenues');
  const invoices = store.get('invoices');
  const debts    = store.get('debts');

  const totalRev = revenues.reduce((s, r) => s + parseFloat(r.amount || 0), 0);
  const totalExp = expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
  const netProfit = totalRev - totalExp;
  const pendingInv = invoices.filter(i => i.status === 'Sent' || i.status === 'Overdue').length;

  $('#statRevenue').textContent = fmt(totalRev);
  $('#statExpenses').textContent = fmt(totalExp);
  $('#statProfit').textContent = fmt(netProfit);
  $('#statProfit').style.color = netProfit >= 0 ? 'var(--accent)' : 'var(--red)';
  $('#statPendingInv').textContent = pendingInv;

  // Recent activity
  const activities = [
    ...expenses.map(e => ({ type: 'expense', date: e.date, desc: e.description, amount: -parseFloat(e.amount), cat: e.category })),
    ...revenues.map(r => ({ type: 'revenue', date: r.date, desc: r.description, amount: parseFloat(r.amount) })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);

  const actList = $('#recentActivity');
  if (activities.length === 0) {
    actList.innerHTML = '<li class="activity-empty">No activity yet. Start by adding an expense or invoice.</li>';
  } else {
    actList.innerHTML = activities.map(a => `
      <li class="activity-item">
        <div>
          <div class="activity-desc">${escHtml(a.desc)}</div>
          <div class="activity-meta">${a.type === 'expense' ? (a.cat || 'Expense') : 'Revenue'} · ${formatDate(a.date)}</div>
        </div>
        <span class="activity-amount" style="color:${a.amount >= 0 ? 'var(--accent)' : 'var(--red)'}">
          ${a.amount >= 0 ? '+' : ''}${fmt(a.amount)}
        </span>
      </li>
    `).join('');
  }

  // Upcoming dues
  const dueItems = debts
    .filter(d => d.status !== 'Settled')
    .sort((a, b) => new Date(a.due) - new Date(b.due))
    .slice(0, 5);
  const dueList = $('#upcomingDues');
  if (dueItems.length === 0) {
    dueList.innerHTML = '<li class="activity-empty">No upcoming dues.</li>';
  } else {
    dueList.innerHTML = dueItems.map(d => `
      <li class="activity-item">
        <div>
          <div class="activity-desc">${escHtml(d.person)}</div>
          <div class="activity-meta">Due: ${formatDate(d.due)} · ${d.type === 'owed-to-me' ? 'Owes you' : 'You owe'}</div>
        </div>
        <span class="activity-amount" style="color:${d.type === 'owed-to-me' ? 'var(--accent)' : 'var(--red)'}">
          ${fmt(d.amount)}
        </span>
      </li>
    `).join('');
  }

  // Charts
  setTimeout(() => {
    renderIncomeExpenseChart($('.period-btn.active')?.dataset.period || '6m');
    renderExpensePieChart();
  }, 50);
}

// ── Profit Page ────────────────────────────────────────────
let profitChartInst = null;

function refreshProfitPage() {
  const revenues = store.get('revenues');
  const expenses = store.get('expenses');
  const totalRev = revenues.reduce((s, r) => s + parseFloat(r.amount || 0), 0);
  const totalExp = expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
  const net = totalRev - totalExp;
  const margin = totalRev > 0 ? ((net / totalRev) * 100).toFixed(1) : 0;

  $('#profRevenue').textContent = fmt(totalRev);
  $('#profExpenses').textContent = fmt(totalExp);
  $('#profNet').textContent = fmt(net);
  $('#profNet').style.color = net >= 0 ? 'var(--accent)' : 'var(--red)';
  $('#profMargin').textContent = margin + '%';

  // Revenue table
  const tbody = $('#revenueTableBody');
  if (revenues.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty-row">No revenue entries yet.</td></tr>';
  } else {
    tbody.innerHTML = [...revenues].reverse().map(r => `
      <tr>
        <td>${formatDate(r.date)}</td>
        <td>${escHtml(r.description)}</td>
        <td style="font-family:var(--font-mono);color:var(--accent)">${fmt(r.amount)}</td>
        <td class="action-btns">
          <button class="btn btn-sm btn-danger" onclick="deleteRevenue('${r.id}')">Delete</button>
        </td>
      </tr>
    `).join('');
  }

  // Annual summary
  const annualDiv = $('#annualSummaryTable');
  const monthData = {};
  const process = (arr, key) => arr.forEach(item => {
    const d = new Date(item.date);
    const ym = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    if (!monthData[ym]) monthData[ym] = { rev: 0, exp: 0 };
    monthData[ym][key] += parseFloat(item.amount || 0);
  });
  process(revenues, 'rev');
  process(expenses, 'exp');

  const rows = Object.entries(monthData).sort(([a],[b]) => b.localeCompare(a)).slice(0, 12);
  if (rows.length === 0) {
    annualDiv.innerHTML = '<p style="color:var(--text-muted);padding:1rem;font-size:.85rem">No data yet.</p>';
  } else {
    annualDiv.innerHTML = `<table class="annual-table">
      <thead><tr><th>Month</th><th>Revenue</th><th>Expenses</th><th>Net Profit</th><th>Margin</th></tr></thead>
      <tbody>${rows.map(([ym, v]) => {
        const net = v.rev - v.exp;
        const mg = v.rev > 0 ? ((net / v.rev) * 100).toFixed(1) : '0.0';
        return `<tr>
          <td>${ym}</td>
          <td style="color:var(--accent)">${fmt(v.rev)}</td>
          <td style="color:var(--red)">${fmt(v.exp)}</td>
          <td style="color:${net>=0?'var(--accent)':'var(--red)'}">${fmt(net)}</td>
          <td>${mg}%</td>
        </tr>`;
      }).join('')}</tbody>
    </table>`;
  }

  // Profit trend chart
  const ctx = $('#profitTrendChart');
  if (!ctx) return;
  const labels = buildMonthLabels(6);
  const { inc, exp: expData } = getMonthlyData(6);
  const profitData = inc.map((v, i) => parseFloat((v - expData[i]).toFixed(2)));
  const c = getChartColors();

  if (profitChartInst) profitChartInst.destroy();
  profitChartInst = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Net Profit',
        data: profitData,
        borderColor: '#58a6ff',
        backgroundColor: 'rgba(88,166,255,0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#58a6ff',
        pointRadius: 4,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: c.text, font: { family: 'DM Sans', size: 12 }, boxWidth: 10 } },
        tooltip: { backgroundColor: '#1c2333', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 }
      },
      scales: {
        x: { ticks: { color: c.text, font: { size: 11 } }, grid: { color: c.grid } },
        y: { ticks: { color: c.text, font: { size: 11 }, callback: v => '$' + v }, grid: { color: c.grid } }
      }
    }
  });
}

// Revenue form
$('#revenueForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const revenues = store.get('revenues');
  revenues.push({
    id: uid(),
    description: $('#revDesc').value.trim(),
    amount: parseFloat($('#revAmount').value),
    date: $('#revDate').value,
  });
  store.set('revenues', revenues);
  e.target.reset();
  $('#revDate').value = today();
  refreshProfitPage();
  showToast('Revenue entry added!');
});

window.deleteRevenue = (id) => {
  if (!confirmAction('Delete this revenue entry?')) return;
  store.set('revenues', store.get('revenues').filter(r => r.id !== id));
  refreshProfitPage();
  showToast('Revenue deleted.', 'info');
};

// ── Pricing Toggle ─────────────────────────────────────────
$('#billingToggle').addEventListener('change', function () {
  const annual = this.checked;
  $$('.pricing-card').forEach(card => {
    const priceEl = card.querySelector('.plan-price');
    if (!priceEl) return;
    const num = annual ? priceEl.dataset.annual : priceEl.dataset.monthly;
    priceEl.querySelector('.price-num').textContent = '$' + num;
  });
});

// ── Reports Init ───────────────────────────────────────────
function initReportSelectors() {
  const monthSel = $('#reportMonth');
  const yearSel  = $('#reportYear');
  const months   = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  months.forEach((m, i) => {
    const opt = document.createElement('option');
    opt.value = i + 1;
    opt.textContent = m;
    monthSel.appendChild(opt);
  });
  const curY = new Date().getFullYear();
  for (let y = curY; y >= curY - 5; y--) {
    const opt = document.createElement('option');
    opt.value = y; opt.textContent = y;
    yearSel.appendChild(opt);
  }
  monthSel.value = new Date().getMonth() + 1;
  yearSel.value = curY;
}

// ── Global Search ──────────────────────────────────────────
$('#globalSearch').addEventListener('input', function () {
  const q = this.value.trim().toLowerCase();
  if (!q) return;
  // Simple: navigate to relevant page
  if (['expense','spend','cost'].some(w => q.includes(w))) navigateTo('expenses');
  else if (['invoice','bill','client payment'].some(w => q.includes(w))) navigateTo('invoices');
  else if (['debt','owe','owed'].some(w => q.includes(w))) navigateTo('debts');
  else if (['profit','revenue','income'].some(w => q.includes(w))) navigateTo('profit');
  else if (['report'].some(w => q.includes(w))) navigateTo('reports');
  else if (['client','contact'].some(w => q.includes(w))) navigateTo('clients');
});

// ── Helpers ────────────────────────────────────────────────
function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function formatDate(d) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Expose globals
window.fmt = fmt;
window.uid = uid;
window.store = store;
window.showToast = showToast;
window.openModal = openModal;
window.closeModal = closeModal;
window.confirmAction = confirmAction;
window.escHtml = escHtml;
window.formatDate = formatDate;
window.today = today;
window.refreshDashboard = refreshDashboard;

// ── Init ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Set default dates
  const dateInputs = $$('input[type="date"]');
  dateInputs.forEach(i => { if (!i.value) i.value = today(); });

  initReportSelectors();
  refreshDashboard();
});
