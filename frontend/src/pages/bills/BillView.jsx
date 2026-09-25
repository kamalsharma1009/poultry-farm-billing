import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import Header from '../../components/common/Header';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { ArrowLeft, Download, Printer, MessageSquare, AlertOctagon, Copy, Check } from 'lucide-react';

export default function BillView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [copiedLink, setCopiedLink] = useState(false);

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

  const bill = data?.bill || data?.data?.bill;
  const whatsappInfo = data?.whatsappInfo || data?.data?.whatsappInfo || {};

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
      const response = await fetch(`/api/bills/${bill.id}/pdf`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed');
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
      alert('Failed to download PDF. Please try again.');
    }
  };

  const handlePrintPDF = async () => {
    try {
      const response = await fetch(`/api/bills/${bill.id}/pdf`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.focus();
      }
    } catch (err) {
      alert('Failed to open PDF for printing.');
    }
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
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3">
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

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Download PDF */}
          <button
            onClick={handleDownloadPDF}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs hover:-translate-y-0.5"
          >
            <Download className="w-4 h-4 text-blue-100" />
            <span>Download PDF</span>
          </button>

          {/* Print */}
          <button
            onClick={handlePrintPDF}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs hover:-translate-y-0.5"
          >
            <Printer className="w-4 h-4 text-purple-100" />
            <span>Print</span>
          </button>

          {/* Single WhatsApp Button (No duplicates!) */}
          {(whatsappInfo.formattedMobile || bill.customer?.mobile) && (
            <button
              onClick={handleSharePDFWhatsApp}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold text-xs rounded-xl transition-all shadow-xs hover:-translate-y-0.5"
            >
              <MessageSquare className="w-4 h-4 fill-current" />
              <span>WhatsApp</span>
            </button>
          )}

          {/* Copy Bill Link */}
          <button
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors border border-slate-300"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-bold">Link Copied!</span>
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
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-semibold text-xs rounded-xl transition-colors"
            >
              <AlertOctagon className="w-4 h-4" />
              <span>Cancel</span>
            </button>
          )}
        </div>
      </div>

      {/* Bill Visual View Container - Styled exactly like the Reference Physical Bill */}
      <div className="w-full overflow-x-auto pb-6 pt-1">
        <div className="min-w-[560px] max-w-2xl mx-auto bg-white rounded-xl border-2 border-black p-4 sm:p-6 shadow-xl font-sans text-black">
        {/* Bill Slip Header with Chicken Logo & Details */}
        <div className="flex items-center gap-4 pb-3 border-b-2 border-black">
          <div className="shrink-0">
            <img
              src="/chicken_logo.jpg"
              alt="Broilers Express"
              className="w-24 h-20 object-contain rounded-md"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
          <div className="grow text-center pr-12">
            <h1 className="text-2xl sm:text-3xl font-black tracking-wide text-black uppercase leading-tight">
              BROILERS EXPRESS
            </h1>
            <p className="text-xs sm:text-sm font-extrabold text-slate-800 tracking-wider mt-1">
              Motton Market , Jaysingpur
            </p>
            <p className="text-xs font-bold text-black mt-0.5">
              Mbl -: 9326155311 To 14
            </p>
            <p className="text-xs font-bold text-black">
              Javed Bhai : 9326155315
            </p>
          </div>
        </div>

        {/* Wholesale & Retail Dealers Banner */}
        <div className="text-center font-black italic text-sm tracking-wider py-1.5 border-b-2 border-black bg-slate-50">
          Wholesale &amp; Retail Dealers
        </div>

        {/* Bill Metadata Row */}
        <div className="flex justify-between items-center px-4 py-2 border-b-2 border-black text-xs font-bold bg-white">
          <div>
            Bill No : <span className="font-black text-blue-900 text-sm">{bill.billNumber}</span>
          </div>
          <div>
            Cust ID : <span className="font-black text-emerald-900 text-sm">{bill.customer.customerCode}</span>
          </div>
          <div>
            Date : <span className="font-black text-slate-900 text-sm">{new Date(bill.billDate).toLocaleDateString('en-IN')}</span>
          </div>
        </div>

        {/* Customer Name Row */}
        <div className="px-4 py-2.5 border-b-2 border-black text-xs font-extrabold uppercase">
          Name : <span className="text-sm font-black text-black">{bill.customer.businessName || bill.customer.customerName}</span>
          {bill.customer.businessName && bill.customer.businessName !== bill.customer.customerName && (
            <span className="text-slate-600 font-semibold normal-case ml-2 text-xs">({bill.customer.customerName})</span>
          )}
        </div>

        {/* Items Table Container (Continuous Column Look) */}
        <div className="border-b-2 border-black min-h-[220px] flex flex-col justify-between">
          <table className="w-full text-xs border-collapse table-fixed">
            <thead>
              <tr className="border-b-2 border-black bg-slate-100 font-black text-black">
                <th className="py-2.5 px-3 text-center border-r-2 border-black w-[18%]">Qty</th>
                <th className="py-2.5 px-3 text-center border-r-2 border-black w-[32%]">Weight</th>
                <th className="py-2.5 px-3 text-center border-r-2 border-black w-[22%]">Rate</th>
                <th className="py-2.5 px-3 text-right w-[28%]">Amount</th>
              </tr>
            </thead>
            <tbody>
              {bill.items.map((item, idx) => (
                <tr key={item.id || idx}>
                  <td className="py-2 px-3 text-center border-r-2 border-black font-extrabold font-mono text-sm">{item.quantity}</td>
                  <td className="py-2 px-3 text-center border-r-2 border-black font-extrabold font-mono text-sm">{Number(item.weight).toFixed(3)}</td>
                  <td className="py-2 px-3 text-center border-r-2 border-black font-extrabold font-mono text-sm">{Number(item.rate).toFixed(2)}</td>
                  <td className="py-2 px-3 text-right font-black font-mono text-sm text-black">{fmt(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Blank column extender fill to match physical bill book receipt */}
          <div className="flex w-full grow min-h-[90px]">
            <div className="border-r-2 border-black w-[18%]"></div>
            <div className="border-r-2 border-black w-[32%]"></div>
            <div className="border-r-2 border-black w-[22%]"></div>
            <div className="w-[28%]"></div>
          </div>
        </div>

        {/* Summary Breakdown (3-Tier Exact Match) */}
        <div className="border-b-2 border-black">
          {/* Tier 1: Bill Total & Previous Dues */}
          <div className="py-2 px-4 space-y-1">
            <div className="flex justify-end items-center gap-4 text-xs">
              <span className="font-extrabold text-black w-44 text-right">Bill Total :</span>
              <span className="font-mono font-black text-sm text-black w-32 text-right">{fmt(grandTotal)}</span>
            </div>
            <div className="flex justify-end items-center gap-4 text-xs">
              <span className="font-extrabold text-black w-44 text-right">Previous Bill Dues :</span>
              <span className="font-mono font-black text-sm text-amber-900 w-32 text-right">{fmt(previousDue)}</span>
            </div>
          </div>

          {/* Tier 2: Gross Total & Paid Amt */}
          <div className="py-2 px-4 space-y-1 border-t-2 border-black">
            <div className="flex justify-end items-center gap-4 text-xs">
              <span className="font-black text-black w-44 text-right">Gross Total :</span>
              <span className="font-mono font-black text-sm text-black w-32 text-right">{fmt(grossTotal)}</span>
            </div>
            <div className="flex justify-end items-center gap-4 text-xs">
              <span className="font-extrabold text-black w-44 text-right">Paid Amt :</span>
              <span className="font-mono font-black text-sm text-emerald-800 w-32 text-right">{fmt(paidAmount)}</span>
            </div>
          </div>

          {/* Tier 3: Total Amount */}
          <div className="py-2.5 px-4 border-t-2 border-black bg-slate-50">
            <div className="flex justify-end items-center gap-4 text-sm">
              <span className="font-black text-black w-44 text-right text-base">Total Amount :</span>
              <span className="font-mono font-black text-lg text-black w-32 text-right">₹{fmt(totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 flex justify-between items-end text-xs">
          <div className="text-[10px] text-slate-500 italic">
            Computer Generated Invoice — Broilers Express
          </div>
          <div className="text-right">
            <p className="font-black text-sm text-black">For - Broilers Express</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);
}
