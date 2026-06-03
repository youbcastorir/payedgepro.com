/* ============================================================
   PayEdgePro — reports.js
   Monthly reports, PDF export, CSV export
   ============================================================ */

const Reports = (() => {
  'use strict';

  function init() {
    document.getElementById('genReportBtn').addEventListener('click', generateReport);
    document.getElementById('exportPdfBtn').addEventListener('click', exportPdf);
    document.getElementById('exportCsvBtn').addEventListener('click', exportCsv);
  }

  function getMonthYear() {
    const m = parseInt(document.getElementById('reportMonth').value);
    const y = parseInt(document.getElementById('reportYear').value);
    return { m, y };
  }

  function generateReport() {
    const { m, y } = getMonthYear();
    if (!m || !y) { showToast('Please select a month and year.', 'error'); return; }

    const expenses = store.get('expenses').filter(e => matchMonthYear(e.date, m, y));
    const revenues = store.get('revenues').filter(r => matchMonthYear(r.date, m, y));
    const invoices = store.get('invoices').filter(i => matchMonthYear(i.date, m, y));
    const debts    = store.get('debts');

    const totalRev = revenues.reduce((s, r) => s + parseFloat(r.amount || 0), 0);
    const totalExp = expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
    const netProfit = totalRev - totalExp;
    const margin   = totalRev > 0 ? ((netProfit / totalRev) * 100).toFixed(1) : '0.0';

    // Category breakdown
    const catMap = {};
    expenses.forEach(e => {
      const cat = e.category || 'Other';
      catMap[cat] = (catMap[cat] || 0) + parseFloat(e.amount || 0);
    });

    const monthName = new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const paidInvoices   = invoices.filter(i => i.status === 'Paid').length;
    const unpaidInvoices = invoices.filter(i => i.status !== 'Paid').length;

    const html = `
      <div class="report-section">
        <div class="report-title">Financial Report — ${monthName}</div>
        <div class="report-subtitle">Generated on ${new Date().toLocaleDateString('en-US', {weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div>

        <h4 style="font-family:var(--font-display);font-size:0.82rem;text-transform:uppercase;letter-spacing:0.07em;color:var(--text-muted);margin-bottom:0.75rem">Summary</h4>
        <div class="report-row"><span>Total Revenue</span><span style="color:var(--accent);font-family:var(--font-mono)">${fmt(totalRev)}</span></div>
        <div class="report-row"><span>Total Expenses</span><span style="color:var(--red);font-family:var(--font-mono)">${fmt(totalExp)}</span></div>
        <div class="report-row report-total"><span>Net Profit</span><span style="color:${netProfit>=0?'var(--accent)':'var(--red)'};font-family:var(--font-mono)">${fmt(netProfit)}</span></div>
        <div class="report-row"><span>Profit Margin</span><span style="font-family:var(--font-mono)">${margin}%</span></div>
      </div>

      <div class="report-section">
        <h4 style="font-family:var(--font-display);font-size:0.82rem;text-transform:uppercase;letter-spacing:0.07em;color:var(--text-muted);margin-bottom:0.75rem">Invoices</h4>
        <div class="report-row"><span>Total Invoices</span><span style="font-family:var(--font-mono)">${invoices.length}</span></div>
        <div class="report-row"><span>Paid</span><span style="color:var(--accent);font-family:var(--font-mono)">${paidInvoices}</span></div>
        <div class="report-row"><span>Outstanding</span><span style="color:var(--orange);font-family:var(--font-mono)">${unpaidInvoices}</span></div>
        <div class="report-row"><span>Total Invoiced</span><span style="font-family:var(--font-mono)">${fmt(invoices.reduce((s,i)=>s+parseFloat(i.total||0),0))}</span></div>
      </div>

      <div class="report-section">
        <h4 style="font-family:var(--font-display);font-size:0.82rem;text-transform:uppercase;letter-spacing:0.07em;color:var(--text-muted);margin-bottom:0.75rem">Expenses by Category</h4>
        ${Object.keys(catMap).length === 0
          ? '<p style="color:var(--text-muted);font-size:0.85rem">No expenses this month.</p>'
          : Object.entries(catMap).sort(([,a],[,b])=>b-a).map(([cat,v]) => `
              <div class="report-row">
                <span>${escHtml(cat)}</span>
                <span style="color:var(--red);font-family:var(--font-mono)">${fmt(v)}</span>
              </div>`).join('')
        }
      </div>

      <div class="report-section">
        <h4 style="font-family:var(--font-display);font-size:0.82rem;text-transform:uppercase;letter-spacing:0.07em;color:var(--text-muted);margin-bottom:0.75rem">Revenue Entries (${revenues.length})</h4>
        ${revenues.length === 0
          ? '<p style="color:var(--text-muted);font-size:0.85rem">No revenue entries this month.</p>'
          : revenues.map(r => `
              <div class="report-row">
                <span>${escHtml(r.description)} <span style="color:var(--text-muted);font-size:0.75rem">${formatDate(r.date)}</span></span>
                <span style="color:var(--accent);font-family:var(--font-mono)">${fmt(r.amount)}</span>
              </div>`).join('')
        }
      </div>

      <div class="report-section">
        <h4 style="font-family:var(--font-display);font-size:0.82rem;text-transform:uppercase;letter-spacing:0.07em;color:var(--text-muted);margin-bottom:0.75rem">Expense Entries (${expenses.length})</h4>
        ${expenses.length === 0
          ? '<p style="color:var(--text-muted);font-size:0.85rem">No expenses this month.</p>'
          : expenses.map(e => `
              <div class="report-row">
                <span>${escHtml(e.description)} <span class="badge badge-draft" style="margin-left:0.5rem">${escHtml(e.category||'Other')}</span></span>
                <span style="color:var(--red);font-family:var(--font-mono)">${fmt(e.amount)}</span>
              </div>`).join('')
        }
      </div>
    `;

    document.getElementById('reportContent').innerHTML = html;
    showToast('Report generated!');
  }

  function matchMonthYear(dateStr, m, y) {
    if (!dateStr) return false;
    const d = new Date(dateStr + 'T00:00:00');
    return d.getMonth() + 1 === m && d.getFullYear() === y;
  }

  // ── PDF Export ──────────────────────────────────────────
  function exportPdf() {
    const { m, y } = getMonthYear();
    if (!m || !y) { showToast('Generate a report first.', 'error'); return; }

    const expenses = store.get('expenses').filter(e => matchMonthYear(e.date, m, y));
    const revenues = store.get('revenues').filter(r => matchMonthYear(r.date, m, y));
    const invoices = store.get('invoices').filter(i => matchMonthYear(i.date, m, y));

    const totalRev = revenues.reduce((s, r) => s + parseFloat(r.amount || 0), 0);
    const totalExp = expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
    const netProfit = totalRev - totalExp;
    const margin   = totalRev > 0 ? ((netProfit / totalRev) * 100).toFixed(1) : '0.0';
    const monthName = new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });

    // Header
    doc.setFillColor(13, 17, 23);
    doc.rect(0, 0, 210, 35, 'F');
    doc.setTextColor(63, 185, 80);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('PayEdgePro', 15, 15);
    doc.setTextColor(200, 210, 220);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('payedgepro.com  |  salatrir@gmail.com', 15, 23);
    doc.setTextColor(255,255,255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Financial Report — ' + monthName, 105, 15, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Generated: ' + new Date().toLocaleDateString(), 105, 23, { align: 'center' });

    let y2 = 45;

    // Summary box
    const drawSection = (title, rows) => {
      doc.setFillColor(240, 242, 245);
      doc.rect(10, y2, 190, 8, 'F');
      doc.setTextColor(60, 70, 80);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(title, 15, y2 + 5.5);
      y2 += 10;
      rows.forEach(([label, value, color]) => {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(70, 80, 90);
        doc.setFontSize(9);
        doc.text(label, 15, y2 + 1);
        if (color) doc.setTextColor(...color);
        doc.text(value, 165, y2 + 1);
        doc.setTextColor(70, 80, 90);
        y2 += 8;
      });
      y2 += 4;
    };

    drawSection('SUMMARY', [
      ['Total Revenue', fmt(totalRev), [63,185,80]],
      ['Total Expenses', fmt(totalExp), [248,81,73]],
      ['Net Profit', fmt(netProfit), netProfit >= 0 ? [63,185,80] : [248,81,73]],
      ['Profit Margin', margin + '%', [88,166,255]],
    ]);

    drawSection('INVOICES', [
      ['Total Invoices', String(invoices.length), null],
      ['Paid', String(invoices.filter(i=>i.status==='Paid').length), [63,185,80]],
      ['Outstanding', String(invoices.filter(i=>i.status!=='Paid').length), [227,179,65]],
    ]);

    // Expense rows
    if (expenses.length) {
      drawSection('EXPENSES', expenses.map(e => [
        `${e.description} [${e.category||'Other'}] — ${e.date}`,
        fmt(e.amount),
        [248,81,73]
      ]));
    }
    // Revenue rows
    if (revenues.length) {
      drawSection('REVENUE ENTRIES', revenues.map(r => [
        `${r.description} — ${r.date}`,
        fmt(r.amount),
        [63,185,80]
      ]));
    }

    // Footer
    doc.setFillColor(240, 242, 245);
    doc.rect(0, 280, 210, 17, 'F');
    doc.setTextColor(120, 130, 140);
    doc.setFontSize(8);
    doc.text('PayEdgePro | payedgepro.com | salatrir@gmail.com', 105, 291, { align: 'center' });

    doc.save(`report_${monthName.replace(/\s/g,'_')}.pdf`);
    showToast('PDF exported!');
  }

  // ── CSV Export ──────────────────────────────────────────
  function exportCsv() {
    const { m, y } = getMonthYear();
    if (!m || !y) { showToast('Generate a report first.', 'error'); return; }

    const expenses = store.get('expenses').filter(e => matchMonthYear(e.date, m, y));
    const revenues = store.get('revenues').filter(r => matchMonthYear(r.date, m, y));
    const invoices = store.get('invoices').filter(i => matchMonthYear(i.date, m, y));

    let csv = 'Type,Date,Description,Category,Amount,Status\n';

    revenues.forEach(r => {
      csv += `Revenue,${r.date},${csvEsc(r.description)},,${r.amount},\n`;
    });
    expenses.forEach(e => {
      csv += `Expense,${e.date},${csvEsc(e.description)},${csvEsc(e.category||'Other')},${e.amount},\n`;
    });
    invoices.forEach(i => {
      csv += `Invoice,${i.date},${csvEsc('Invoice #' + i.number + ' — ' + i.client)},,${i.total},${i.status}\n`;
    });

    const monthName = new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `report_${monthName.replace(/\s/g,'_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV exported!');
  }

  function csvEsc(s) {
    if (!s) return '';
    s = String(s).replace(/"/g, '""');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Bind buttons (also wired in init(), kept for safety)
    document.getElementById('genReportBtn')?.addEventListener('click', generateReport);
    document.getElementById('exportPdfBtn')?.addEventListener('click', exportPdf);
    document.getElementById('exportCsvBtn')?.addEventListener('click', exportCsv);
  });

  return { init, generateReport, exportPdf, exportCsv };
})();

window.Reports = Reports;
