import React, { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import Header from '../../components/common/Header';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import {
  ArrowLeft,
  Edit,
  FilePlus,
  Eye,
  Phone,
  MapPin,
  Building,
  Hash,
  Trash2,
  AlertTriangle,
  Scale,
  Calendar,
  TrendingUp,
  Package,
  Layers,
  ChevronRight,
  Filter,
  X,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';

export default function CustomerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedMonthFilter, setSelectedMonthFilter] = useState('all');

  const { data, isLoading, error } = useQuery({
    queryKey: ['customer', id],
    queryFn: async () => {
      const res = await api.get(`/customers/${id}`);
      return res.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return api.delete(`/customers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['customers']);
      navigate('/customers');
    },
    onError: (err) => {
      alert(err.message || 'Failed to delete customer');
    },
  });

  const customer = data?.customer;
  const purchaseStats = data?.purchaseStats || {
    totalWeightAllTime: 0,
    totalQuantityAllTime: 0,
    totalSpentAllTime: 0,
    validBillsCount: 0,
    currentMonthWeight: 0,
    currentMonthAmount: 0,
    avgMonthlyWeight: 0,
    monthlyStats: [],
  };

  const allBills = customer?.bills || [];

  // Filter bills by selected month if user clicked on a specific month
  const filteredBills = useMemo(() => {
    if (selectedMonthFilter === 'all') return allBills;
    return allBills.filter((b) => {
      const bDate = new Date(b.billDate || b.createdAt);
      const mKey = `${bDate.getFullYear()}-${String(bDate.getMonth() + 1).padStart(2, '0')}`;
      return mKey === selectedMonthFilter;
    });
  }, [allBills, selectedMonthFilter]);

  // Chart data (sorted chronologically for the bar chart)
  const chartData = useMemo(() => {
    const list = [...(purchaseStats.monthlyStats || [])];
    return list.reverse().map((m) => ({
      name: m.shortMonth,
      monthKey: m.monthKey,
      weight: m.totalWeight,
      amount: m.totalAmount,
      quantity: m.totalQuantity,
      billsCount: m.billsCount,
    }));
  }, [purchaseStats.monthlyStats]);

  if (isLoading) return <LoadingSpinner fullScreen label="Loading customer profile..." />;
  if (error || !customer) {
    return (
      <div className="space-y-6">
        <Header title="Customer Profile" />
        <EmptyState title="Customer Not Found" description="The requested customer could not be found." />
      </div>
    );
  }

  const fmtCurrency = (val) =>
    Number(val || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const fmtWeight = (val) =>
    Number(val || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    });

  return (
    <div className="space-y-6">
      <Header
        title={`Customer Profile: ${customer.customerName}`}
        backTo="/customers"
      />

      {/* Customer Info Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono font-extrabold text-sm px-3 py-1 bg-emerald-100 text-emerald-800 rounded-lg">
                {customer.customerCode}
              </span>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  customer.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {customer.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">{customer.customerName}</h2>
            <p className="text-sm font-semibold text-slate-500">{customer.businessName}</p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              to={`/customers/${customer.id}/edit`}
              className="inline-flex items-center gap-2 px-3.5 py-2 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <Edit className="w-4 h-4" />
              <span>Edit</span>
            </Link>
            <Link
              to={`/bills/new?customerId=${customer.id}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
            >
              <FilePlus className="w-4 h-4" />
              <span>Create Bill</span>
            </Link>
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-rose-200 text-rose-600 hover:bg-rose-50 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </button>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-5 text-sm">
          <div className="flex items-start gap-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
            <Phone className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Mobile Number</p>
              <p className="font-extrabold text-slate-900 mt-0.5">{customer.mobile}</p>
              {customer.alternateMobile && (
                <p className="text-xs text-slate-500 font-medium mt-0.5">Alt: {customer.alternateMobile}</p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
            <MapPin className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Address</p>
              <p className="font-semibold text-slate-800 mt-0.5">{customer.address || 'Not specified'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
            <Building className="w-5 h-5 text-purple-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">GST Number</p>
              <p className="font-mono font-bold text-slate-900 mt-0.5">{customer.gstNumber || 'Unregistered'}</p>
            </div>
          </div>
        </div>

        {/* Outstanding Dues Banner */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 p-4 bg-gradient-to-r from-amber-50/90 via-orange-50/70 to-amber-50/90 border border-amber-200/80 rounded-xl">
          <div>
            <p className="text-xs font-bold text-amber-900 uppercase tracking-wider">Current Outstanding Balance</p>
            <p className="text-2xl sm:text-3xl font-mono font-black text-amber-950 mt-0.5">
              ₹{fmtCurrency(customer.currentDue)}
            </p>
          </div>
          <Link
            to={`/bills/new?customerId=${customer.id}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            <FilePlus className="w-3.5 h-3.5" />
            <span>Generate Bill with this Due</span>
          </Link>
        </div>
      </div>

      {/* 4 MONTHLY PURCHASE & WEIGHT SUMMARY METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Lifetime Weight */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Weight Purchased
              </span>
              <h3 className="text-2xl font-black text-slate-900 font-mono mt-1 tracking-tight">
                {fmtWeight(purchaseStats.totalWeightAllTime)}{' '}
                <span className="text-sm font-extrabold text-emerald-600">KG</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Across {purchaseStats.validBillsCount} completed bill(s)
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <Scale className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Metric 2: This Month's Weight */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  This Month's Weight
                </span>
                <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded">
                  Current
                </span>
              </div>
              <h3 className="text-2xl font-black text-slate-900 font-mono mt-1 tracking-tight">
                {fmtWeight(purchaseStats.currentMonthWeight)}{' '}
                <span className="text-sm font-extrabold text-blue-600">KG</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1 font-mono">
                Billed: ₹{fmtCurrency(purchaseStats.currentMonthAmount)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <Calendar className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Metric 3: Monthly Average Weight */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-violet-600"></div>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Average Monthly Weight
              </span>
              <h3 className="text-2xl font-black text-slate-900 font-mono mt-1 tracking-tight">
                {fmtWeight(purchaseStats.avgMonthlyWeight)}{' '}
                <span className="text-sm font-extrabold text-purple-600">KG/mo</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Active in {purchaseStats.monthlyStats.length || 1} month(s)
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Metric 4: Lifetime Birds / Quantity */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500"></div>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Birds / Quantity
              </span>
              <h3 className="text-2xl font-black text-slate-900 font-mono mt-1 tracking-tight">
                {purchaseStats.totalQuantityAllTime.toLocaleString('en-IN')}{' '}
                <span className="text-sm font-extrabold text-amber-600">Birds</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1 font-mono">
                Total Spend: ₹{fmtCurrency(purchaseStats.totalSpentAllTime)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0">
              <Package className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* MONTHLY PURCHASE & WEIGHT BREAKDOWN SECTION */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-emerald-600" />
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                Monthly Purchase &amp; Weight History
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Track how much chicken/product weight this customer has purchased month-by-month
            </p>
          </div>

          {selectedMonthFilter !== 'all' && (
            <button
              onClick={() => setSelectedMonthFilter('all')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear Filter (Show All Months)</span>
            </button>
          )}
        </div>

        {purchaseStats.monthlyStats.length === 0 ? (
          <div className="p-8 text-center">
            <Scale className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">No monthly purchase history available yet.</p>
            <p className="text-xs text-slate-400 mt-1">
              Once bills are generated for this customer, their monthly weight and quantity trends will appear here.
            </p>
          </div>
        ) : (
          <div className="p-5 sm:p-6 space-y-6">
            {/* Monthly Trend Chart */}
            {chartData.length > 0 && (
              <div className="bg-slate-50/80 p-4 sm:p-5 rounded-2xl border border-slate-200/80">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    Monthly Weight Trend (KG)
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">Click a bar to filter bills</span>
                </div>
                <div className="h-48 sm:h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis
                        dataKey="name"
                        stroke="#64748B"
                        fontSize={11}
                        tickLine={false}
                        axisLine={{ stroke: '#CBD5E1' }}
                      />
                      <YAxis
                        stroke="#64748B"
                        fontSize={11}
                        tickLine={false}
                        axisLine={{ stroke: '#CBD5E1' }}
                        tickFormatter={(val) => `${val}k`}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const p = payload[0].payload;
                            return (
                              <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-800 text-xs space-y-1">
                                <p className="font-bold text-emerald-400 text-sm">{p.name}</p>
                                <p className="font-mono font-bold">
                                  Weight: <span className="text-white">{fmtWeight(p.weight)} KG</span>
                                </p>
                                <p className="text-slate-300">Birds: {p.quantity} birds</p>
                                <p className="text-slate-300">Amount: ₹{fmtCurrency(p.amount)}</p>
                                <p className="text-slate-400 text-[10px]">{p.billsCount} bill(s)</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar
                        dataKey="weight"
                        radius={[6, 6, 0, 0]}
                        onClick={(entry) => {
                          if (entry && entry.monthKey) {
                            setSelectedMonthFilter(
                              selectedMonthFilter === entry.monthKey ? 'all' : entry.monthKey
                            );
                          }
                        }}
                        cursor="pointer"
                      >
                        {chartData.map((entry) => (
                          <Cell
                            key={entry.monthKey}
                            fill={
                              selectedMonthFilter === entry.monthKey
                                ? '#059669'
                                : selectedMonthFilter === 'all'
                                ? '#10B981'
                                : '#94A3B8'
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Monthly Breakdown Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-100/80 text-[11px] text-slate-600 uppercase font-extrabold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Month</th>
                    <th className="px-4 py-3 text-right">Total Weight (KG)</th>
                    <th className="px-4 py-3 text-center">Birds / Qty</th>
                    <th className="px-4 py-3 text-right">Avg Rate (₹/KG)</th>
                    <th className="px-4 py-3 text-right">Total Amount</th>
                    <th className="px-4 py-3 text-center">Bills</th>
                    <th className="px-4 py-3">Product Summary</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {purchaseStats.monthlyStats.map((m) => {
                    const isSelected = selectedMonthFilter === m.monthKey;
                    return (
                      <tr
                        key={m.monthKey}
                        className={`transition-colors ${
                          isSelected ? 'bg-emerald-50/80' : 'hover:bg-slate-50/70'
                        }`}
                      >
                        {/* Month */}
                        <td className="px-4 py-3.5 font-bold text-slate-900 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            <span>{m.monthLabel}</span>
                          </div>
                        </td>

                        {/* Weight (KG) - Highlighted */}
                        <td className="px-4 py-3.5 text-right font-mono font-black text-slate-900 text-sm whitespace-nowrap">
                          <span className="bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-200/60 inline-block">
                            {fmtWeight(m.totalWeight)} KG
                          </span>
                        </td>

                        {/* Qty */}
                        <td className="px-4 py-3.5 text-center font-mono font-bold text-slate-700 whitespace-nowrap">
                          {m.totalQuantity.toLocaleString('en-IN')}
                        </td>

                        {/* Avg Rate */}
                        <td className="px-4 py-3.5 text-right font-mono font-semibold text-slate-600 whitespace-nowrap">
                          ₹{fmtCurrency(m.avgRate)}
                        </td>

                        {/* Amount */}
                        <td className="px-4 py-3.5 text-right font-mono font-extrabold text-slate-900 whitespace-nowrap">
                          ₹{fmtCurrency(m.totalAmount)}
                        </td>

                        {/* Bills Count */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <span className="font-bold text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                            {m.billsCount} bill{m.billsCount > 1 ? 's' : ''}
                          </span>
                        </td>

                        {/* Products */}
                        <td className="px-4 py-3.5 text-xs">
                          <div className="flex flex-wrap gap-1">
                            {m.products.map((p, idx) => (
                              <span
                                key={idx}
                                className="inline-block bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded text-[11px]"
                              >
                                {p.productName}: <strong>{fmtWeight(p.weight)} KG</strong>
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Action: Filter bills below */}
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedMonthFilter(isSelected ? 'all' : m.monthKey)
                            }
                            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            <Filter className="w-3 h-3" />
                            <span>{isSelected ? 'Filtered' : 'Filter Bills'}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Bill History Section (Now includes Weight (KG) and Quantity) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-800">Customer Bill History</h3>
              {selectedMonthFilter !== 'all' && (
                <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  Month: {selectedMonthFilter}
                  <button
                    onClick={() => setSelectedMonthFilter('all')}
                    className="hover:text-emerald-950 font-bold ml-1 cursor-pointer"
                  >
                    ✕
                  </button>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              {selectedMonthFilter === 'all'
                ? 'All financial bills generated for this customer'
                : `Showing bills generated in ${selectedMonthFilter}`}
            </p>
          </div>
          <span className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
            Bills: {filteredBills.length}
          </span>
        </div>

        {filteredBills.length === 0 ? (
          <EmptyState
            title={
              selectedMonthFilter !== 'all'
                ? `No bills found for ${selectedMonthFilter}`
                : 'No bills generated for this customer.'
            }
            description={
              selectedMonthFilter !== 'all'
                ? 'Try clearing the month filter to view bills from other periods.'
                : 'Create a new bill to record transactions for this customer.'
            }
            actionButton={
              selectedMonthFilter !== 'all' ? (
                <button
                  type="button"
                  onClick={() => setSelectedMonthFilter('all')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl font-bold text-xs hover:bg-slate-700"
                >
                  Show All Bills
                </button>
              ) : (
                <Link
                  to={`/bills/new?customerId=${customer.id}`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700"
                >
                  <FilePlus className="w-4 h-4" />
                  <span>Create Bill Now</span>
                </Link>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Bill Number</th>
                  <th className="px-6 py-3.5">Date</th>
                  <th className="px-6 py-3.5 text-right">Total Weight (KG)</th>
                  <th className="px-6 py-3.5 text-center">Birds / Qty</th>
                  <th className="px-6 py-3.5 text-right">Total Amount</th>
                  <th className="px-6 py-3.5 text-center">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBills.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900 font-mono">#{b.billNumber}</td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-600">
                      {new Date(b.billDate || b.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-black text-slate-900 text-sm">
                      {fmtWeight(b.totalWeight)} <span className="text-xs font-bold text-emerald-600">KG</span>
                    </td>
                    <td className="px-6 py-4 text-center font-mono font-bold text-slate-700">
                      {b.totalQuantity || '-'}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900 font-mono text-sm">
                      ₹{fmtCurrency(b.grandTotal)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          b.status === 'GENERATED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/bills/${b.id}`}
                        className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-800 font-semibold text-xs bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Bill</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Customer Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Delete Customer</h3>
                <p className="text-xs text-slate-500">Confirm permanent removal</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="font-bold text-slate-900">{customer.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Business / Code:</span>
                <span className="font-medium text-slate-700">
                  {customer.businessName} ({customer.customerCode})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Current Due:</span>
                <span className="font-bold text-amber-700">₹{fmtCurrency(customer.currentDue)}</span>
              </div>
              {allBills.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-200 text-red-600 font-semibold text-[11px]">
                  ⚠️ Warning: Deleting this customer will also permanently delete {allBills.length} associated bill(s).
                </div>
              )}
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to delete this customer? This action is permanent and cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteMutation.isLoading}
                className="px-4 py-2 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deleteMutation.isLoading ? 'Deleting...' : 'Yes, Delete Customer'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
