import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import Header from '../../components/common/Header';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { ArrowLeft, Edit, FilePlus, Eye, Phone, MapPin, Building, Hash } from 'lucide-react';

export default function CustomerProfile() {
  const { id } = useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ['customer', id],
    queryFn: async () => {
      const res = await api.get(`/customers/${id}`);
      return res.data;
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
              <span>Edit Customer</span>
            </Link>
            <Link
              to={`/bills/new?customerId=${customer.id}`}
              className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-lg shadow-xs transition-colors"
            >
              <FilePlus className="w-4 h-4" />
              <span>Create Bill</span>
            </Link>
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
    </div>
  );
}
