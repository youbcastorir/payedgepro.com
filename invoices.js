/* ============================================================
   PayEdgePro — invoices.js
   Invoice management: create, edit, PDF download, status
   ============================================================ */

const Invoices = (() => {
  'use strict';

  let itemCount = 0;

  function getAll()   { return store.get('invoices'); }
  function saveAll(a) { store.set('invoices', a); }

  // ── Line Items ──────────────────────────────────────────
  function addLineItem(desc = '', qty = 1, rate = 0) {
    itemCount++;
    const id = 'item_' + itemCount;
    const li = document.createElement('div');
    li.className = 'invoice-line-item';
    li.id = id;
    li.innerHTML = `
      <input type="text"   class="inv-desc" placeholder="Description" value="${escHtml(desc)}" />
      <input type="number" class="inv-qty"  placeholder="Qty"  value="${qty}"  min="0" step="any" />
      <input type="number" class="inv-rate" placeholder="Rate" value="${rate}" min="0" step="0.01" />
      <span class="item-total">${fmt(qty * rate)}</span>
      <button type="button" class="remove-item-btn" onclick="Invoices.removeItem('${id}')">✕</button>
    `;
    li.querySelectorAll('input').forEach(inp => inp.addEventListener('input', recalcTotals));
    document.getElementById('invoiceItemsList').appendChild(li);
    recalcTotals();
  }

  function removeItem(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
    recalcTotals();
  }

  function recalcTotals() {
    let subtotal = 0;
    document.querySelectorAll('.invoice-line-item').forEach(li => {
      const qty  = parseFloat(li.querySelector('.inv-qty')?.value  || 0);
      const rate = parseFloat(li.querySelector('.inv-rate')?.value || 0);
      const tot  = qty * rate;
      li.querySelector('.item-total').textContent = fmt(tot);
      subtotal += tot;
    });
    const tax   = parseFloat(document.getElementById('invTax').value || 0);
    const total = subtotal * (1 + tax / 100);
    document.getElementById('invSubtotal').textContent = fmt(subtotal);
    document.getElementById('invTotal').textContent    = fmt(total);
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('invTax').addEventListener('input', recalcTotals);
    document.getElementById('addInvItemBtn').addEventListener('click', () => addLineItem());
  });

  // ── Open Modal ──────────────────────────────────────────
  function openModal(inv = null) {
    const form = document.getElementById('invoiceForm');
    form.reset();
    document.getElementById('invoiceEditId').value = '';
    document.getElementById('invoiceItemsList').innerHTML = '';
    itemCount = 0;
    document.getElementById('invDate').value    = today();
    document.getElementById('invDueDate').value = new Date(Date.now() + 30*86400000).toISOString().split('T')[0];

    if (inv) {
      document.getElementById('invoiceModalTitle').textContent = 'Edit Invoice';
      document.getElementById('invoiceEditId').value    = inv.id;
      document.getElementById('invClient').value        = inv.client;
      document.getElementById('invClientEmail').value   = inv.clientEmail || '';
      document.getElementById('invDate').value          = inv.date;
      document.getElementById('invDueDate').value       = inv.dueDate;
      document.getElementById('invStatus').value        = inv.status;
      document.getElementById('invCurrency').value      = inv.currency || 'USD';
      document.getElementById('invNotes').value         = inv.notes || '';
      document.getElementById('invTax').value           = inv.tax || 0;
      (inv.items || []).forEach(it => addLineItem(it.desc, it.qty, it.rate));
    } else {
      document.getElementById('invoiceModalTitle').textContent = 'New Invoice';
      addLineItem();
    }
    recalcTotals();
    window.openModal('invoiceModal');
  }

  // ── Get next invoice number ─────────────────────────────
  function nextInvNumber() {
    const all = getAll();
    const nums = all.map(i => parseInt(i.number || 0)).filter(Boolean);
    return (nums.length ? Math.max(...nums) + 1 : 1001).toString();
  }

  // ── Form Submit ─────────────────────────────────────────
  function handleSubmit(e) {
    e.preventDefault();
    const id  = document.getElementById('invoiceEditId').value;
    const items = [...document.querySelectorAll('.invoice-line-item')].map(li => ({
      desc: li.querySelector('.inv-desc').value,
      qty:  parseFloat(li.querySelector('.inv-qty').value  || 0),
      rate: parseFloat(li.querySelector('.inv-rate').value || 0),
    }));
    const subtotal = items.reduce((s, it) => s + it.qty * it.rate, 0);
    const tax   = parseFloat(document.getElementById('invTax').value || 0);
    const total = subtotal * (1 + tax / 100);

    const data = {
      id:          id || uid(),
      number:      id ? getAll().find(i => i.id === id)?.number : nextInvNumber(),
      client:      document.getElementById('invClient').value.trim(),
      clientEmail: document.getElementById('invClientEmail').value.trim(),
      date:        document.getElementById('invDate').value,
      dueDate:     document.getElementById('invDueDate').value,
      status:      document.getElementById('invStatus').value,
      currency:    document.getElementById('invCurrency').value,
      notes:       document.getElementById('invNotes').value.trim(),
      tax,
      items,
      subtotal,
      total,
    };

    const all = getAll();
    if (id) {
      const idx = all.findIndex(x => x.id === id);
      if (idx > -1) all[idx] = data;
    } else {
      all.push(data);
    }
    saveAll(all);
    window.closeModal('invoiceModal');
    render();
    refreshDashboard();
    showToast(id ? 'Invoice updated!' : 'Invoice created!');
  }

  // ── Delete ──────────────────────────────────────────────
  function deleteInvoice(id) {
    if (!confirmAction('Delete this invoice?')) return;
    saveAll(getAll().filter(i => i.id !== id));
    render();
    refreshDashboard();
    showToast('Invoice deleted.', 'info');
  }

  // ── Status Change ───────────────────────────────────────
  function changeStatus(id, status) {
    const all = getAll();
    const idx = all.findIndex(i => i.id === id);
    if (idx > -1) { all[idx].status = status; saveAll(all); }
    render();
    showToast('Status updated to ' + status + '.', 'info');
  }

  // ── PDF Download ────────────────────────────────────────
  function downloadPdf(id) {
    const inv = getAll().find(i => i.id === id);
    if (!inv) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });

    // Brand header
    doc.setFillColor(13, 17, 23);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(63, 185, 80);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('PayEdgePro', 15, 18);
    doc.setTextColor(200, 210, 220);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('payedgepro.com  |  salatrir@gmail.com', 15, 28);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE #' + inv.number, 130, 18);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Date: ' + (inv.date || ''), 130, 27);
    doc.text('Due:  ' + (inv.dueDate || ''), 130, 33);

    // Client info
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Bill To:', 15, 55);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(inv.client || '', 15, 63);
    if (inv.clientEmail) doc.text(inv.clientEmail, 15, 70);

    // Status badge
    const statusColors = { Paid: [63,185,80], Sent: [88,166,255], Draft: [140,148,160], Overdue: [248,81,73] };
    const sc = statusColors[inv.status] || [140,148,160];
    doc.setFillColor(...sc);
    doc.roundedRect(150, 50, 40, 10, 2, 2, 'F');
    doc.setTextColor(255,255,255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(inv.status.toUpperCase(), 157, 57);

    // Table header
    let y = 85;
    doc.setFillColor(240, 242, 245);
    doc.rect(10, y, 190, 9, 'F');
    doc.setTextColor(80, 90, 100);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Description', 14, y + 6.5);
    doc.text('Qty', 110, y + 6.5);
    doc.text('Rate', 135, y + 6.5);
    doc.text('Total', 165, y + 6.5);

    // Items
    y += 12;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 40);
    (inv.items || []).forEach((it, idx) => {
      if (idx % 2 === 0) { doc.setFillColor(250,251,252); doc.rect(10, y-5, 190, 8.5, 'F'); }
      doc.setFontSize(9);
      doc.text(it.desc || '', 14, y + 1);
      doc.text(String(it.qty), 110, y + 1);
      doc.text(fmt(it.rate), 132, y + 1);
      doc.text(fmt(it.qty * it.rate), 163, y + 1);
      y += 10;
    });

    // Totals
    y += 5;
    doc.setDrawColor(220, 220, 220);
    doc.line(110, y, 200, y);
    y += 7;
    doc.setFontSize(9);
    doc.setTextColor(80, 90, 100);
    doc.text('Subtotal:', 140, y); doc.text(fmt(inv.subtotal), 175, y); y += 7;
    if (inv.tax > 0) { doc.text(`Tax (${inv.tax}%):`, 140, y); doc.text(fmt(inv.subtotal * inv.tax / 100), 175, y); y += 7; }
    doc.setFillColor(13, 17, 23);
    doc.rect(110, y-1, 90, 11, 'F');
    doc.setTextColor(255,255,255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL:', 117, y + 7);
    doc.setTextColor(63,185,80);
    doc.text(fmt(inv.total), 155, y + 7);

    // Notes
    if (inv.notes) {
      y += 22;
      doc.setTextColor(80,90,100);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Notes:', 14, y);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(inv.notes, 180);
      doc.text(lines, 14, y + 7);
    }

    // Footer
    doc.setFillColor(240, 242, 245);
    doc.rect(0, 280, 210, 18, 'F');
    doc.setTextColor(120, 130, 140);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Thank you for your business! | payedgepro.com | salatrir@gmail.com', 105, 291, { align: 'center' });

    doc.save(`invoice_${inv.number}_${inv.client.replace(/\s+/g,'_')}.pdf`);
    showToast('PDF downloaded!');
  }

  // ── Render ──────────────────────────────────────────────
  function render() {
    const all = getAll();
    const q   = (document.getElementById('invoiceSearch').value || '').toLowerCase();
    const st  = document.getElementById('invoiceStatusFilter').value;

    let filtered = all.filter(i => {
      const matchQ = !q || i.client.toLowerCase().includes(q) || (i.number||'').toString().includes(q);
      const matchS = !st || i.status === st;
      return matchQ && matchS;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));

    const tbody = document.getElementById('invoiceTableBody');
    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-row">No invoices found.</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map(i => `
      <tr>
        <td style="font-family:var(--font-mono);color:var(--text-muted)">#${i.number}</td>
        <td>
          <div style="font-weight:600">${escHtml(i.client)}</div>
          ${i.clientEmail ? `<div style="font-size:0.75rem;color:var(--text-muted)">${escHtml(i.clientEmail)}</div>` : ''}
        </td>
        <td style="font-size:0.82rem">${formatDate(i.date)}</td>
        <td style="font-size:0.82rem;color:${isOverdue(i)?'var(--red)':'inherit'}">${formatDate(i.dueDate)}</td>
        <td style="font-family:var(--font-mono);color:var(--accent)">${fmt(i.total)}</td>
        <td>
          <select class="badge-select" onchange="Invoices.changeStatus('${i.id}', this.value)">
            ${['Draft','Sent','Paid','Overdue'].map(s => `<option ${s===i.status?'selected':''}>${s}</option>`).join('')}
          </select>
        </td>
        <td class="action-btns">
          <button class="btn btn-sm btn-outline" onclick="Invoices.edit('${i.id}')">Edit</button>
          <button class="btn btn-sm btn-outline" onclick="Invoices.pdf('${i.id}')" title="Download PDF">PDF</button>
          <button class="btn btn-sm btn-danger"  onclick="Invoices.del('${i.id}')">Del</button>
        </td>
      </tr>
    `).join('');
  }

  function isOverdue(inv) {
    return inv.status !== 'Paid' && inv.dueDate && new Date(inv.dueDate) < new Date();
  }

  function edit(id) {
    const inv = getAll().find(i => i.id === id);
    if (inv) openModal(inv);
  }

  // ── Event Wires ─────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('addInvoiceBtn').addEventListener('click', () => openModal());
    document.getElementById('invoiceForm').addEventListener('submit', handleSubmit);

    ['invoiceSearch', 'invoiceStatusFilter'].forEach(id => {
      document.getElementById(id).addEventListener('input', render);
      document.getElementById(id).addEventListener('change', render);
    });
  });

  return {
    render,
    openModal: () => openModal(),
    edit,
    del: deleteInvoice,
    changeStatus,
    pdf: downloadPdf,
    removeItem,
  };
})();

window.Invoices = Invoices;
