import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
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
  const [discount, setDiscount] = useState('0');
  const [otherCharges, setOtherCharges] = useState('0');
  const [previousDue, setPreviousDue] = useState('0');
  const [paidAmount, setPaidAmount] = useState('0');

  // Items state (starts with 1 item pre-filled)
  const [items, setItems] = useState([
    { productName: 'Broiler Chicken', quantity: '1', weight: '', rate: '' },
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
  };

  const addItem = () => {
    setItems([
      ...items,
      { productName: 'Broiler Chicken', quantity: '1', weight: '', rate: '' },
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

  const subtotal = items.reduce((sum, item) => sum + calculateItemAmount(item), 0);
  const discountVal = parseFloat(discount) || 0;
  const otherChargesVal = parseFloat(otherCharges) || 0;
  const grandTotal = Math.round((subtotal - discountVal + otherChargesVal) * 100) / 100;
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
      const qty = parseInt(item.quantity, 10);
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
        discount: discountVal,
        otherCharges: otherChargesVal,
        previousDue: previousDueVal,
        paidAmount: paidAmountVal,
        items: items.map((it) => ({
          productName: it.productName.trim(),
          quantity: parseInt(it.quantity, 10),
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
    try {
      const response = await fetch(`/api/bills/${billId}/pdf`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Bill_${billNumber}_BroilersExpress.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert('Failed to download PDF');
    }
  };

  // Print PDF Helper
  const handlePrintPDF = (billId) => {
    const token = localStorage.getItem('token');
    const printWindow = window.open(`/api/bills/${billId}/pdf?token=${token}`, '_blank');
    if (printWindow) {
      printWindow.focus();
    }
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
      const url = `${window.location.origin}/bills/${bill.id}`;
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    };

    const handleSendWhatsApp = () => {
      const pdfUrl = whatsappInfo.pdfUrl || `${window.location.origin}/api/bills/public/${bill.id}/pdf`;
      const mobile = whatsappInfo.formattedMobile || '';
      const msg = `Hello ${bill.customer.customerName},\n\nYour bill from Broilers Express is ready.\n\n*Bill No:* #${bill.billNumber}\n*Date:* ${new Date(bill.billDate).toLocaleDateString('en-IN')}\n*Bill Total:* ₹${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n*Total Amount:* ₹${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n\n📄 *Download / View Official PDF Invoice:*\n${pdfUrl}\n\nThank you!\n*Broilers Express*\nMotton Market, Jaysingpur`;
      window.open(`https://wa.me/${mobile}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
    };

    return (
      <div className="space-y-6 max-w-3xl mx-auto animate-in fade-in zoom-in-95 duration-200">
        <Header title="Bill Generated Successfully" />

        <div className="bg-white rounded-3xl p-8 border border-slate-200/90 shadow-xl text-center relative overflow-hidden">
          {/* Top Decorative Ambient Bar */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600"></div>

          {/* Success Animated Icon */}
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Transaction Saved in Database
          </span>

          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Bill #{bill.billNumber} Generated
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Official poultry voucher issued & recorded in PostgreSQL.
          </p>

          {/* Receipt Breakdown Card */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-6 my-6 text-left space-y-3.5 shadow-xs">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bill Number</span>
              <span className="font-mono text-xl font-black text-blue-600">#{bill.billNumber}</span>
            </div>

            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Customer</span>
              <span className="text-sm font-extrabold text-slate-800">
                {bill.customer.customerName} {bill.customer.businessName ? `(${bill.customer.businessName})` : ''}
              </span>
            </div>

            <div className="flex justify-between items-center border-b border-slate-200 pb-3 text-xs">
              <span className="font-bold text-slate-500 uppercase tracking-wider">Date</span>
              <span className="font-semibold text-slate-700">
                {new Date(bill.billDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            </div>

            <div className="space-y-2 pt-1 text-xs">
              <div className="flex justify-between items-center text-slate-700">
                <span className="font-semibold">Bill Total:</span>
                <span className="font-mono font-bold text-slate-900">₹{grandTotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center text-amber-800">
                <span className="font-semibold">Previous Bill Dues:</span>
                <span className="font-mono font-bold">+ ₹{previousDue.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center text-slate-700 border-t border-slate-200 pt-2">
                <span className="font-semibold">Gross Total:</span>
                <span className="font-mono font-bold text-slate-900">₹{grossTotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center text-emerald-800">
                <span className="font-semibold">Paid Amount:</span>
                <span className="font-mono font-bold">- ₹{paidAmount.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t-2 border-slate-300">
              <span className="text-sm font-black text-slate-900 uppercase tracking-wider">Total Balance / Outstanding</span>
              <span className="font-mono text-2xl font-black text-emerald-600">
                ₹{totalAmount.toFixed(2)}
              </span>
            </div>
          </div>

          {/* 4 Distinct, Purposeful Action Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* 1. View On-Screen Bill */}
            <Link
              to={`/bills/${bill.id}`}
              className="inline-flex items-center justify-center gap-2 px-3 py-3 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-all shadow-xs hover:-translate-y-0.5"
            >
              <Eye className="w-4 h-4 text-slate-300" />
              <span>View Bill</span>
            </Link>

            {/* 2. Download Official PDF */}
            <button
              type="button"
              onClick={() => handleDownloadPDF(bill.id, bill.billNumber)}
              className="inline-flex items-center justify-center gap-2 px-3 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs hover:-translate-y-0.5"
            >
              <Download className="w-4 h-4 text-blue-200" />
              <span>Download PDF</span>
            </button>

            {/* 3. Send Official WhatsApp Invoice (SINGLE BUTTON, NO DUPLICATE) */}
            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="inline-flex items-center justify-center gap-2 px-3 py-3 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-xl text-xs font-bold transition-all shadow-xs hover:-translate-y-0.5"
            >
              <MessageSquare className="w-4 h-4 fill-current" />
              <span>WhatsApp</span>
            </button>

            {/* 4. Print Receipt */}
            <button
              type="button"
              onClick={() => handlePrintPDF(bill.id)}
              className="inline-flex items-center justify-center gap-2 px-3 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs hover:-translate-y-0.5"
            >
              <Printer className="w-4 h-4 text-purple-200" />
              <span>Print Slip</span>
            </button>
          </div>

          {/* Copy Public Link Quick Option */}
          <div className="mt-4 flex items-center justify-center">
            <button
              type="button"
              onClick={handleCopyBillLink}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg transition-colors"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">Link Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copy Public Bill Link</span>
                </>
              )}
            </button>
          </div>

          {/* Create Next Bill Action */}
          <div className="mt-8 pt-6 border-t border-slate-200/80">
            <button
              type="button"
              onClick={() => {
                setGeneratedBillResult(null);
                setSelectedCustomer(null);
                setItems([{ productName: 'Broiler Chicken', quantity: '1', weight: '', rate: '' }]);
                setDiscount('0');
                setOtherCharges('0');
                setPreviousDue('0');
                setPaidAmount('0');
              }}
              className="inline-flex items-center gap-2.5 px-8 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-700/20 hover:shadow-emerald-700/30 transition-all hover:-translate-y-0.5"
            >
              <PlusCircle className="w-5 h-5" />
              <span>Create Another Bill</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <Header title="Create New Bill" />

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 font-semibold">{errorMsg}</p>
        </div>
      )}

      <form onSubmit={handleOpenConfirmModal} className="space-y-6">
        {/* TOP ROW: GRID OF 2 (1. Customer Selection, 2. Bill Items) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* 1. Customer Selection (lg:col-span-5) */}
          <div className="lg:col-span-5 bg-white rounded-xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">1. Customer Selection</h3>
                <p className="text-xs text-slate-500">Search and select client for this bill</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCustomerModal(true)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-md transition-colors cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Add New Customer</span>
              </button>
            </div>

            {selectedCustomer ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <span className="font-mono font-bold text-xs bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded">
                    {selectedCustomer.customerCode}
                  </span>
                  <h4 className="text-base font-extrabold text-slate-900 mt-1">
                    {selectedCustomer.customerName}
                  </h4>
                  <p className="text-xs font-semibold text-slate-600">
                    {selectedCustomer.businessName ? `${selectedCustomer.businessName} • ` : ''}Mobile: {selectedCustomer.mobile}
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
                  className="text-xs font-semibold text-red-600 hover:underline shrink-0 ml-2"
                >
                  Change Customer
                </button>
              </div>
            ) : (
              <div className="relative" ref={customerDropdownRef}>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  SEARCH CUSTOMER (ID, NAME, BUSINESS, OR MOBILE) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={customerSearch}
                    onFocus={() => setShowCustomerDropdown(true)}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setShowCustomerDropdown(true);
                    }}
                    placeholder="Type to search customers..."
                    className="w-full pl-10 pr-8 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto divide-y divide-slate-100">
                    {loadingCustomers ? (
                      <div className="p-3 text-xs text-slate-500 text-center">Loading customers...</div>
                    ) : customerList.length === 0 ? (
                      <div className="p-4 text-center">
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
                            <div className="text-sm font-bold text-slate-800">
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
            <div className="pt-2">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">BILL DATE</label>
              <input
                type="date"
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* 2. Bill Items (lg:col-span-7) */}
          <div className="lg:col-span-7 bg-white rounded-xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">2. Bill Items</h3>
                <p className="text-xs text-slate-500">Calculation: Amount = Weight × Rate</p>
              </div>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs rounded-md transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Add Item</span>
              </button>
            </div>

            <div className="max-h-[320px] overflow-y-auto space-y-4 pr-1">
              {items.map((item, index) => {
                const itemAmt = calculateItemAmount(item);
                return (
                  <div
                    key={index}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end p-4 bg-slate-50 rounded-lg border border-slate-200"
                  >
                    <div className="sm:col-span-4">
                      <label className="block text-xs font-semibold text-slate-500 mb-1">
                        Product Name
                      </label>
                      <input
                        type="text"
                        value={item.productName}
                        onChange={(e) => handleItemChange(index, 'productName', e.target.value)}
                        placeholder="Product description"
                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        placeholder="Qty"
                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-500 mb-1">
                        Weight (KG)
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        value={item.weight}
                        onChange={(e) => handleItemChange(index, 'weight', e.target.value)}
                        placeholder="e.g. 63.300"
                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-500 mb-1">
                        Rate (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.rate}
                        onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                        placeholder="e.g. 122"
                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                      />
                    </div>

                    <div className="sm:col-span-1 text-right">
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Amount</label>
                      <div className="py-2 text-sm font-extrabold text-slate-800">
                        ₹{itemAmt.toFixed(2)}
                      </div>
                    </div>

                    <div className="sm:col-span-1 flex justify-end pb-2">
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="p-1.5 text-red-500 hover:bg-red-100 rounded-md transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
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
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Left: 2x2 Grid of Inputs (lg:col-span-7) */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3.5 content-between">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Discount (₹)</label>
              <input
                type="number"
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Other Charges (₹)</label>
              <input
                type="number"
                step="0.01"
                value={otherCharges}
                onChange={(e) => setOtherCharges(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              />
            </div>
            <div className="bg-amber-50/70 p-2.5 rounded-lg border border-amber-200">
              <label className="block text-[11px] font-extrabold text-amber-900 uppercase tracking-wider mb-1">
                Previous Bill Dues (₹)
              </label>
              <input
                type="number"
                step="0.01"
                value={previousDue}
                onChange={(e) => setPreviousDue(e.target.value)}
                placeholder="0.00"
                className="w-full px-2.5 py-1.5 border border-amber-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white font-semibold"
              />
              <span className="text-[10px] text-amber-700 mt-1 block font-medium">Past unpaid balance</span>
            </div>
            <div className="bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200">
              <label className="block text-[11px] font-extrabold text-emerald-900 uppercase tracking-wider mb-1">
                Paid Amount (₹)
              </label>
              <input
                type="number"
                step="0.01"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-2.5 py-1.5 border border-emerald-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-semibold"
              />
              <span className="text-[10px] text-emerald-700 mt-1 block font-medium">Payment received now</span>
            </div>
          </div>

          {/* Right: Signature Dark Receipt Card & Save Button (lg:col-span-5) */}
          <div className="lg:col-span-5 bg-slate-900 text-white p-4 sm:p-5 rounded-xl space-y-2 flex flex-col justify-between shadow-lg">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Subtotal:</span>
                <span className="font-semibold font-mono">₹{subtotal.toFixed(2)}</span>
              </div>
              {discountVal > 0 && (
                <div className="flex justify-between text-xs text-red-400">
                  <span>Discount:</span>
                  <span className="font-mono">- ₹{discountVal.toFixed(2)}</span>
                </div>
              )}
              {otherChargesVal > 0 && (
                <div className="flex justify-between text-xs text-slate-300">
                  <span>Other Charges:</span>
                  <span className="font-mono">+ ₹{otherChargesVal.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs text-slate-300 border-t border-slate-800 pt-1.5">
                <span>Bill Total:</span>
                <span className="font-bold text-slate-100 font-mono">₹{grandTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-amber-300">
                <span>Previous Bill Dues:</span>
                <span className="font-bold font-mono">+ ₹{previousDueVal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-200 border-t border-slate-800 pt-1">
                <span>Gross Total:</span>
                <span className="font-bold font-mono">₹{grossTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-emerald-300">
                <span>Paid Amt:</span>
                <span className="font-bold font-mono">- ₹{paidAmountVal.toFixed(2)}</span>
              </div>
              <div className="border-t border-slate-700 pt-2 flex justify-between items-center text-lg font-extrabold">
                <span className="text-xs uppercase tracking-wider text-slate-300 font-bold">TOTAL AMOUNT:</span>
                <span className="text-2xl text-emerald-400 font-mono font-black">₹{totalAmount.toFixed(2)}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-extrabold text-sm rounded-lg shadow-md hover:shadow-emerald-900/40 transition-all disabled:opacity-50 mt-2"
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
