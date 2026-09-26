const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// Load chicken logo as base64 once at startup
let CHICKEN_LOGO_B64 = '';
const logoPath = path.join(__dirname, '../../assets/chicken_logo.jpg');
try {
  if (fs.existsSync(logoPath)) {
    const bytes = fs.readFileSync(logoPath);
    CHICKEN_LOGO_B64 = `data:image/jpeg;base64,${bytes.toString('base64')}`;
  }
} catch (e) {
  console.warn('[PDF] Could not load chicken logo:', e.message);
}

function formatAmount(val) {
  return Number(val).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

async function generateBillPDF(bill, customer, settings) {
  const cust = customer || bill.customer || {};
  const businessName = settings?.businessName || 'BROILERS EXPRESS';
  const businessAddress = settings?.address || 'Motton Market, Jaysingpur';
  const businessMobile = settings?.mobile || '9326155311';
  const gstNumber = settings?.gstNumber || '';

  const formattedDate = new Date(bill.billDate || bill.createdAt || new Date()).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  // Derived amounts
  const grandTotal = Number(bill.grandTotal);
  const previousDue = Number(bill.previousDue || 0);
  const paidAmount = Number(bill.paidAmount || 0);
  const grossTotal = grandTotal + previousDue;
  const totalAmount = grossTotal - paidAmount;

  const itemsRows = bill.items.map((item, index) => `
    <tr>
      <td class="tc">${item.quantity}</td>
      <td class="tc">${Number(item.weight).toFixed(3)}</td>
      <td class="tc">${Number(item.rate).toFixed(2)}</td>
      <td class="tr bold">${formatAmount(item.amount)}</td>
    </tr>
  `).join('');

  // Fill empty rows to maintain table height (minimum 6 rows)
  const emptyRowsNeeded = Math.max(0, 6 - bill.items.length);
  const emptyRows = Array.from({ length: emptyRowsNeeded }).map(() => `
    <tr>
      <td class="tc">&nbsp;</td>
      <td class="tc">&nbsp;</td>
      <td class="tc">&nbsp;</td>
      <td class="tr">&nbsp;</td>
    </tr>
  `).join('');

  const logoHtml = CHICKEN_LOGO_B64
    ? `<img src="${CHICKEN_LOGO_B64}" class="chicken-logo" alt="Broilers Express" />`
    : `<div class="chicken-placeholder">🐔</div>`;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>Bill #${bill.billNumber} - ${businessName}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@600;700;800&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        @page {
          size: A5 portrait;
          margin: 6mm;
        }

        body {
          font-family: 'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif;
          font-size: 11px;
          color: #000;
          background: #fff;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .bill-outer {
          border: 2px solid #000;
          width: 100%;
          margin: 0 auto;
          background: #fff;
          position: relative;
        }

        /* ===== HEADER ===== */
        .bill-header {
          display: flex;
          align-items: center;
          padding: 8px 12px 6px;
          border-bottom: 2px solid #000;
        }

        .chicken-logo {
          width: 80px;
          height: 65px;
          object-fit: contain;
          flex-shrink: 0;
        }

        .chicken-placeholder {
          font-size: 42px;
          width: 80px;
          text-align: center;
          flex-shrink: 0;
        }

        .header-text {
          flex: 1;
          text-align: center;
          padding-right: 20px;
        }

        .business-name {
          font-size: 24px;
          font-weight: 900;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: #000;
          line-height: 1.1;
        }

        .business-address {
          font-size: 11.5px;
          font-weight: 700;
          color: #111;
          margin-top: 3px;
        }

        .business-contacts {
          font-size: 11px;
          font-weight: 700;
          color: #000;
          margin-top: 2px;
          line-height: 1.3;
        }

        /* ===== TAGLINE BAR ===== */
        .tagline-bar {
          text-align: center;
          font-size: 12.5px;
          font-weight: 800;
          font-style: italic;
          padding: 4px 10px;
          border-bottom: 2px solid #000;
          letter-spacing: 0.8px;
          background: #f8fafc;
        }

        /* ===== BILL META ROW ===== */
        .bill-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 5px 12px;
          border-bottom: 1.5px solid #000;
          font-size: 11.5px;
          font-weight: 700;
        }

        .bill-meta .meta-item strong {
          font-weight: 800;
          font-size: 12px;
        }

        /* ===== CUSTOMER NAME ROW ===== */
        .customer-row {
          padding: 5px 12px;
          border-bottom: 2px solid #000;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          background: #ffffff;
        }

        .customer-row .cust-name {
          font-size: 13px;
          font-weight: 900;
          color: #000;
        }

        /* ===== ITEMS TABLE CONTAINER (Continuous column look) ===== */
        .items-container {
          border-bottom: 2px solid #000;
          min-height: 220px;
          display: flex;
          flex-direction: column;
        }

        .items-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }

        .items-table thead th {
          font-size: 11.5px;
          font-weight: 800;
          padding: 6px 8px;
          border-bottom: 2px solid #000;
          border-right: 1.5px solid #000;
          background: #f1f5f9;
        }

        .items-table thead th:last-child {
          border-right: none;
        }

        .items-table tbody td {
          padding: 6px 8px;
          font-size: 12px;
          border-right: 1.5px solid #000;
          vertical-align: top;
          font-variant-numeric: tabular-nums;
        }

        .items-table tbody td:last-child {
          border-right: none;
        }

        .tc { text-align: center; }
        .tr { text-align: right; }
        .tl { text-align: left; }
        .mono { font-family: 'JetBrains Mono', 'Courier New', Courier, monospace; }
        .bold { font-weight: 700; }
        .heavy { font-weight: 800; }

        /* The blank space stretcher to simulate authentic pre-printed bill books */
        .table-fill {
          flex: 1;
          display: flex;
          width: 100%;
          min-height: 80px;
        }

        .fill-col {
          border-right: 1.5px solid #000;
          height: 100%;
        }
        .fill-col:last-child {
          border-right: none;
        }

        /* ===== SUMMARY SECTION (3-Tiered Box exactly like reference) ===== */
        .summary-section {
          border-bottom: 2px solid #000;
        }

        .summary-tier {
          padding: 4px 12px;
        }

        .summary-tier-bordered {
          border-top: 1.5px solid #000;
          padding: 4px 12px;
        }

        .summary-tier-final {
          border-top: 2px solid #000;
          padding: 6px 12px;
          background: #f8fafc;
        }

        .summary-row {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          padding: 2px 0;
          font-size: 12px;
        }

        .summary-label {
          text-align: right;
          width: 190px;
          font-weight: 700;
          padding-right: 18px;
          color: #000;
        }

        .summary-value {
          text-align: right;
          width: 140px;
          font-weight: 800;
          font-family: 'JetBrains Mono', 'Courier New', Courier, monospace;
          font-size: 12.5px;
          color: #000;
        }

        .summary-tier-final .summary-label {
          font-size: 14px;
          font-weight: 900;
          letter-spacing: 0.3px;
        }

        .summary-tier-final .summary-value {
          font-size: 16px;
          font-weight: 900;
        }

        /* ===== FOOTER ===== */
        .bill-footer {
          padding: 10px 14px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }

        .footer-note {
          font-size: 9.5px;
          color: #555;
          font-style: italic;
        }

        .footer-sign {
          text-align: right;
          font-size: 12.5px;
          font-weight: 800;
          letter-spacing: 0.3px;
        }
      </style>
    </head>
    <body>
      <div class="bill-outer">

        <!-- HEADER -->
        <div class="bill-header">
          ${logoHtml}
          <div class="header-text">
            <div class="business-name">${businessName}</div>
            <div class="business-address">${businessAddress}</div>
            <div class="business-contacts">
              <div>Mbl -: ${businessMobile} To 14</div>
              <div>Javed Bhai : 9326155315</div>
            </div>
          </div>
        </div>

        <!-- TAGLINE BAR -->
        <div class="tagline-bar">Wholesale &amp; Retail Dealers</div>

        <!-- BILL META -->
        <div class="bill-meta">
          <div class="meta-item">Bill No : <strong>${bill.billNumber}</strong></div>
          <div class="meta-item">Cust ID : <strong>${cust.customerCode || 'N/A'}</strong></div>
          <div class="meta-item">Date : <strong>${formattedDate}</strong></div>
        </div>

        <!-- CUSTOMER NAME -->
        <div class="customer-row">
          Name : <span class="cust-name">${cust.businessName || cust.customerName || 'Cash Customer'}</span>
          ${cust.businessName && cust.customerName && cust.businessName !== cust.customerName ? ` <span style="font-weight:600; font-size:11px;">(${cust.customerName})</span>` : ''}
        </div>

        <!-- ITEMS TABLE (with continuous column lines) -->
        <div class="items-container">
          <table class="items-table">
            <thead>
              <tr>
                <th class="tc" style="width: 18%;">Qty</th>
                <th class="tc" style="width: 32%;">Weight</th>
                <th class="tc" style="width: 22%;">Rate</th>
                <th class="tr" style="width: 28%;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${bill.items.map(item => `
                <tr>
                  <td class="tc heavy mono">${item.quantity}</td>
                  <td class="tc heavy mono">${Number(item.weight).toFixed(3)}</td>
                  <td class="tc heavy mono">${Number(item.rate).toFixed(2)}</td>
                  <td class="tr heavy mono">${formatAmount(item.amount)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <!-- Empty Column Extenders matching authentic billing pad look -->
          <div class="table-fill">
            <div class="fill-col" style="width: 18%;"></div>
            <div class="fill-col" style="width: 32%;"></div>
            <div class="fill-col" style="width: 22%;"></div>
            <div class="fill-col" style="width: 28%;"></div>
          </div>
        </div>

        <!-- SUMMARY SECTION (Exact 3-tier box layout from reference photo) -->
        <div class="summary-section">
          <!-- Tier 1: Bill Total & Previous Dues -->
          <div class="summary-tier">
            <div class="summary-row">
              <div class="summary-label">Bill Total :</div>
              <div class="summary-value">${formatAmount(grandTotal)}</div>
            </div>
            <div class="summary-row">
              <div class="summary-label">Previous Bill Dues :</div>
              <div class="summary-value">${formatAmount(previousDue)}</div>
            </div>
          </div>

          <!-- Tier 2: Gross Total & Paid Amt -->
          <div class="summary-tier-bordered">
            <div class="summary-row">
              <div class="summary-label">Gross Total :</div>
              <div class="summary-value">${formatAmount(grossTotal)}</div>
            </div>
            <div class="summary-row">
              <div class="summary-label">Paid Amt :</div>
              <div class="summary-value">${formatAmount(paidAmount)}</div>
            </div>
          </div>

          <!-- Tier 3: Final Total Amount -->
          <div class="summary-tier-final">
            <div class="summary-row">
              <div class="summary-label">Total Amount :</div>
              <div class="summary-value">${formatAmount(totalAmount)}</div>
            </div>
          </div>
        </div>

        <!-- FOOTER -->
        <div class="bill-footer">
          <div class="footer-note">Computer Generated Invoice</div>
          <div class="footer-sign">For - Broilers Express</div>
        </div>

      </div>
    </body>
    </html>
  `;

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-zygote'
      ],
    });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });
    const pdfBuffer = await page.pdf({
      format: 'A5',
      margin: { top: '8mm', right: '8mm', bottom: '8mm', left: '8mm' },
      printBackground: true,
    });
    return pdfBuffer;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = { generateBillPDF };
