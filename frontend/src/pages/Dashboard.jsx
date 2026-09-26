import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import Header from '../components/common/Header';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import AddCustomerModal from '../components/common/AddCustomerModal';
import { FileText, IndianRupee, Users, PlusCircle, ArrowRight, FilePlus, Eye } from 'lucide-react';

export default function Dashboard() {
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: async () => {
      const res = await api.get('/dashboard/summary');
      return res.data;
    },
  });

  if (isLoading) return <LoadingSpinner fullScreen />;

  const summary = data?.summary || { todayBills: 0, todaySales: 0, totalCustomers: 0 };
  const recentBills = data?.recentBills || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <Header title="Business Dashboard" />

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Today's Bills */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex items-center justify-between relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Today's Bills
            </span>
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">
              {summary.todayBills}
            </h3>
            <span className="inline-block text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md mt-1.5 border border-blue-100">
              Generated Today
            </span>
          </div>
          <div className="w-13 h-13 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        {/* Today's Sales */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex items-center justify-between relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Today's Revenue
            </span>
            <h3 className="text-3xl font-black text-emerald-600 font-mono tracking-tight">
              ₹{Number(summary.todaySales).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <span className="inline-block text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md mt-1.5 border border-emerald-100">
              Real Database Sales
            </span>
          </div>
          <div className="w-13 h-13 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
            <IndianRupee className="w-6 h-6" />
          </div>
        </div>

        {/* Total Customers */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex items-center justify-between relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-500"></div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Active Clients
            </span>
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">
              {summary.totalCustomers}
            </h3>
            <span className="inline-block text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md mt-1.5 border border-purple-100">
              Registered Accounts
            </span>
          </div>
          <div className="w-13 h-13 rounded-2xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Quick Action Operations */}
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900">Quick Actions</h3>
          <p className="text-xs text-slate-500">Fast billing actions for operators</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/bills/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs rounded-xl shadow-md shadow-emerald-700/20 hover:shadow-emerald-700/30 transition-all hover:-translate-y-0.5"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New Bill</span>
          </Link>
          <button
            type="button"
            onClick={() => setShowAddCustomerModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-xs transition-all hover:-translate-y-0.5 cursor-pointer"
          >
            <FilePlus className="w-4 h-4 text-slate-300" />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* Recent Bills Table */}
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200/80 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900">Recent Invoices</h3>
            <p className="text-xs text-slate-500">Live transactions recorded in PostgreSQL</p>
          </div>
          <Link
            to="/bills"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors border border-emerald-100"
          >
            <span>View All Bills</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentBills.length === 0 ? (
          <EmptyState
            title="No bills generated yet"
            description="Start by creating your first bill for a customer."
            actionButton={
              <Link
                to="/bills/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold text-sm hover:bg-emerald-700"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create Bill</span>
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 text-[10px]">
                <tr>
                  <th className="py-3.5 px-5">Bill No</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4 text-right">Amount</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {recentBills.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-5 font-mono font-black text-slate-900">
                      #{b.billNumber}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {new Date(b.billDate).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {b.customer?.customerName}
                      {b.customer?.businessName && (
                        <span className="text-slate-400 font-normal ml-1.5 text-[11px]">
                          ({b.customer?.businessName})
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                      ₹{Number(b.grandTotal).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          b.status === 'GENERATED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <Link
                        to={`/bills/${b.id}`}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors border border-emerald-100"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add New Customer Modal */}
      <AddCustomerModal
        isOpen={showAddCustomerModal}
        onClose={() => setShowAddCustomerModal(false)}
        onCustomerCreated={() => {
          queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
        }}
      />
    </div>
  );
}
