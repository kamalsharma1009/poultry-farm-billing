import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import Header from '../../components/common/Header';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { Search, PlusCircle, UserCheck, UserX, Eye, Edit, FilePlus, ChevronLeft, ChevronRight } from 'lucide-react';

export default function CustomerList() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['customers', search, statusFilter, page],
    queryFn: async () => {
      const res = await api.get('/customers', {
        params: { search, status: statusFilter === 'all' ? undefined : statusFilter, page, limit: 15 },
      });
      return res.data;
    },
    keepPreviousData: true,
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }) => {
      return api.patch(`/customers/${id}/status`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['customers']);
    },
  });

  const customers = data?.customers || [];
  const pagination = data?.pagination || { total: 0, totalPages: 1 };

  return (
    <div className="space-y-6">
      <Header title="Customer Management" />

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
            placeholder="Search by ID, Name, Business, or Mobile..."
            className="w-full pl-11 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all shadow-2xs"
          />
        </div>

        {/* Filter & Add Button */}
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          <Link
            to="/customers/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold text-sm transition-all shadow-sm hover:shadow-emerald-500/20 hover:-translate-y-0.5"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Customer</span>
          </Link>
        </div>
      </div>

      {/* Content Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        {isLoading ? (
          <LoadingSpinner label="Loading customer directory..." />
        ) : customers.length === 0 ? (
          <EmptyState
            title={search ? 'No matching customers found' : 'No customers added yet'}
            description={
              search
                ? `No customer record matches "${search}". Try adjusting your query.`
                : 'Start building your customer directory by creating a customer.'
            }
            actionButton={
              !search && (
                <Link
                  to="/customers/new"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-sm"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Add First Customer</span>
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
                    <th className="px-6 py-3.5">Customer ID</th>
                    <th className="px-6 py-3.5">Customer / Business Name</th>
                    <th className="px-6 py-3.5">Mobile</th>
                    <th className="px-6 py-3.5">Address</th>
                    <th className="px-6 py-3.5 text-center">Status</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customers.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-emerald-700 tracking-tight">
                        <Link to={`/customers/${c.id}`} className="hover:underline">
                          {c.customerCode}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{c.customerName}</div>
                        <div className="text-xs text-slate-500 font-medium">{c.businessName}</div>
                      </td>
                      <td className="px-6 py-4 font-mono font-medium text-slate-800 text-xs">
                        {c.mobile}
                        {c.alternateMobile && (
                          <div className="text-[11px] text-slate-400">Alt: {c.alternateMobile}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs max-w-xs truncate text-slate-500">
                        {c.address || '—'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                            c.isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              c.isActive ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          {c.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to={`/bills/new?customerId=${c.id}`}
                            title="Create Bill for this customer"
                            className="inline-flex items-center gap-1.5 text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors"
                          >
                            <FilePlus className="w-3.5 h-3.5" />
                            <span>Bill</span>
                          </Link>
                          <Link
                            to={`/customers/${c.id}`}
                            title="View customer profile"
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() =>
                              toggleStatusMutation.mutate({ id: c.id, isActive: !c.isActive })
                            }
                            title={c.isActive ? 'Deactivate Customer' : 'Activate Customer'}
                            className={`p-1.5 rounded-lg transition-colors ${
                              c.isActive
                                ? 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                                : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                            }`}
                          >
                            {c.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
                <div>
                  Showing Page <span className="font-bold text-slate-800">{page}</span> of{' '}
                  <span className="font-bold text-slate-800">{pagination.totalPages}</span>{' '}
                  <span className="text-slate-400 font-mono">({pagination.total} total customers)</span>
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
    </div>
  );
}
