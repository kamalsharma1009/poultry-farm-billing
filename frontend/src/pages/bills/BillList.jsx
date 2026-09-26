import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import Header from '../../components/common/Header';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { Search, PlusCircle, Eye, Download, Printer, MessageSquare, ChevronLeft, ChevronRight, Trash2, AlertTriangle } from 'lucide-react';

export default function BillList() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [billToDelete, setBillToDelete] = useState(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['bills', search, statusFilter, page],
    queryFn: async () => {
      const res = await api.get('/bills', {
        params: { search, status: statusFilter || undefined, page, limit: 20 },
      });
      return res.data;
    },
    keepPreviousData: true,
  });

  const bills = data?.bills || [];
  const pagination = data?.pagination || { total: 0, totalPages: 1 };

  const deleteBillMutation = useMutation({
    mutationFn: async (id) => {
      return api.delete(`/bills/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['bills']);
      queryClient.invalidateQueries(['dashboardSummary']);
      setBillToDelete(null);
    },
    onError: (err) => {
      alert(err.message || 'Failed to delete bill');
    },
  });

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

  return (
    <div className="space-y-6">
      <Header title="Bill Records & History" />

      {/* Control Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[280px]">
          <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by Bill Number, Customer Name, or Mobile..."
            className="w-full pl-11 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="GENERATED">Generated</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <Link
            to="/bills/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold text-sm transition-all shadow-sm hover:shadow-emerald-500/20 hover:-translate-y-0.5"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Bill</span>
          </Link>
        </div>
      </div>

      {/* Content Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        {isLoading ? (
          <LoadingSpinner label="Loading bills database..." />
        ) : bills.length === 0 ? (
          <EmptyState
            title={search ? 'No matching bills found' : 'No bills generated yet'}
            description={
              search
                ? `No bill records match "${search}". Try adjusting your keywords.`
                : 'Generate your first bill for a customer.'
            }
            actionButton={
              !search && (
                <Link
                  to="/bills/new"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-sm"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Create Bill</span>
                </Link>
              )
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50/80 text-[11px] text-slate-400 uppercase tracking-wider font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3.5">Bill Number</th>
                    <th className="px-6 py-3.5">Date</th>
                    <th className="px-6 py-3.5">Customer / Outlet</th>
                    <th className="px-6 py-3.5 text-right">Amount</th>
                    <th className="px-6 py-3.5 text-center">Status</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bills.map((b) => {
                    const mobile = b.customer?.mobile
                      ? b.customer.mobile.startsWith('91')
                        ? b.customer.mobile
                        : `91${b.customer.mobile.replace(/\D/g, '')}`
                      : '';
                    const shareText = encodeURIComponent(
                      `Hello ${b.customer?.customerName || ''},\n\nYour Broilers Express Bill #${b.billNumber} for ₹${Number(b.grandTotal).toFixed(2)} is ready.\n\nView/Download: ${window.location.origin}/bills/${b.id}\n\nThank you!`
                    );
                    const waUrl = mobile ? `https://wa.me/${mobile}?text=${shareText}` : null;

                    return (
                      <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-slate-900 tracking-tight">
                          <Link
                            to={`/bills/${b.id}`}
                            className="hover:text-emerald-600 transition-colors"
                          >
                            #{b.billNumber}
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-slate-600 text-xs font-medium">
                          {new Date(b.billDate).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900">{b.customer?.customerName}</div>
                          <div className="text-xs text-slate-500 font-medium">
                            {b.customer?.businessName}{' '}
                            <span className="text-slate-400 font-mono text-[11px]">
                              ({b.customer?.customerCode})
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-extrabold text-slate-900 text-base">
                          ₹{Number(b.grandTotal).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                              b.status === 'GENERATED'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                : 'bg-red-50 text-red-700 border border-red-200/60'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                b.status === 'GENERATED' ? 'bg-emerald-500' : 'bg-red-500'
                              }`}
                            />
                            {b.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              to={`/bills/${b.id}`}
                              title="View Invoice"
                              className="p-2 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>

                            <button
                              onClick={() => handleDownloadPDF(b.id, b.billNumber)}
                              title="Download PDF"
                              className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Download className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handlePrintPDF(b.id)}
                              title="Print Slip"
                              className="p-2 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-colors"
                            >
                              <Printer className="w-4 h-4" />
                            </button>

                            {waUrl && (
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Share on WhatsApp"
                                className="p-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                              >
                                <MessageSquare className="w-4 h-4 fill-current" />
                              </a>
                            )}

                            <button
                              onClick={() => setBillToDelete(b)}
                              title="Delete Bill"
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
                <div>
                  Showing Page <span className="font-bold text-slate-800">{page}</span> of{' '}
                  <span className="font-bold text-slate-800">{pagination.totalPages}</span>{' '}
                  <span className="text-slate-400 font-mono">({pagination.total} total bills)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="p-2 rounded-lg border border-slate-200 bg-white disabled:opacity-30 hover:bg-slate-100 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="p-2 rounded-lg border border-slate-200 bg-white disabled:opacity-30 hover:bg-slate-100 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Bill Confirmation Modal */}
      {billToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Delete Bill</h3>
                <p className="text-xs text-slate-500">Confirm permanent bill deletion</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Bill Number:</span>
                <span className="font-mono font-bold text-slate-900">#{billToDelete.billNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="font-bold text-slate-900">{billToDelete.customer?.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Amount:</span>
                <span className="font-mono font-extrabold text-emerald-700">₹{Number(billToDelete.grandTotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status:</span>
                <span className="font-bold text-slate-700">{billToDelete.status}</span>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to permanently delete this bill? This will also revert the customer's balance. This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setBillToDelete(null)}
                disabled={deleteBillMutation.isLoading}
                className="px-4 py-2 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteBillMutation.mutate(billToDelete.id)}
                disabled={deleteBillMutation.isLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deleteBillMutation.isLoading ? 'Deleting...' : 'Delete Bill'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
