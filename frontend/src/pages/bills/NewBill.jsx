import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { downloadBillPDF, openBillPDF, getPublicBillPdfUrl } from '../../lib/pdfDownload';
import Header from '../../components/common/Header';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import AddCustomerModal from '../../components/common/AddCustomerModal';
import {
  Search,
  PlusCircle,
  Trash2,
  Save,
  CheckCircle2,
  FileText,
  Download,
  Printer,
  MessageSquare,
  UserPlus,
  AlertCircle,
  Copy,
  Check,
  Eye,
} from 'lucide-react';

export default function NewBill() {
  const [searchParams] = useSearchParams();
  const initialCustomerId = searchParams.get('customerId') || '';
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Customer search state
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);

  // Bill metadata
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [previousDue, setPreviousDue] = useState('0');
  const [paidAmount, setPaidAmount] = useState('0');

  // Items state (starts with 1 item, quantity has placeholder "1" rather than pre-filling)
  const [items, setItems] = useState([
    { productName: 'Broiler Chicken', quantity: '', weight: '', rate: '' },
  ]);

  // Submission & Modal state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [generatedBillResult, setGeneratedBillResult] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Fetch customer list for search
  const { data: customerData, isLoading: loadingCustomers } = useQuery({
    queryKey: ['customersSearch', customerSearch],
    queryFn: async () => {
      const res = await api.get('/customers', {
        params: { search: customerSearch, status: 'active', limit: 20 },
      });
      return res.data;
    },
  });

  // Ref for closing customer search dropdown on outside click
  const customerDropdownRef = React.useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(e.target)) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load initial customer if provided via URL
  useEffect(() => {
    if (initialCustomerId) {
      const loadCustomer = async () => {
        try {
          const res = await api.get(`/customers/${initialCustomerId}`);
          if (res.data?.customer) {
            setSelectedCustomer(res.data.customer);
            if (res.data.customer.currentDue !== undefined && res.data.customer.currentDue !== null) {
              setPreviousDue(String(res.data.customer.currentDue));
            }
          }
        } catch (err) {
          console.error('Failed to load initial customer:', err);
        }
      };
      loadCustomer();
    }
  }, [initialCustomerId]);

  const customerList = customerData?.customers || [];

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setErrorMsg(''); // Clear warning as customer is now selected
    if (customer.currentDue !== undefined && customer.currentDue !== null) {
      setPreviousDue(String(customer.currentDue));
    } else {
      setPreviousDue('0');
    }
    setShowCustomerDropdown(false);
    setCustomerSearch('');
  };

  const handleClearCustomer = () => {
    setSelectedCustomer(null);
    setPreviousDue('0');
    setCustomerSearch('');
  };

  // Item management helpers
  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
    if (errorMsg) setErrorMsg('');
  };

  const addItem = () => {
    setItems([
      ...items,
      { productName: 'Broiler Chicken', quantity: '', weight: '', rate: '' },
    ]);
  };

  const removeItem = (index) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // Calculations (Exact decimal-safe math)
  const calculateItemAmount = (item) => {
    const w = parseFloat(item.weight) || 0;
    const r = parseFloat(item.rate) || 0;
    return Math.round(w * r * 100) / 100;
  };

  // Financial calculations (Pure Subtotal = Grand Total, no discount or other charges)
  const subtotal = items.reduce((sum, item) => sum + calculateItemAmount(item), 0);
  const grandTotal = Math.round(subtotal * 100) / 100;
  const previousDueVal = parseFloat(previousDue) || 0;
  const paidAmountVal = parseFloat(paidAmount) || 0;
  const grossTotal = Math.round((grandTotal + previousDueVal) * 100) / 100;
  const totalAmount = Math.round((grossTotal - paidAmountVal) * 100) / 100;

  // Trigger confirmation modal after validating inputs
  const handleOpenConfirmModal = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedCustomer) {
      setErrorMsg('Please search and select a customer first.');
      return;
    }

    if (items.length === 0) {
      setErrorMsg('Please add at least one bill item.');
      return;
    }

    // Validate item values
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.productName.trim()) {
        setErrorMsg(`Item #${i + 1}: Product Name is required.`);
        return;
      }
      const qty = item.quantity === '' ? 1 : parseInt(item.quantity, 10);
      if (isNaN(qty) || qty <= 0) {
        setErrorMsg(`Item #${i + 1}: Quantity must be at least 1.`);
        return;
      }
      const weight = parseFloat(item.weight);
      if (isNaN(weight) || weight <= 0) {
        setErrorMsg(`Item #${i + 1}: Weight must be greater than 0.`);
        return;
      }
      const rate = parseFloat(item.rate);
      if (isNaN(rate) || rate <= 0) {
        setErrorMsg(`Item #${i + 1}: Rate must be greater than 0.`);
        return;
      }
    }

    setShowConfirmModal(true);
  };

  const executeSaveBill = async () => {
    setIsSubmitting(true);

    try {
      const payload = {
        customerId: selectedCustomer.id,
        billDate,
        discount: 0,
        otherCharges: 0,
        previousDue: previousDueVal,
        paidAmount: paidAmountVal,
        items: items.map((it) => ({
          productName: it.productName.trim(),
          quantity: it.quantity === '' ? 1 : parseInt(it.quantity, 10),
          weight: parseFloat(it.weight),
          rate: parseFloat(it.rate),
        })),
      };

      const res = await api.post('/bills', payload);
      setShowConfirmModal(false);
      // api interceptor returns response.data already, so res = { success, message, data: { bill, whatsappInfo } }
      setGeneratedBillResult(res);
    } catch (err) {
      setErrorMsg(typeof err === 'string' ? err : err.message || 'Failed to save bill');
      setShowConfirmModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // PDF Download Helper
  const handleDownloadPDF = async (billId, billNumber) => {
    await downloadBillPDF(billId, billNumber);
  };

  // Print PDF Helper
  const handlePrintPDF = (billId) => {
    openBillPDF(billId);
  };

  // If Bill Generated Successfully - res = { success, message, data: { bill, whatsappInfo } }
  const billData = generatedBillResult?.data?.bill;
  const whatsappInfoData = generatedBillResult?.data?.whatsappInfo || {};

  if (billData) {
    const bill = billData;
    const whatsappInfo = whatsappInfoData;

    const grandTotal = Number(bill.grandTotal || 0);
    const previousDue = Number(bill.previousDue || 0);
    const grossTotal = grandTotal + previousDue;
    const paidAmount = Number(bill.paidAmount || 0);
    const totalAmount = grossTotal - paidAmount;

    const handleCopyBillLink = () => {
      const url = getPublicBillPdfUrl(bill.id, whatsappInfo?.pdfUrl);
      try {
        if (navigator?.clipboard?.writeText) {
          navigator.clipboard.writeText(url).catch(() => {
            fallbackCopy(url);
          });
        } else {
          fallbackCopy(url);
        }
      } catch {
        fallbackCopy(url);
      }
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    };

    const fallbackCopy = (text) => {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      try { document.execCommand('copy'); } catch (e) { console.warn(e); }
      textarea.remove();
    };

    const handleSendWhatsApp = () => {
      const pdfUrl = getPublicBillPdfUrl(bill.id, whatsappInfo.pdfUrl);
      const mobile = whatsappInfo.formattedMobile || '';
      const msg = `Hello ${bill.customer.customerName},\n\nYour bill from Broilers Express is ready.\n\n*Bill No:* #${bill.billNumber}\n*Date:* ${new Date(bill.billDate).toLocaleDateString('en-IN')}\n*Bill Total:* ₹${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n*Total Amount:* ₹${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n\n📄 *Download / View Official PDF Invoice:*\n${pdfUrl}\n\nThank you!\n*Broilers Express*\nMotton Market, Jaysingpur`;
      window.open(`https://wa.me/${mobile}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
    };

    return (
      <div className="space-y-3 max-w-5xl mx-auto animate-in fade-in zoom-in-95 duration-200">
        <Header title="Bill Generated Successfully" />

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
          {/* LEFT: Realistic Digital Receipt Voucher Card (md:col-span-7) */}
          <div className="md:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden relative">
            {/* Top Green Accent Bar */}
            <div className="h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600"></div>

            <div className="p-4 sm:p-5 space-y-3">
              {/* Receipt Brand Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                    <img
                      src="/chicken_logo.jpg"
                      alt="Logo"
                      className="w-full h-full object-contain"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-slate-900 tracking-wide uppercase">
                      Broilers Express
                    </h3>
                    <p className="text-[10px] text-slate-500 font-medium">Mutton Market, Jaysingpur</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-mono text-sm font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 block">
                    #{bill.billNumber}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
                    {new Date(bill.billDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>

              {/* Customer Strip */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Customer</span>
                  <div className="font-black text-slate-900 text-xs sm:text-sm">
                    {bill.customer?.customerName} {bill.customer?.businessName ? `(${bill.customer.businessName})` : ''}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    ID: {bill.customer?.customerCode} • Mob: {bill.customer?.mobile}
                  </div>
                </div>
              </div>

              {/* Items Breakdown Table */}
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100/80 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-1.5 px-3">Item</th>
                      <th className="py-1.5 px-2 text-center">Qty</th>
                      <th className="py-1.5 px-2 text-right">Weight</th>
                      <th className="py-1.5 px-2 text-right">Rate</th>
                      <th className="py-1.5 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(bill.items && bill.items.length > 0) ? (
                      bill.items.map((it, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-1.5 px-3 font-semibold text-slate-800">{it.productName}</td>
                          <td className="py-1.5 px-2 text-center font-bold text-slate-700">{it.quantity}</td>
                          <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-700">{Number(it.weight).toFixed(3)}</td>
                          <td className="py-1.5 px-2 text-right font-mono text-slate-700">{Number(it.rate).toFixed(2)}</td>
                          <td className="py-1.5 px-3 text-right font-mono font-extrabold text-slate-900">₹{Number(it.amount).toFixed(2)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-2 px-3 text-center text-slate-400">Poultry items billed</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Financial Calculation Breakdown */}
              <div className="bg-slate-50/90 rounded-xl p-3 border border-slate-200 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600 font-medium">
                  <span>Bill Total:</span>
                  <span className="font-mono font-bold text-slate-900">₹{grandTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-amber-800 font-medium">
                  <span>Previous Bill Dues:</span>
                  <span className="font-mono font-bold">+ ₹{previousDue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-700 font-semibold border-t border-slate-200 pt-1.5">
                  <span>Gross Total:</span>
                  <span className="font-mono font-extrabold text-slate-900">₹{grossTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-emerald-800 font-medium">
                  <span>Paid Amount:</span>
                  <span className="font-mono font-bold">- ₹{paidAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t-2 border-slate-300">
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Total Balance Due:
                  </span>
                  <span className="font-mono text-xl font-black text-emerald-600">
                    ₹{totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Action & Dispatch Command Center (md:col-span-5) */}
          <div className="md:col-span-5 flex flex-col justify-between space-y-3">
            {/* Success Card Header */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm text-center relative overflow-hidden">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-2.5 shadow-2xs">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 mb-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Saved & Synced in Database
              </span>
              <h2 className="text-lg font-black text-slate-900">
                Bill #{bill.billNumber} Ready
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Official voucher issued. Share, print or download below.
              </p>
            </div>

            {/* Quick Action Hub */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-2.5">
              {/* WhatsApp Action Button */}
              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-[#25D366] to-[#20ba5a] hover:from-[#20ba5a] hover:to-[#1da851] text-white rounded-xl font-extrabold text-xs shadow-md shadow-emerald-600/20 active:scale-[0.99] transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 fill-current" />
                  </div>
                  <div className="text-left">
                    <div className="leading-tight">Send WhatsApp Invoice</div>
                    <div className="text-[10px] text-white/80 font-normal">Direct PDF link to {bill.customer?.mobile}</div>
                  </div>
                </div>
                <span className="text-xs font-bold">➔</span>
              </button>

              {/* 3 Quick Secondary Buttons */}
              <div className="grid grid-cols-3 gap-2">
                {/* Print Slip */}
                <button
                  type="button"
                  onClick={() => handlePrintPDF(bill.id)}
                  className="flex flex-col items-center justify-center p-2.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-xl font-bold text-xs transition-all cursor-pointer active:scale-95"
                  title="Print official receipt"
                >
                  <Printer className="w-4 h-4 mb-1 text-purple-600" />
                  <span>Print Slip</span>
                </button>

                {/* Download PDF */}
                <button
                  type="button"
                  onClick={() => handleDownloadPDF(bill.id, bill.billNumber)}
                  className="flex flex-col items-center justify-center p-2.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-xl font-bold text-xs transition-all cursor-pointer active:scale-95"
                  title="Download PDF Invoice"
                >
                  <Download className="w-4 h-4 mb-1 text-blue-600" />
                  <span>Download</span>
                </button>

                {/* View Bill */}
                <Link
                  to={`/bills/${bill.id}`}
                  className="flex flex-col items-center justify-center p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl font-bold text-xs transition-all cursor-pointer active:scale-95"
                  title="Open on-screen bill"
                >
                  <Eye className="w-4 h-4 mb-1 text-slate-600" />
                  <span>View Bill</span>
                </Link>
              </div>

              {/* Copy Link Option */}
              <button
                type="button"
                onClick={handleCopyBillLink}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-bold">Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Copy Public Invoice Link</span>
                  </>
                )}
              </button>
            </div>

            {/* Create Next Bill Action */}
            <button
              type="button"
              onClick={() => {
                setGeneratedBillResult(null);
                setSelectedCustomer(null);
                setItems([{ productName: 'Broiler Chicken', quantity: '', weight: '', rate: '' }]);
                setPreviousDue('0');
                setPaidAmount('0');
              }}
              className="w-full flex items-center justify-center gap-2 py-3 px-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-700/20 active:scale-[0.99] transition-all cursor-pointer"
            >
              <PlusCircle className="w-5 h-5" />
              <span>+ Create Another Bill</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <Header title="Create New Bill" />

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between gap-3 animate-in fade-in duration-150">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <p className="text-xs sm:text-sm text-red-700 font-semibold">{errorMsg}</p>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg('')}
            className="text-red-400 hover:text-red-700 font-bold text-xs p-1 rounded transition-colors cursor-pointer"
            title="Dismiss warning"
          >
            ✕
          </button>
        </div>
      )}

      <form onSubmit={handleOpenConfirmModal} className="space-y-4">
        {/* TOP ROW: GRID OF 2 (1. Customer Selection, 2. Bill Items) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          
          {/* 1. Customer Selection (lg:col-span-5) */}
          <div className="lg:col-span-5 bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div>
                <h3 className="text-sm font-bold text-slate-800 leading-tight">1. Customer Selection</h3>
                <p className="text-xs text-slate-400">Search client or register new</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCustomerModal(true)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Add Customer</span>
              </button>
            </div>

            {selectedCustomer ? (
              <div className="bg-gradient-to-r from-emerald-50/80 to-teal-50/50 border border-emerald-200/80 rounded-xl p-3.5 flex items-center justify-between shadow-2xs">
                <div className="min-w-0 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded">
                      {selectedCustomer.customerCode}
                    </span>
                    <h4 className="text-sm font-extrabold text-slate-900 truncate">
                      {selectedCustomer.customerName}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-600 font-medium truncate mt-1">
                    {selectedCustomer.businessName ? `${selectedCustomer.businessName} • ` : ''}Mob: {selectedCustomer.mobile}
                  </p>
                  {selectedCustomer.currentDue > 0 && (
                    <p className="text-xs font-bold text-amber-700 mt-1">
                      Recorded Due: ₹{Number(selectedCustomer.currentDue).toFixed(2)}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleClearCustomer}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-white hover:bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 shadow-2xs transition-colors shrink-0 cursor-pointer"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="relative" ref={customerDropdownRef}>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  SEARCH CUSTOMER <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={customerSearch}
                    onFocus={() => setShowCustomerDropdown(true)}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setShowCustomerDropdown(true);
                    }}
                    placeholder="Search by name, mobile or code..."
                    className="w-full pl-9 pr-8 py-2 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                  />
                  {customerSearch && (
                    <button
                      type="button"
                      onClick={() => setCustomerSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Dropdown list */}
                {showCustomerDropdown && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100">
                    {loadingCustomers ? (
                      <div className="p-3 text-xs text-slate-500 text-center">Loading customers...</div>
                    ) : customerList.length === 0 ? (
                      <div className="p-3.5 text-center">
                        <p className="text-xs text-slate-500 mb-2">No matching customer found.</p>
                        <button
                          type="button"
                          onClick={() => {
                            setShowCustomerDropdown(false);
                            setShowAddCustomerModal(true);
                          }}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-800 hover:underline cursor-pointer"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Create customer {customerSearch ? `"${customerSearch}"` : ''}</span>
                        </button>
                      </div>
                    ) : (
                      customerList.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => handleSelectCustomer(c)}
                          className="p-3 hover:bg-slate-50 cursor-pointer flex items-center justify-between"
                        >
                          <div>
                            <div className="text-xs sm:text-sm font-bold text-slate-800">
                              {c.customerName} <span className="text-slate-400 font-normal">({c.businessName})</span>
                            </div>
                            <div className="text-xs text-slate-500">Mobile: {c.mobile}</div>
                          </div>
                          <div className="text-right">
                            <span className="font-mono text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                              {c.customerCode}
                            </span>
                            {c.currentDue > 0 && (
                              <div className="text-xs font-semibold text-amber-700 font-mono mt-0.5">
                                Due: ₹{Number(c.currentDue).toFixed(2)}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Date Picker */}
            <div className="flex items-center justify-between gap-3 bg-slate-50/80 px-3.5 py-2 rounded-xl border border-slate-200/80">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">BILL DATE</span>
              <input
                type="date"
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
                className="px-3 py-1 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              />
            </div>
          </div>

          {/* 2. Bill Items (lg:col-span-7) */}
          <div className="lg:col-span-7 bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div>
                <h3 className="text-sm font-bold text-slate-800 leading-tight">2. Bill Items</h3>
                <p className="text-xs text-slate-400">Qty × Weight × Rate = Amount</p>
              </div>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ Add Item</span>
              </button>
            </div>

            <div className="max-h-[175px] overflow-y-auto space-y-2 pr-1">
              {items.map((item, index) => {
                const itemAmt = calculateItemAmount(item);
                return (
                  <div
                    key={index}
                    className="grid grid-cols-12 gap-2 items-center p-2.5 sm:p-3 bg-slate-50/80 hover:bg-slate-50 rounded-xl border border-slate-200/70 transition-all text-xs"
                  >
                    <div className="col-span-4">
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Product</label>
                      <input
                        type="text"
                        value={item.productName}
                        onChange={(e) => handleItemChange(index, 'productName', e.target.value)}
                        placeholder="Product description"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Qty</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        placeholder="1"
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold text-center"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Weight (KG)</label>
                      <input
                        type="number"
                        step="0.001"
                        value={item.weight}
                        onChange={(e) => handleItemChange(index, 'weight', e.target.value)}
                        placeholder="e.g. 50"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold font-mono"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Rate (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.rate}
                        onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                        placeholder="e.g. 100"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold font-mono"
                      />
                    </div>

                    <div className="col-span-2 flex items-center justify-between pl-1 pt-3.5">
                      <div>
                        <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Amount</span>
                        <div className="text-xs sm:text-sm font-black text-slate-900 font-mono">
                          ₹{itemAmt.toFixed(2)}
                        </div>
                      </div>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors ml-1 cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION: CALCULATION SUMMARY & SUBMIT */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          {/* Left: Due/Paid Inputs (lg:col-span-7) */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            {/* Dues & Paid Input Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200/80">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-amber-900 uppercase tracking-wider">
                    Previous Bill Dues (₹)
                  </label>
                  <span className="text-[10px] text-amber-700 font-medium">Past balance</span>
                </div>
                <input
                  type="number"
                  step="0.01"
                  value={previousDue}
                  onChange={(e) => setPreviousDue(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30 bg-white font-extrabold font-mono"
                />
              </div>
              <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200/80">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-emerald-900 uppercase tracking-wider">
                    Paid Amount (₹)
                  </label>
                  <span className="text-[10px] text-emerald-700 font-medium">Amount received</span>
                </div>
                <input
                  type="number"
                  step="0.01"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-emerald-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 bg-white font-extrabold font-mono"
                />
              </div>
            </div>
          </div>

          {/* Right: Signature Dark Receipt Card & Save Button (lg:col-span-5) */}
          <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white p-4 sm:p-5 rounded-2xl shadow-xl flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-300 pt-1">
                <span>Bill Total:</span>
                <span className="font-extrabold text-slate-100 font-mono">₹{grandTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-amber-300">
                <span>Previous Bill Dues:</span>
                <span className="font-extrabold font-mono">+ ₹{previousDueVal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-200 border-t border-slate-800 pt-1.5">
                <span>Gross Total:</span>
                <span className="font-extrabold font-mono">₹{grossTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-emerald-300">
                <span>Paid Amt:</span>
                <span className="font-extrabold font-mono">- ₹{paidAmountVal.toFixed(2)}</span>
              </div>
              <div className="border-t border-slate-700/80 pt-2 flex justify-between items-center">
                <span className="text-xs uppercase tracking-wider text-slate-300 font-black">TOTAL AMOUNT:</span>
                <span className="text-2xl text-emerald-400 font-mono font-black">₹{totalAmount.toFixed(2)}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.99] text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-950/40 transition-all disabled:opacity-50 mt-3 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving Bill...' : 'Save & Generate Bill'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Confirmation Modal */}
      {showConfirmModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2 text-slate-800 font-extrabold text-base">
                <AlertCircle className="w-5 h-5 text-emerald-600" />
                <span>Confirm Bill Generation</span>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1">
              <p className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Customer Details</p>
              <p className="text-slate-900 font-extrabold text-sm">{selectedCustomer.customerName}</p>
              <p className="text-slate-700 font-semibold">{selectedCustomer.businessName}</p>
              <p className="text-slate-500">ID: {selectedCustomer.customerCode} | Mobile: {selectedCustomer.mobile}</p>
            </div>

            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Bill Items ({items.length})</p>
              {items.map((it, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs py-1 border-b border-slate-100">
                  <span className="font-semibold text-slate-800">{it.productName} (x{it.quantity})</span>
                  <span className="text-slate-600">{it.weight} KG × ₹{it.rate} = <strong className="text-slate-900">₹{calculateItemAmount(it).toFixed(2)}</strong></span>
                </div>
              ))}
            </div>

            {/* Modal Summary Breakdown */}
            <div className="bg-slate-900 text-white rounded-xl p-4 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Bill Total:</span>
                <span className="font-bold text-slate-100">₹{grandTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-amber-300">
                <span>Previous Bill Dues:</span>
                <span className="font-bold">+ ₹{previousDueVal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-300 border-t border-slate-800 pt-1">
                <span>Gross Total:</span>
                <span className="font-bold">₹{grossTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-emerald-300">
                <span>Paid Amt:</span>
                <span className="font-bold">- ₹{paidAmountVal.toFixed(2)}</span>
              </div>
              <div className="border-t border-slate-700 pt-2 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Amount</p>
                  <p className="text-2xl font-extrabold text-emerald-400">₹{totalAmount.toFixed(2)}</p>
                </div>
                <span className="text-xs text-slate-300 font-semibold bg-slate-800 px-3 py-1 rounded-full">
                  Date: {new Date(billDate).toLocaleDateString('en-IN')}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
                className="px-4 py-2.5 border border-slate-300 text-slate-700 font-semibold text-xs rounded-lg hover:bg-slate-50"
              >
                Edit / Cancel
              </button>
              <button
                type="button"
                onClick={executeSaveBill}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-lg shadow-md transition-colors disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Generating Bill...</span>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Confirm & Save Bill</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Customer Modal */}
      <AddCustomerModal
        isOpen={showAddCustomerModal}
        onClose={() => setShowAddCustomerModal(false)}
        initialQuery={customerSearch}
        onCustomerCreated={(newCust) => {
          handleSelectCustomer(newCust);
          queryClient.invalidateQueries({ queryKey: ['customersSearch'] });
        }}
      />
    </div>
  );
}
