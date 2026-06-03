# ⬡ PayEdgePro

**Modern Financial Management for Freelancers, Small Businesses & Entrepreneurs**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-payedgepro.com-3fb950?style=flat-square)](https://payedgepro.com)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)
[![GitHub Pages](https://img.shields.io/badge/Deploy-GitHub%20Pages-58a6ff?style=flat-square)](https://pages.github.com)

---

## ✨ Features

| Module | Description |
|---|---|
| 📊 **Dashboard** | Financial overview, income vs expenses chart, recent activity |
| 💸 **Expenses** | Add, categorize, filter, and summarize expenses |
| 🧾 **Invoices** | Create professional invoices, track status, download PDF |
| 📋 **Debt Tracker** | Track money owed to you and money you owe |
| 📈 **Profit Calculator** | Revenue tracking, net profit, monthly & annual summaries |
| 👥 **Clients** | Manage client contacts, addresses, invoice history |
| 📑 **Reports** | Monthly reports, export to PDF and CSV |
| 💰 **Pricing** | Free, Professional, Business, and Enterprise plans |

---

## 🚀 Quick Start

### Option 1 — Open Directly

Just open `index.html` in your browser. No server or build step needed.

```bash
git clone https://github.com/YOUR_USERNAME/payedgepro.git
cd payedgepro
open index.html   # macOS
# or
start index.html  # Windows
```

### Option 2 — Local Server (recommended)

```bash
# Python 3
python -m http.server 8080

# Node.js (npx)
npx serve .

# Then visit: http://localhost:8080
```

---

## 🌐 GitHub Pages Deployment

Deploy your own instance to GitHub Pages for free:

```bash
# 1. Initialize the repo
git init
git add .
git commit -m "Launch PayEdgePro"
git branch -M main

# 2. Create a repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/payedgepro.git
git push -u origin main

# 3. In GitHub → Settings → Pages → Source: Deploy from branch → main / root
# Your site will be live at: https://YOUR_USERNAME.github.io/payedgepro/
```

---

## 📁 Project Structure

```
payedgepro/
├── index.html        # Main HTML — all pages, modals, layout
├── style.css         # Full CSS — dark/light theme, responsive
├── app.js            # Core: navigation, dashboard, charts, theme
├── expenses.js       # Expense management module
├── invoices.js       # Invoice management + PDF generation
├── debts.js          # Debt tracker + Client management
├── reports.js        # Reports, PDF export, CSV export
├── manifest.json     # PWA manifest
├── sitemap.xml       # SEO sitemap
├── robots.txt        # SEO robots
├── .gitignore        # Git ignore rules
└── README.md         # This file
```

---

## 🎨 Customization Guide

### Change Brand Name / Logo

In `index.html`, find and replace `PayEdgePro` and `payedgepro.com` with your brand.

```html
<!-- Logo in sidebar -->
<span class="logo-text">YourBrand<span class="logo-accent">Pro</span></span>
```

### Change Accent Color

In `style.css`, update the `--accent` variable:

```css
:root {
  --accent:       #3fb950;  /* Change to your color */
  --accent-dim:   rgba(63,185,80,0.15);
  --accent-hover: #56d364;
}
```

### Change Contact Email

Search and replace `salatrir@gmail.com` across all files.

### Add Expense Categories

In `index.html`, find the `<select id="expCategory">` and `<select id="expenseCatFilter">` elements and add your custom categories.

### Modify Pricing Plans

In `index.html`, find the `.pricing-grid` section and update plan names, prices, and features.

---

## 💾 Data Storage

All data is stored in your browser's **localStorage** under keys prefixed with `pep_`:

| Key | Data |
|---|---|
| `pep_expenses` | Expense entries array |
| `pep_revenues` | Revenue entries array |
| `pep_invoices` | Invoice objects array |
| `pep_debts` | Debt entries array |
| `pep_clients` | Client objects array |
| `pep_theme` | `"dark"` or `"light"` |

> **Note:** Data is stored locally in your browser. Clearing browser data will erase it. For production use with cloud sync, connect a backend or use a service like Firebase.

---

## 📦 Dependencies (CDN)

All loaded via CDN — no npm install needed:

| Library | Purpose |
|---|---|
| [Chart.js 4.4](https://cdn.jsdelivr.net/npm/chart.js) | Dashboard charts |
| [jsPDF 2.5](https://cdnjs.cloudflare.com/ajax/libs/jspdf/) | PDF generation |
| [Google Fonts](https://fonts.google.com) | Syne + DM Sans + DM Mono |

---

## 📱 Browser Support

| Browser | Support |
|---|---|
| Chrome / Edge | ✅ Full |
| Firefox | ✅ Full |
| Safari | ✅ Full |
| Mobile (iOS/Android) | ✅ Responsive |

---

## 📧 Contact & Support

- **Email:** [salatrir@gmail.com](mailto:salatrir@gmail.com)
- **Website:** [payedgepro.com](https://payedgepro.com)

---

## 📄 License

MIT License — free to use, modify, and distribute.

---

*Built with ❤️ for freelancers and small business owners everywhere.*
