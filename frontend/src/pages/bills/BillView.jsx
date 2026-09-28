import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { downloadBillPDF, getPublicBillPdfUrl } from '../../lib/pdfDownload';
import Header from '../../components/common/Header';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { ArrowLeft, Download, Printer, MessageSquare, AlertOctagon, Copy, Check, Trash2, AlertTriangle } from 'lucide-react';

export default function BillView() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [copiedLink, setCopiedLink] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['bill', id],
    queryFn: async () => {
      const res = await api.get(`/bills/${id}`);
      // api interceptor returns response.data directly
      return res?.data || res;
    },
  });

  const cancelBillMutation = useMutation({
    mutationFn: async () => {
      return api.patch(`/bills/${id}/cancel`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['bill', id]);
      queryClient.invalidateQueries(['bills']);
    },
  });

  const deleteBillMutation = useMutation({
    mutationFn: async () => {
      return api.delete(`/bills/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['bills']);
      queryClient.invalidateQueries(['dashboardSummary']);
      navigate('/bills');
    },
    onError: (err) => {
      alert(err.message || 'Failed to delete bill');
    },
  });

  const bill = data?.bill || data?.data?.bill;
  const whatsappInfo = data?.whatsappInfo || data?.data?.whatsappInfo || {};

  // Auto trigger print when requested via ?print=true
  useEffect(() => {
    if (bill && searchParams.get('print') === 'true') {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [bill, searchParams]);

  if (isLoading) return <LoadingSpinner fullScreen label="Loading bill..." />;
  if (error || !bill) {
    return (
      <div className="space-y-6">
        <Header title="Bill View" />
        <EmptyState title="Bill Not Found" description="The requested bill could not be found." />
      </div>
    );
  }

  const grandTotal = Number(bill.grandTotal || 0);
  const previousDue = Number(bill.previousDue || 0);
  const grossTotal = grandTotal + previousDue;
  const paidAmount = Number(bill.paidAmount || 0);
  const totalAmount = grossTotal - paidAmount;

  const fmt = (val) =>
    Number(val).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const handleDownloadPDF = async () => {
    await downloadBillPDF(bill.id, bill.billNumber);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const handleSharePDFWhatsApp = () => {
    const customer = bill.customer || {};
    const pdfUrl = getPublicBillPdfUrl(bill.id, whatsappInfo.pdfUrl);
    let mobile = whatsappInfo.formattedMobile || customer.mobile || '';
    if (mobile && !mobile.startsWith('91') && mobile.length === 10) {
      mobile = `91${mobile}`;
    }
    
    let msg = `Hello ${customer.customerName || 'Customer'} (${customer.businessName || ''}),\n\nYour bill from Broilers Express is ready.\n\n*Bill No:* ${bill.billNumber}\n*Date:* ${new Date(bill.billDate).toLocaleDateString('en-IN')}\n*Bill Total:* ₹${fmt(grandTotal)}\n`;
    if (previousDue > 0) {
      msg += `*Previous Due:* ₹${fmt(previousDue)}\n*Gross Total:* ₹${fmt(grossTotal)}\n`;
    }
    if (paidAmount > 0) {
      msg += `*Paid Amount:* ₹${fmt(paidAmount)}\n`;
    }
    msg += `*Total Amount / Balance:* ₹${fmt(totalAmount)}\n\n📄 *Download / View Bill PDF:*\n${pdfUrl}\n\nThank you!\n*Broilers Express*\nMotton Market, Jaysingpur`;

    const url = `https://wa.me/${mobile}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCancelBill = () => {
    if (window.confirm(`Are you sure you want to cancel Bill #${bill.billNumber}? This action preserves the financial record but marks it as CANCELLED.`)) {
      cancelBillMutation.mutate();
    }
  };


  const handleCopyLink = () => {
    const pdfUrl = getPublicBillPdfUrl(bill.id, whatsappInfo?.pdfUrl);
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(pdfUrl).catch(() => {
          fallbackCopyText(pdfUrl);
        });
      } else {
        fallbackCopyText(pdfUrl);
      }
    } catch {
      fallbackCopyText(pdfUrl);
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const fallbackCopyText = (text) => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      document.execCommand('copy');
    } catch (e) {
      console.warn('Copy command failed:', e);
    }
    textarea.remove();
  };

  // Pad items with empty rows to simulate standard printed receipt slip
  const emptyRowsCount = Math.max(0, 5 - bill.items.length);

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Top Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-2xl p-4 border border-slate-200 shadow-xs no-print">
        <div className="flex items-center gap-3">
          <Link
            to="/bills"
            className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors border border-slate-200"
            title="Back to Bills"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900">Bill #{bill.billNumber}</h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  bill.status === 'GENERATED'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-red-100 text-red-800 border border-red-200'
                }`}
              >
                {bill.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Issued on {new Date(bill.billDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* WhatsApp Button */}
          {(whatsappInfo.formattedMobile || bill.customer?.mobile) && (
            <button
              onClick={handleSharePDFWhatsApp}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold text-xs rounded-xl shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 fill-current" />
              <span>WhatsApp</span>
            </button>
          )}

          {/* Print Slip */}
          <button
            onClick={handlePrintPDF}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-purple-200" />
            <span>Print Slip</span>
          </button>

          {/* Download PDF */}
          <button
            onClick={handleDownloadPDF}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-blue-200" />
            <span>Download PDF</span>
          </button>

          {/* Copy Link */}
          <button
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-colors cursor-pointer"
            title="Copy Public Bill PDF Link"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-bold">PDF Link Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copy Link</span>
              </>
            )}
          </button>

          {/* Delete Bill */}
          <button
            onClick={() => setShowDeleteModal(true)}
            disabled={deleteBillMutation.isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-xl border border-red-200 transition-colors cursor-pointer"
            title="Delete Bill"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-600" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left = Bill Items & Customer; Right = Financial Summary & Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start no-print">
        
        {/* LEFT COLUMN: Customer & Billed Items (lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Customer Profile Card */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-black text-base flex items-center justify-center shadow-xs">
                {(bill.customer?.customerName || 'C')[0].toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base text-slate-900 leading-tight">
                    {bill.customer?.customerName}
                  </h3>
                  <span className="font-mono text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                    {bill.customer?.customerCode}
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-medium mt-0.5">
                  {bill.customer?.businessName ? `${bill.customer.businessName} • ` : ''}Mobile: {bill.customer?.mobile}
                </p>
              </div>
            </div>

            <Link
              to={`/customers/${bill.customer?.id}`}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors shrink-0"
            >
              View Profile ➔
            </Link>
          </div>

          {/* Billed Items Table Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Billed Poultry Items</h3>
                <p className="text-xs text-slate-400">Total {bill.items.length} line item{bill.items.length > 1 ? 's' : ''}</p>
              </div>
              <span className="font-mono font-bold text-xs bg-slate-100 px-2.5 py-1 rounded-md text-slate-700">
                Rate × Weight = Amount
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Product Name</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Weight (KG)</th>
                    <th className="py-2.5 px-3 text-right">Rate (₹)</th>
                    <th className="py-2.5 px-4 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bill.items.map((it, idx) => (
                    <tr key={it.id || idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{it.productName}</td>
                      <td className="py-3 px-3 text-center font-bold text-slate-700">{it.quantity}</td>
                      <td className="py-3 px-3 text-right font-mono font-black text-slate-800">{Number(it.weight).toFixed(3)}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-700">{Number(it.rate).toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-mono font-black text-slate-900 text-sm">₹{fmt(it.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Outstanding Balance & Complete Ledger (lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Executive Hero Outstanding Card */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white rounded-2xl p-5 sm:p-6 shadow-xl space-y-4 relative overflow-hidden">
            {/* Ambient subtle glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl"></div>

            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Total Balance / Outstanding
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                totalAmount > 0
                  ? 'bg-amber-900/60 text-amber-300 border border-amber-700'
                  : 'bg-emerald-900/60 text-emerald-300 border border-emerald-700'
              }`}>
                {totalAmount > 0 ? 'Pending Due' : 'Paid in Full'}
              </span>
            </div>

            <div>
              <div className="text-3xl sm:text-4xl font-black font-mono text-emerald-400 tracking-tight">
                ₹{fmt(totalAmount)}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Net balance remaining on this transaction.
              </p>
            </div>

            {/* Financial Breakdown */}
            <div className="space-y-2 border-t border-slate-800 pt-3 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Bill Total (Items):</span>
                <span className="font-mono font-extrabold text-slate-100">₹{fmt(grandTotal)}</span>
              </div>
              <div className="flex justify-between text-amber-300">
                <span>Previous Bill Dues:</span>
                <span className="font-mono font-extrabold">+ ₹{fmt(previousDue)}</span>
              </div>
              <div className="flex justify-between text-slate-200 border-t border-slate-800 pt-1.5 font-bold">
                <span>Gross Total:</span>
                <span className="font-mono font-extrabold text-white">₹{fmt(grossTotal)}</span>
              </div>
              <div className="flex justify-between text-emerald-300">
                <span>Paid Amount:</span>
                <span className="font-mono font-extrabold">- ₹{fmt(paidAmount)}</span>
              </div>
            </div>

            {/* Quick Dispatch Action inside Card */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={handlePrintPDF}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Receipt</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadPDF}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </button>
            </div>
          </div>

          {/* Quick Create Bill Action Box */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-600 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Ledger Synced & Verified</span>
            </div>
            <Link
              to="/bills/new"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg border border-emerald-200 transition-colors"
            >
              <span>+ Create Next Bill</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Hidden Print Container for Physical Receipt Printers (Only renders when window.print() is executed) */}
      <div className="hidden print:block w-full">
        <div className="w-full max-w-2xl mx-auto bg-white border-2 border-black p-4 text-black">
          {/* Header */}
          <div className="flex items-center gap-4 pb-3 border-b-2 border-black">
            <div className="shrink-0">
              <img
                src="/chicken_logo.jpg"
                alt="Broilers Express"
                className="w-16 h-16 object-contain"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
            <div className="grow text-center pr-8">
              <h1 className="text-2xl font-black uppercase text-black leading-tight">
                BROILERS EXPRESS
              </h1>
              <p className="text-xs font-bold text-black mt-0.5">Mutton Market, Jaysingpur</p>
              <p className="text-[11px] font-bold text-black">Jahir Bhai: 9096186625 | Javed Bhai: 9326155315</p>
            </div>
          </div>

          <div className="text-center font-bold italic text-xs py-1 border-b-2 border-black">
            Wholesale &amp; Retail Dealers
          </div>

          <div className="flex justify-between items-center px-2 py-1.5 border-b-2 border-black text-xs font-bold">
            <span>Bill No: #{bill.billNumber}</span>
            <span>Cust ID: {bill.customer?.customerCode || 'N/A'}</span>
            <span>Date: {new Date(bill.billDate).toLocaleDateString('en-IN')}</span>
          </div>

          <div className="px-2 py-1.5 border-b-2 border-black text-xs font-bold uppercase">
            Name: {bill.customer?.businessName || bill.customer?.customerName}
          </div>

          {/* Table */}
          <div className="border-b-2 border-black">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-black font-bold">
                  <th className="py-1 px-2 text-center border-r-2 border-black w-[15%]">Qty</th>
                  <th className="py-1 px-2 text-center border-r-2 border-black w-[35%]">Weight</th>
                  <th className="py-1 px-2 text-center border-r-2 border-black w-[25%]">Rate</th>
                  <th className="py-1 px-2 text-right w-[25%]">Amount</th>
                </tr>
              </thead>
              <tbody>
                {bill.items.map((item, idx) => (
                  <tr key={idx} className="h-8">
                    <td className="py-1 px-2 text-center border-r-2 border-black font-sans font-black tabular-nums text-sm">{item.quantity}</td>
                    <td className="py-1 px-2 text-center border-r-2 border-black font-sans font-black tabular-nums text-sm">{Number(item.weight).toFixed(3)}</td>
                    <td className="py-1 px-2 text-center border-r-2 border-black font-sans font-black tabular-nums text-sm">{Number(item.rate).toFixed(2)}</td>
                    <td className="py-1 px-2 text-right font-sans font-black tabular-nums text-sm">₹{fmt(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="border-b-2 border-black py-2.5 px-3 text-xs space-y-1.5">
            <div className="flex justify-end gap-4 items-center">
              <span className="font-bold text-sm">Bill Total:</span>
              <span className="font-sans font-black tabular-nums text-base w-32 text-right">₹{fmt(grandTotal)}</span>
            </div>
            <div className="flex justify-end gap-4 items-center">
              <span className="font-bold text-sm">Previous Bill Dues:</span>
              <span className="font-sans font-black tabular-nums text-base w-32 text-right">+ ₹{fmt(previousDue)}</span>
            </div>
            <div className="flex justify-end gap-4 items-center border-t border-black pt-1">
              <span className="font-bold text-sm">Gross Total:</span>
              <span className="font-sans font-black tabular-nums text-base w-32 text-right">₹{fmt(grossTotal)}</span>
            </div>
            <div className="flex justify-end gap-4 items-center">
              <span className="font-bold text-sm">Paid Amt:</span>
              <span className="font-sans font-black tabular-nums text-base w-32 text-right">- ₹{fmt(paidAmount)}</span>
            </div>
            <div className="flex justify-end gap-4 items-center border-t-2 border-black pt-1.5">
              <span className="font-black text-base">Total Amount:</span>
              <span className="font-sans font-black tabular-nums text-xl w-32 text-right">₹{fmt(totalAmount)}</span>
            </div>
          </div>

          <div className="pt-2 flex justify-between text-[10px]">
            <span>Computer Generated Invoice</span>
            <span>For - Broilers Express</span>
          </div>
        </div>
      </div>

      {/* Delete Bill Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Delete Bill #{bill.billNumber}</h3>
                <p className="text-xs text-slate-500">Confirm permanent deletion</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="font-bold text-slate-900">{bill.customer?.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Bill Date:</span>
                <span className="font-medium text-slate-700">{new Date(bill.billDate).toLocaleDateString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Bill Total:</span>
                <span className="font-mono font-extrabold text-slate-900">₹{fmt(grandTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status:</span>
                <span className="font-bold text-slate-700">{bill.status}</span>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to permanently delete this bill? If this bill was active, the customer's balance will be automatically adjusted.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteBillMutation.isLoading}
                className="px-4 py-2 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteBillMutation.mutate()}
                disabled={deleteBillMutation.isLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deleteBillMutation.isLoading ? 'Deleting...' : 'Yes, Delete Bill'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
