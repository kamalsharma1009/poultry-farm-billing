import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
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
    try {
      const token = localStorage.getItem('token');
      const targetUrl = token
        ? `/api/bills/${bill.id}/pdf?token=${encodeURIComponent(token)}`
        : `/api/bills/public/${bill.id}/pdf`;

      const response = await fetch(targetUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/pdf')) {
        throw new Error('Non-PDF response returned');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Bill_${bill.billNumber}_BroilersExpress.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      console.warn('Direct PDF download fallback to public link:', err);
      // Fallback: direct browser navigation to public PDF link
      const a = document.createElement('a');
      a.href = `/api/bills/public/${bill.id}/pdf`;
      a.download = `Bill_${bill.billNumber}_BroilersExpress.pdf`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const handleSharePDFWhatsApp = () => {
    const customer = bill.customer || {};
    const pdfUrl = whatsappInfo.pdfUrl || `${window.location.origin}/api/bills/public/${bill.id}/pdf`;
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
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Pad items with empty rows to simulate standard printed receipt slip
  const emptyRowsCount = Math.max(0, 5 - bill.items.length);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 no-print">
        <Link
          to="/bills"
          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors border border-slate-200"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <Header title={`Bill #${bill.billNumber}`} />
      </div>

      {/* Top Action Bar */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 no-print">
        <div className="flex items-center justify-between sm:justify-start gap-3">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold ${
              bill.status === 'GENERATED'
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                : 'bg-red-100 text-red-800 border border-red-200'
            }`}
          >
            {bill.status}
          </span>
          <span className="text-xs text-slate-500 font-semibold">
            Date: {new Date(bill.billDate).toLocaleDateString('en-IN')}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
          {/* Download PDF */}
          <button
            onClick={handleDownloadPDF}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs active:scale-95"
          >
            <Download className="w-3.5 h-3.5 text-blue-100" />
            <span>Download</span>
          </button>

          {/* Print */}
          <button
            onClick={handlePrintPDF}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs active:scale-95"
          >
            <Printer className="w-3.5 h-3.5 text-purple-100" />
            <span>Print</span>
          </button>

          {/* Single WhatsApp Button (No duplicates!) */}
          {(whatsappInfo.formattedMobile || bill.customer?.mobile) && (
            <button
              onClick={handleSharePDFWhatsApp}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold text-xs rounded-xl transition-all shadow-xs active:scale-95"
            >
              <MessageSquare className="w-3.5 h-3.5 fill-current" />
              <span>WhatsApp</span>
            </button>
          )}

          {/* Copy Bill Link */}
          <button
            onClick={handleCopyLink}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors border border-slate-300 active:scale-95"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-bold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copy Link</span>
              </>
            )}
          </button>

          {/* Cancel Bill (only if active) */}
          {bill.status === 'GENERATED' && (
            <button
              onClick={handleCancelBill}
              disabled={cancelBillMutation.isLoading}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-semibold text-xs rounded-xl transition-colors"
            >
              <AlertOctagon className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>
          )}

          {/* Delete Bill */}
          <button
            onClick={() => setShowDeleteModal(true)}
            disabled={deleteBillMutation.isLoading}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition-colors shadow-xs active:scale-95"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Bill Visual View Container - Perfectly Responsive on Mobile & Desktop */}
      <div className="w-full pb-6 pt-1">
        <div className="w-full max-w-2xl mx-auto bg-white rounded-xl border-2 border-black p-3 sm:p-6 shadow-xl font-sans text-black">
          {/* Bill Slip Header with Chicken Logo & Details */}
          <div className="flex items-center gap-2.5 sm:gap-4 pb-2.5 sm:pb-3 border-b-2 border-black">
            <div className="shrink-0">
              <img
                src="/chicken_logo.jpg"
                alt="Broilers Express"
                className="w-14 h-14 sm:w-24 sm:h-20 object-contain rounded-md"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
            <div className="grow text-center pr-2 sm:pr-8">
              <h1 className="text-lg sm:text-3xl font-black tracking-wide text-black uppercase leading-tight">
                BROILERS EXPRESS
              </h1>
              <p className="text-[11px] sm:text-sm font-extrabold text-slate-800 tracking-wider mt-0.5 sm:mt-1">
                Motton Market , Jaysingpur
              </p>
              <p className="text-[10px] sm:text-xs font-bold text-black mt-0.5">
                Mbl -: 9326155311 To 14
              </p>
              <p className="text-[10px] sm:text-xs font-bold text-black">
                Javed Bhai : 9326155315
              </p>
            </div>
          </div>

          {/* Wholesale & Retail Dealers Banner */}
          <div className="text-center font-black italic text-xs sm:text-sm tracking-wider py-1 sm:py-1.5 border-b-2 border-black bg-slate-50">
            Wholesale &amp; Retail Dealers
          </div>

          {/* Bill Metadata Row */}
          <div className="flex flex-wrap sm:flex-nowrap justify-between items-center gap-1 px-2.5 sm:px-4 py-1.5 sm:py-2 border-b-2 border-black text-[11px] sm:text-xs font-bold bg-white">
            <div>
              Bill No : <span className="font-black text-blue-900 text-xs sm:text-sm">#{bill.billNumber}</span>
            </div>
            <div>
              Cust ID : <span className="font-black text-emerald-900 text-xs sm:text-sm">{bill.customer.customerCode}</span>
            </div>
            <div>
              Date : <span className="font-black text-slate-900 text-xs sm:text-sm">{new Date(bill.billDate).toLocaleDateString('en-IN')}</span>
            </div>
          </div>

          {/* Customer Name Row */}
          <div className="px-2.5 sm:px-4 py-1.5 sm:py-2.5 border-b-2 border-black text-[11px] sm:text-xs font-extrabold uppercase">
            Name : <span className="text-xs sm:text-sm font-black text-black">{bill.customer.businessName || bill.customer.customerName}</span>
            {bill.customer.businessName && bill.customer.businessName !== bill.customer.customerName && (
              <span className="text-slate-600 font-semibold normal-case ml-1.5 text-[10px] sm:text-xs">({bill.customer.customerName})</span>
            )}
          </div>

          {/* Items Table Container (Continuous Column Look) */}
          <div className="border-b-2 border-black min-h-[160px] sm:min-h-[220px] flex flex-col justify-between">
            <table className="w-full text-[11px] sm:text-xs border-collapse table-fixed">
              <thead>
                <tr className="border-b-2 border-black bg-slate-100 font-black text-black">
                  <th className="py-1.5 sm:py-2.5 px-1.5 sm:px-3 text-center border-r-2 border-black w-[18%]">Qty</th>
                  <th className="py-1.5 sm:py-2.5 px-1.5 sm:px-3 text-center border-r-2 border-black w-[32%]">Weight</th>
                  <th className="py-1.5 sm:py-2.5 px-1.5 sm:px-3 text-center border-r-2 border-black w-[22%]">Rate</th>
                  <th className="py-1.5 sm:py-2.5 px-1.5 sm:px-3 text-right w-[28%]">Amount</th>
                </tr>
              </thead>
              <tbody>
                {bill.items.map((item, idx) => (
                  <tr key={item.id || idx}>
                    <td className="py-1.5 sm:py-2 px-1.5 sm:px-3 text-center border-r-2 border-black font-extrabold font-mono text-xs sm:text-sm">{item.quantity}</td>
                    <td className="py-1.5 sm:py-2 px-1.5 sm:px-3 text-center border-r-2 border-black font-extrabold font-mono text-xs sm:text-sm">{Number(item.weight).toFixed(3)}</td>
                    <td className="py-1.5 sm:py-2 px-1.5 sm:px-3 text-center border-r-2 border-black font-extrabold font-mono text-xs sm:text-sm">{Number(item.rate).toFixed(2)}</td>
                    <td className="py-1.5 sm:py-2 px-1.5 sm:px-3 text-right font-black font-mono text-xs sm:text-sm text-black">{fmt(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Blank column extender fill to match physical bill book receipt */}
            <div className="flex w-full grow min-h-[60px] sm:min-h-[90px]">
              <div className="border-r-2 border-black w-[18%]"></div>
              <div className="border-r-2 border-black w-[32%]"></div>
              <div className="border-r-2 border-black w-[22%]"></div>
              <div className="w-[28%]"></div>
            </div>
          </div>

          {/* Summary Breakdown (3-Tier Exact Match) */}
          <div className="border-b-2 border-black">
            {/* Tier 1: Bill Total & Previous Dues */}
            <div className="py-1.5 sm:py-2 px-2.5 sm:px-4 space-y-1">
              <div className="flex justify-end items-center gap-2 sm:gap-4 text-[11px] sm:text-xs">
                <span className="font-extrabold text-black">Bill Total :</span>
                <span className="font-mono font-black text-xs sm:text-sm text-black w-24 sm:w-32 text-right">{fmt(grandTotal)}</span>
              </div>
              <div className="flex justify-end items-center gap-2 sm:gap-4 text-[11px] sm:text-xs">
                <span className="font-extrabold text-black">Previous Bill Dues :</span>
                <span className="font-mono font-black text-xs sm:text-sm text-amber-900 w-24 sm:w-32 text-right">{fmt(previousDue)}</span>
              </div>
            </div>

            {/* Tier 2: Gross Total & Paid Amt */}
            <div className="py-1.5 sm:py-2 px-2.5 sm:px-4 space-y-1 border-t-2 border-black">
              <div className="flex justify-end items-center gap-2 sm:gap-4 text-[11px] sm:text-xs">
                <span className="font-black text-black">Gross Total :</span>
                <span className="font-mono font-black text-xs sm:text-sm text-black w-24 sm:w-32 text-right">{fmt(grossTotal)}</span>
              </div>
              <div className="flex justify-end items-center gap-2 sm:gap-4 text-[11px] sm:text-xs">
                <span className="font-extrabold text-black">Paid Amt :</span>
                <span className="font-mono font-black text-xs sm:text-sm text-emerald-800 w-24 sm:w-32 text-right">{fmt(paidAmount)}</span>
              </div>
            </div>

            {/* Tier 3: Total Amount */}
            <div className="py-2 sm:py-2.5 px-2.5 sm:px-4 border-t-2 border-black bg-slate-50">
              <div className="flex justify-end items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                <span className="font-black text-black text-sm sm:text-base">Total Amount :</span>
                <span className="font-mono font-black text-base sm:text-lg text-black w-28 sm:w-32 text-right">₹{fmt(totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-3 sm:pt-4 flex justify-between items-end text-[10px] sm:text-xs">
            <div className="text-[9px] sm:text-[10px] text-slate-500 italic">
              Computer Generated Invoice — Broilers Express
            </div>
            <div className="text-right">
              <p className="font-black text-xs sm:text-sm text-black">For - Broilers Express</p>
            </div>
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
