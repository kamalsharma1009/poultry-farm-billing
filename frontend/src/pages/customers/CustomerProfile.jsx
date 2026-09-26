import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import Header from '../../components/common/Header';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { ArrowLeft, Edit, FilePlus, Eye, Phone, MapPin, Building, Hash, Trash2, AlertTriangle } from 'lucide-react';

export default function CustomerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

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

  if (isLoading) return <LoadingSpinner fullScreen label="Loading customer profile..." />;
  if (error || !data?.customer) {
    return (
      <div className="space-y-6">
        <Header title="Customer Profile" />
        <EmptyState title="Customer Not Found" description="The requested customer could not be found." />
      </div>
    );
  }

  const customer = data.customer;
  const bills = customer.bills || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to="/customers"
          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors border border-slate-200"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <Header title={`Customer Profile: ${customer.customerName}`} />
      </div>

      {/* Customer Info Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono font-extrabold text-sm px-3 py-1 bg-emerald-100 text-emerald-800 rounded-md">
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
            <h2 className="text-2xl font-extrabold text-slate-900 mt-2">{customer.customerName}</h2>
            <p className="text-sm font-semibold text-slate-500">{customer.businessName}</p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to={`/customers/${customer.id}/edit`}
              className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 font-semibold text-sm rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Edit className="w-4 h-4" />
              <span>Edit</span>
            </Link>
            <Link
              to={`/bills/new?customerId=${customer.id}`}
              className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-lg shadow-xs transition-colors"
            >
              <FilePlus className="w-4 h-4" />
              <span>Create Bill</span>
            </Link>
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-600 hover:bg-red-50 font-semibold text-sm rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </button>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 text-sm">
          <div className="flex items-start gap-3">
            <Phone className="w-5 h-5 text-slate-400 mt-0.5" />
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase">Mobile Number</p>
              <p className="font-bold text-slate-800">{customer.mobile}</p>
              {customer.alternateMobile && (
                <p className="text-xs text-slate-500">Alt: {customer.alternateMobile}</p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-slate-400 mt-0.5" />
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase">Address</p>
              <p className="font-semibold text-slate-800">{customer.address || 'Not specified'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Building className="w-5 h-5 text-slate-400 mt-0.5" />
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase">GST Number</p>
              <p className="font-mono font-bold text-slate-800">{customer.gstNumber || 'Unregistered'}</p>
            </div>
          </div>
        </div>

        {/* Outstanding Dues Banner */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50/50 border border-amber-200/80 rounded-xl">
          <div>
            <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">Current Outstanding Balance</p>
            <p className="text-2xl font-mono font-black text-amber-950 mt-0.5">
              ₹{Number(customer.currentDue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <Link
            to={`/bills/new?customerId=${customer.id}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
          >
            <FilePlus className="w-3.5 h-3.5" />
            <span>Generate Bill with this Due</span>
          </Link>
        </div>
      </div>

      {/* Bill History Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-800">Customer Bill History</h3>
            <p className="text-xs text-slate-500">All financial bills generated for this customer</p>
          </div>
          <span className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
            Total Bills: {bills.length}
          </span>
        </div>

        {bills.length === 0 ? (
          <EmptyState
            title="No bills generated for this customer."
            description="Create a new bill to record transactions for this customer."
            actionButton={
              <Link
                to={`/bills/new?customerId=${customer.id}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold text-sm hover:bg-emerald-700"
              >
                <FilePlus className="w-4 h-4" />
                <span>Create Bill Now</span>
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Bill Number</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3 text-right">Total Amount</th>
                  <th className="px-6 py-3 text-center">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {bills.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-bold text-slate-800">#{b.billNumber}</td>
                    <td className="px-6 py-4">{new Date(b.billDate).toLocaleDateString('en-IN')}</td>
                    <td className="px-6 py-4 text-right font-bold text-slate-800">
                      ₹{Number(b.grandTotal).toFixed(2)}
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
                        className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-800 font-semibold text-xs bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-md transition-colors"
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
                <span className="font-medium text-slate-700">{customer.businessName} ({customer.customerCode})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Current Due:</span>
                <span className="font-bold text-amber-700">₹{Number(customer.currentDue || 0).toFixed(2)}</span>
              </div>
              {bills.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-200 text-red-600 font-semibold text-[11px]">
                  ⚠️ Warning: Deleting this customer will also permanently delete {bills.length} associated bill(s).
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
                className="px-4 py-2 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-colors disabled:opacity-50"
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
