/* ============================================================
   PayEdgePro — debts.js
   Debt tracker + Client management
   ============================================================ */

// ─────────────────────────────────────────────────────────────
// DEBT TRACKER
// ─────────────────────────────────────────────────────────────
const Debts = (() => {
  'use strict';

  let activeType = 'owed-to-me';

  function getAll()   { return store.get('debts'); }
  function saveAll(a) { store.set('debts', a); }

  function openModal(debt = null) {
    const form = document.getElementById('debtForm');
    form.reset();
    document.getElementById('debtEditId').value = '';
    document.getElementById('debtType').value   = activeType;
    document.getElementById('debtDue').value    = today();

    if (debt) {
      document.getElementById('debtModalTitle').textContent = 'Edit Entry';
      document.getElementById('debtEditId').value    = debt.id;
      document.getElementById('debtPerson').value    = debt.person;
      document.getElementById('debtAmount').value    = debt.amount;
      document.getElementById('debtDue').value       = debt.due;
      document.getElementById('debtNotes').value     = debt.notes || '';
      document.getElementById('debtType').value      = debt.type;
    } else {
      document.getElementById('debtModalTitle').textContent = activeType === 'owed-to-me' ? 'Add: Owed to Me' : 'Add: I Owe';
    }
    window.openModal('debtModal');
  }

  function handleSubmit(e) {
    e.preventDefault();
    const id   = document.getElementById('debtEditId').value;
    const data = {
      id:     id || uid(),
      type:   document.getElementById('debtType').value,
      person: document.getElementById('debtPerson').value.trim(),
      amount: parseFloat(document.getElementById('debtAmount').value),
      due:    document.getElementById('debtDue').value,
      notes:  document.getElementById('debtNotes').value.trim(),
      status: id ? (getAll().find(d => d.id === id)?.status || 'Active') : 'Active',
    };
    const all = getAll();
    if (id) {
      const idx = all.findIndex(x => x.id === id);
      if (idx > -1) all[idx] = data;
    } else {
      all.push(data);
    }
    saveAll(all);
    window.closeModal('debtModal');
    render();
    refreshDashboard();
    showToast(id ? 'Entry updated!' : 'Entry added!');
  }

  function deleteDebt(id) {
    if (!confirmAction('Delete this entry?')) return;
    saveAll(getAll().filter(d => d.id !== id));
    render();
    refreshDashboard();
    showToast('Entry deleted.', 'info');
  }

  function toggleSettle(id) {
    const all = getAll();
    const idx = all.findIndex(d => d.id === id);
    if (idx > -1) {
      all[idx].status = all[idx].status === 'Settled' ? 'Active' : 'Settled';
      saveAll(all);
    }
    render();
    showToast('Status updated.', 'info');
  }

  function render() {
    const all = getAll().filter(d => d.type === activeType);
    const tbody = document.getElementById('debtTableBody');

    // Summary
    const allDebts = getAll();
    const owedToMe = allDebts.filter(d => d.type === 'owed-to-me' && d.status !== 'Settled').reduce((s,d) => s + parseFloat(d.amount||0), 0);
    const iOwe     = allDebts.filter(d => d.type === 'i-owe'     && d.status !== 'Settled').reduce((s,d) => s + parseFloat(d.amount||0), 0);
    document.getElementById('totalOwedToMe').textContent  = fmt(owedToMe);
    document.getElementById('totalIOwe').textContent      = fmt(iOwe);
    const net = owedToMe - iOwe;
    const netEl = document.getElementById('debtNetPosition');
    netEl.textContent  = (net >= 0 ? '+' : '') + fmt(net);
    netEl.style.color  = net >= 0 ? 'var(--accent)' : 'var(--red)';

    if (all.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-row">No ${activeType === 'owed-to-me' ? '"owed to me"' : '"I owe"'} entries yet.</td></tr>`;
      return;
    }

    const sorted = [...all].sort((a, b) => new Date(a.due) - new Date(b.due));
    tbody.innerHTML = sorted.map(d => {
      const overdue = d.status !== 'Settled' && new Date(d.due) < new Date();
      return `
        <tr style="${d.status === 'Settled' ? 'opacity:0.5;text-decoration:line-through' : ''}">
          <td style="font-weight:600">${escHtml(d.person)}</td>
          <td style="font-family:var(--font-mono);color:${activeType==='owed-to-me'?'var(--accent)':'var(--red)'}">${fmt(d.amount)}</td>
          <td style="color:${overdue ? 'var(--red)' : 'inherit'}">${formatDate(d.due)} ${overdue ? '⚠' : ''}</td>
          <td style="color:var(--text-muted);font-size:0.82rem">${escHtml(d.notes || '—')}</td>
          <td><span class="badge ${d.status === 'Settled' ? 'badge-paid' : 'badge-pending'}">${d.status}</span></td>
          <td class="action-btns">
            <button class="btn btn-sm btn-outline" onclick="Debts.settle('${d.id}')">${d.status === 'Settled' ? 'Reopen' : 'Settle'}</button>
            <button class="btn btn-sm btn-outline" onclick="Debts.edit('${d.id}')">Edit</button>
            <button class="btn btn-sm btn-danger"  onclick="Debts.del('${d.id}')">Del</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  function edit(id) {
    const debt = getAll().find(d => d.id === id);
    if (debt) openModal(debt);
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('addDebtBtn').addEventListener('click', () => openModal());
    document.getElementById('debtForm').addEventListener('submit', handleSubmit);

    document.querySelectorAll('.debt-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.debt-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeType = btn.dataset.type;
        render();
      });
    });
  });

  return {
    render,
    openModal: () => openModal(),
    edit,
    del: deleteDebt,
    settle: toggleSettle,
  };
})();

window.Debts = Debts;


// ─────────────────────────────────────────────────────────────
// CLIENT MANAGEMENT
// ─────────────────────────────────────────────────────────────
const Clients = (() => {
  'use strict';

  function getAll()   { return store.get('clients'); }
  function saveAll(a) { store.set('clients', a); }

  function openModal(client = null) {
    const form = document.getElementById('clientForm');
    form.reset();
    document.getElementById('clientEditId').value = '';

    if (client) {
      document.getElementById('clientModalTitle').textContent = 'Edit Client';
      document.getElementById('clientEditId').value   = client.id;
      document.getElementById('clientName').value     = client.name;
      document.getElementById('clientEmail').value    = client.email || '';
      document.getElementById('clientPhone').value    = client.phone || '';
      document.getElementById('clientCompany').value  = client.company || '';
      document.getElementById('clientAddress').value  = client.address || '';
    } else {
      document.getElementById('clientModalTitle').textContent = 'Add Client';
    }
    window.openModal('clientModal');
  }

  function handleSubmit(e) {
    e.preventDefault();
    const id   = document.getElementById('clientEditId').value;
    const data = {
      id:      id || uid(),
      name:    document.getElementById('clientName').value.trim(),
      email:   document.getElementById('clientEmail').value.trim(),
      phone:   document.getElementById('clientPhone').value.trim(),
      company: document.getElementById('clientCompany').value.trim(),
      address: document.getElementById('clientAddress').value.trim(),
      created: id ? (getAll().find(c => c.id === id)?.created || today()) : today(),
    };
    const all = getAll();
    if (id) {
      const idx = all.findIndex(x => x.id === id);
      if (idx > -1) all[idx] = data;
    } else {
      all.push(data);
    }
    saveAll(all);
    window.closeModal('clientModal');
    render();
    showToast(id ? 'Client updated!' : 'Client added!');
  }

  function deleteClient(id) {
    if (!confirmAction('Delete this client?')) return;
    saveAll(getAll().filter(c => c.id !== id));
    render();
    showToast('Client deleted.', 'info');
  }

  function getClientInvoiceStats(clientName) {
    const invoices = store.get('invoices').filter(i => i.client === clientName);
    const total = invoices.reduce((s, i) => s + parseFloat(i.total || 0), 0);
    const paid  = invoices.filter(i => i.status === 'Paid').length;
    return { count: invoices.length, total, paid };
  }

  function initials(name) {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  function render() {
    const all = getAll();
    const q   = (document.getElementById('clientSearch').value || '').toLowerCase();
    const filtered = q
      ? all.filter(c => c.name.toLowerCase().includes(q) || (c.company||'').toLowerCase().includes(q) || (c.email||'').toLowerCase().includes(q))
      : all;

    const grid = document.getElementById('clientsGrid');
    if (filtered.length === 0) {
      grid.innerHTML = q
        ? '<div class="empty-card">No clients match your search.</div>'
        : '<div class="empty-card">No clients yet. Click "+ Add Client" to get started.</div>';
      return;
    }

    grid.innerHTML = filtered.map(c => {
      const stats = getClientInvoiceStats(c.name);
      return `
        <div class="client-card">
          <div style="display:flex;align-items:center;gap:0.75rem">
            <div class="client-avatar">${initials(c.name)}</div>
            <div>
              <div class="client-name">${escHtml(c.name)}</div>
              ${c.company ? `<div class="client-company">${escHtml(c.company)}</div>` : ''}
            </div>
          </div>
          <div class="client-meta">
            ${c.email ? `<span>✉ ${escHtml(c.email)}</span>` : ''}
            ${c.phone ? `<span>☎ ${escHtml(c.phone)}</span>` : ''}
            ${c.address ? `<span>⌖ ${escHtml(c.address.split('\n')[0])}</span>` : ''}
          </div>
          <div style="display:flex;gap:1rem;font-size:0.78rem;color:var(--text-muted);border-top:1px solid var(--border);padding-top:0.65rem">
            <span>${stats.count} invoice${stats.count !== 1 ? 's' : ''}</span>
            <span style="color:var(--accent)">${fmt(stats.total)} total</span>
            <span>${stats.paid} paid</span>
          </div>
          <div class="client-actions">
            <button class="btn btn-sm btn-outline" onclick="Clients.edit('${c.id}')">Edit</button>
            <button class="btn btn-sm btn-danger"  onclick="Clients.del('${c.id}')">Delete</button>
          </div>
        </div>
      `;
    }).join('');
  }

  function edit(id) {
    const c = getAll().find(c => c.id === id);
    if (c) openModal(c);
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('addClientBtn').addEventListener('click', () => openModal());
    document.getElementById('clientForm').addEventListener('submit', handleSubmit);
    document.getElementById('clientSearch').addEventListener('input', render);
  });

  return {
    render,
    openModal: () => openModal(),
    edit,
    del: deleteClient,
    getAll,
  };
})();

window.Clients = Clients;
