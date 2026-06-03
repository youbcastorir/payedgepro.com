/* ============================================================
   PayEdgePro — expenses.js
   Expense management: add, edit, delete, filter, monthly summary
   ============================================================ */

const Expenses = (() => {
  'use strict';

  function getAll()    { return store.get('expenses'); }
  function saveAll(a)  { store.set('expenses', a); }

  // ── Open Modal ──────────────────────────────────────────
  function openModal(exp = null) {
    const form = document.getElementById('expenseForm');
    form.reset();
    document.getElementById('expenseEditId').value = '';
    document.getElementById('expDate').value = today();

    if (exp) {
      document.getElementById('expenseModalTitle').textContent = 'Edit Expense';
      document.getElementById('expenseEditId').value = exp.id;
      document.getElementById('expDesc').value     = exp.description;
      document.getElementById('expAmount').value   = exp.amount;
      document.getElementById('expCategory').value = exp.category;
      document.getElementById('expDate').value     = exp.date;
    } else {
      document.getElementById('expenseModalTitle').textContent = 'Add Expense';
    }
    openModal('expenseModal');
  }

  // ── Form Submit ─────────────────────────────────────────
  function handleSubmit(e) {
    e.preventDefault();
    const id   = document.getElementById('expenseEditId').value;
    const data = {
      id:          id || uid(),
      description: document.getElementById('expDesc').value.trim(),
      amount:      parseFloat(document.getElementById('expAmount').value),
      category:    document.getElementById('expCategory').value,
      date:        document.getElementById('expDate').value,
    };
    const all = getAll();
    if (id) {
      const idx = all.findIndex(x => x.id === id);
      if (idx > -1) all[idx] = data;
    } else {
      all.push(data);
    }
    saveAll(all);
    closeModal('expenseModal');
    render();
    refreshDashboard();
    showToast(id ? 'Expense updated!' : 'Expense added!');
  }

  // ── Delete ──────────────────────────────────────────────
  function deleteExpense(id) {
    if (!confirmAction('Delete this expense?')) return;
    saveAll(getAll().filter(e => e.id !== id));
    render();
    refreshDashboard();
    showToast('Expense deleted.', 'info');
  }

  // ── Monthly Summary ─────────────────────────────────────
  function renderMonthlySummary(expenses) {
    const monthFilter = document.getElementById('expenseMonthFilter').value;
    let subset = expenses;
    if (monthFilter) {
      subset = expenses.filter(e => e.date && e.date.startsWith(monthFilter));
    }

    // Group by month
    const monthMap = {};
    expenses.forEach(e => {
      const m = e.date ? e.date.slice(0, 7) : 'Unknown';
      monthMap[m] = (monthMap[m] || 0) + parseFloat(e.amount || 0);
    });

    const sorted = Object.entries(monthMap).sort(([a], [b]) => b.localeCompare(a)).slice(0, 4);
    const bar = document.getElementById('expenseMonthlySummary');
    if (sorted.length === 0) { bar.innerHTML = ''; return; }

    bar.innerHTML = sorted.map(([m, v]) => `
      <div class="monthly-summary-item">
        <span>${m}</span>
        <strong>${fmt(v)}</strong>
      </div>
    `).join('') + `<div class="monthly-summary-item">
      <span>Showing ${subset.length} of ${expenses.length}</span>
      <strong style="color:var(--text-muted)">${fmt(subset.reduce((s,e) => s + parseFloat(e.amount||0), 0))}</strong>
    </div>`;
  }

  // ── Render Table ────────────────────────────────────────
  function render() {
    const all = getAll();
    const q   = (document.getElementById('expenseSearch').value || '').toLowerCase();
    const cat = document.getElementById('expenseCatFilter').value;
    const mon = document.getElementById('expenseMonthFilter').value;

    let filtered = all.filter(e => {
      const matchQ   = !q   || e.description.toLowerCase().includes(q) || (e.category||'').toLowerCase().includes(q);
      const matchCat = !cat || e.category === cat;
      const matchMon = !mon || (e.date && e.date.startsWith(mon));
      return matchQ && matchCat && matchMon;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));

    renderMonthlySummary(all);

    const tbody = document.getElementById('expenseTableBody');
    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-row">No expenses found.</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map(e => `
      <tr>
        <td style="font-family:var(--font-mono);font-size:0.82rem">${formatDate(e.date)}</td>
        <td>${escHtml(e.description)}</td>
        <td><span class="badge badge-draft">${escHtml(e.category || 'Other')}</span></td>
        <td style="font-family:var(--font-mono);color:var(--red)">${fmt(e.amount)}</td>
        <td class="action-btns">
          <button class="btn btn-sm btn-outline" onclick="Expenses.edit('${e.id}')">Edit</button>
          <button class="btn btn-sm btn-danger"  onclick="Expenses.del('${e.id}')">Delete</button>
        </td>
      </tr>
    `).join('');
  }

  function edit(id) {
    const exp = getAll().find(e => e.id === id);
    if (exp) openModal(exp);
  }

  // ── Event Wires ─────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('addExpenseBtn').addEventListener('click', () => openModal());
    document.getElementById('expenseForm').addEventListener('submit', handleSubmit);

    ['expenseSearch', 'expenseCatFilter', 'expenseMonthFilter'].forEach(id => {
      document.getElementById(id).addEventListener('input', render);
      document.getElementById(id).addEventListener('change', render);
    });
  });

  return {
    render,
    openModal: () => openModal(),
    edit,
    del: deleteExpense,
    getAll,
  };
})();

window.Expenses = Expenses;
