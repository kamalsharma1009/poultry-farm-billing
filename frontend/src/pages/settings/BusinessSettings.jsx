import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import Header from '../../components/common/Header';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Save, Building2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function BusinessSettings() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [form, setForm] = useState({
    businessName: 'Broilers Express',
    address: 'Motton Market, Jaysingpur',
    mobile: '9326153310',
    email: '',
    gstNumber: '',
    billStartingNumber: 68923,
    billFooter: 'Thank you for your business! - Broilers Express',
  });

  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['businessSettings'],
    queryFn: async () => {
      const res = await api.get('/settings');
      return res.data;
    },
  });

  useEffect(() => {
    if (data?.settings) {
      setForm({
        businessName: data.settings.businessName || 'Broilers Express',
        address: data.settings.address || 'Motton Market, Jaysingpur',
        mobile: data.settings.mobile || '9326153310',
        email: data.settings.email || '',
        gstNumber: data.settings.gstNumber || '',
        billStartingNumber: data.settings.billStartingNumber || 68923,
        billFooter: data.settings.billFooter || 'Thank you for your business! - Broilers Express',
      });
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: async (payload) => {
      return api.put('/settings', payload);
    },
    onSuccess: () => {
      setMessage('Business settings updated successfully!');
      setErrorMsg('');
      queryClient.invalidateQueries(['businessSettings']);
    },
    onError: (err) => {
      setErrorMsg(typeof err === 'string' ? err : err.message || 'Failed to update settings');
      setMessage('');
    },
  });

  const handleChange = (field, value) => {
    setForm({ ...form, [field]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setMessage('');
    setErrorMsg('');

    updateMutation.mutate({
      ...form,
      billStartingNumber: parseInt(form.billStartingNumber, 10) || 68923,
    });
  };

  if (isLoading) return <LoadingSpinner fullScreen label="Loading business settings..." />;

  return (
    <div className="space-y-6">
      <Header title="Business Settings" />

      <div className="max-w-3xl mx-auto bg-white rounded-xl p-8 border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3 border-b border-slate-200 pb-4 mb-6">
          <Building2 className="w-6 h-6 text-emerald-600" />
          <div>
            <h2 className="text-lg font-extrabold text-slate-800">Business Profile & Bill Configuration</h2>
            <p className="text-xs text-slate-500">
              Information displayed on computerized PDF bills & receipts
            </p>
          </div>
        </div>

        {message && (
          <div className="mb-6 p-4 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="text-sm text-emerald-800 font-semibold">{message}</p>
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <p className="text-sm text-red-700 font-semibold">{errorMsg}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Business Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                disabled={!isAdmin}
                value={form.businessName}
                onChange={(e) => handleChange('businessName', e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Contact Mobile <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                disabled={!isAdmin}
                value={form.mobile}
                onChange={(e) => handleChange('mobile', e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Business Address <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              disabled={!isAdmin}
              value={form.address}
              onChange={(e) => handleChange('address', e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Email Address
              </label>
              <input
                type="email"
                disabled={!isAdmin}
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="info@broilersexpress.com"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                GSTIN Number
              </label>
              <input
                type="text"
                disabled={!isAdmin}
                value={form.gstNumber}
                onChange={(e) => handleChange('gstNumber', e.target.value)}
                placeholder="27XXXXX1234X1Z0"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Bill Starting Number
              </label>
              <input
                type="number"
                min="1"
                disabled={!isAdmin}
                value={form.billStartingNumber}
                onChange={(e) => handleChange('billStartingNumber', e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 font-mono font-bold"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Initial starting number for new bills (e.g. 68923)
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Bill Footer Note
              </label>
              <input
                type="text"
                disabled={!isAdmin}
                value={form.billFooter}
                onChange={(e) => handleChange('billFooter', e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100"
              />
            </div>
          </div>

          {isAdmin && (
            <div className="pt-4 border-t border-slate-200 flex justify-end">
              <button
                type="submit"
                disabled={updateMutation.isLoading}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-lg shadow-xs transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{updateMutation.isLoading ? 'Saving...' : 'Save Settings'}</span>
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
