import api from './api';

export const BACKEND_PROD_URL = 'https://poultry-farm-billing.onrender.com/api';

/**
 * Returns the configured base API URL, ensuring no trailing slash.
 * In production on Vercel, this points to the backend (e.g. Render).
 * In development, defaults to '/api'.
 */
export function getApiBaseUrl() {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.startsWith('http')) {
    return envUrl.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return BACKEND_PROD_URL;
  }
  return (envUrl || '/api').replace(/\/+$/, '');
}

/**
 * Returns a fully-qualified public URL to view/download the bill PDF
 * Safe for sharing on WhatsApp or opening directly in browser.
 */
export function getPublicBillPdfUrl(billId, fallbackUrl) {
  if (fallbackUrl && typeof fallbackUrl === 'string' && fallbackUrl.startsWith('http')) {
    return fallbackUrl;
  }
  const baseUrl = getApiBaseUrl();
  if (baseUrl.startsWith('http')) {
    return `${baseUrl}/bills/public/${billId}/pdf`;
  }
  return `${BACKEND_PROD_URL}/bills/public/${billId}/pdf`;
}

/**
 * Securely downloads the Bill PDF using the Axios API client.
 * This guarantees the request goes to the backend server (Render)
 * with the JWT authentication header, and avoids Vercel returning index.html.
 */
export async function downloadBillPDF(billId, billNumber) {
  try {
    const blob = await api.get(`/bills/${billId}/pdf`, {
      responseType: 'blob',
    });

    if (!(blob instanceof Blob)) {
      throw new Error('Invalid response format received from server.');
    }

    // Guard against Vercel/proxies returning index.html as a blob
    if (blob.type.includes('text/html')) {
      const htmlText = await blob.text();
      if (htmlText.includes('<!doctype') || htmlText.includes('<html')) {
        throw new Error('API returned web page HTML instead of PDF. Please verify backend connection.');
      }
    }

    // Guard against backend error responses wrapped in blob
    if (blob.type.includes('application/json')) {
      const errText = await blob.text();
      try {
        const json = JSON.parse(errText);
        throw new Error(json.message || 'Failed to generate PDF');
      } catch (e) {
        throw new Error(errText || 'Failed to generate PDF');
      }
    }

    // Trigger standard browser download
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bill_${billNumber || billId}_BroilersExpress.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
    return true;
  } catch (err) {
    console.warn('[PDF] Authenticated download failed, trying public endpoint:', err);

    // Fallback: Attempt public endpoint via full backend URL
    try {
      const publicUrl = getPublicBillPdfUrl(billId);
      const res = await fetch(publicUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/pdf')) {
        throw new Error('Endpoint returned non-PDF content.');
      }
      const publicBlob = await res.blob();
      const url = window.URL.createObjectURL(publicBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Bill_${billNumber || billId}_BroilersExpress.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      return true;
    } catch (fallbackErr) {
      console.error('[PDF] Download failed:', fallbackErr);
      alert(
        err.message ||
        fallbackErr.message ||
        'Failed to download PDF. Please try "Print Slip" or check your internet connection.'
      );
      return false;
    }
  }
}

/**
 * Opens the PDF in a new browser tab for viewing or printing using the backend URL.
 */
export function openBillPDF(billId) {
  const token = localStorage.getItem('token');
  const baseUrl = getApiBaseUrl();
  const pdfUrl = baseUrl.startsWith('http')
    ? `${baseUrl}/bills/${billId}/pdf?token=${encodeURIComponent(token || '')}`
    : `${window.location.origin}${baseUrl}/bills/${billId}/pdf?token=${encodeURIComponent(token || '')}`;

  const win = window.open(pdfUrl, '_blank');
  if (win) {
    win.focus();
  }
}
