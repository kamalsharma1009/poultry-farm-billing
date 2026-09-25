import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../../lib/api';
import Header from '../../components/common/Header';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { ArrowLeft, Save, FilePlus, Eye, CheckCircle2, AlertCircle } from 'lucide-react';

const IndianMobileRegex = /^[6-9]\d{9}$/;
const GstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const schema = z.object({
  customerName: z.string().trim().min(1, 'Customer Name is required'),
  businessName: z.string().trim().min(1, 'Business / Shop Name is required'),
  mobile: z.string().min(1, 'Mobile Number is required').regex(IndianMobileRegex, 'Enter valid 10-digit mobile number (e.g. 9876543210)'),
  alternateMobile: z.string().optional().refine(val => !val || IndianMobileRegex.test(val), 'Enter valid 10-digit alternate mobile number'),
  address: z.string().trim().optional(),
  gstNumber: z.string().trim().optional().refine(val => !val || GstRegex.test(val.toUpperCase()), 'Invalid GSTIN format'),
});

export default function CustomerForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();

  const [loadingCustomer, setLoadingCustomer] = useState(isEdit);
  const [serverError, setServerError] = useState('');
  const [createdCustomer, setCreatedCustomer] = useState(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      customerName: '',
      businessName: '',
      mobile: '',
      alternateMobile: '',
      address: '',
      gstNumber: '',
    },
  });

  useEffect(() => {
    if (isEdit) {
      const fetchCustomer = async () => {
        try {
          const res = await api.get(`/customers/${id}`);
          const c = res?.data?.customer || res?.customer || res;
          setValue('customerName', c.customerName);
          setValue('businessName', c.businessName);
          setValue('mobile', c.mobile);
          setValue('alternateMobile', c.alternateMobile || '');
          setValue('address', c.address || '');
          setValue('gstNumber', c.gstNumber || '');
        } catch (err) {
          setServerError('Failed to load customer details');
        } finally {
          setLoadingCustomer(false);
        }
      };
      fetchCustomer();
    }
  }, [id, isEdit, setValue]);

  const onSubmit = async (data) => {
    setServerError('');
    try {
      if (isEdit) {
        await api.put(`/customers/${id}`, data);
        navigate(`/customers/${id}`);
      } else {
        const res = await api.post('/customers', data);
        const cust = res?.data?.customer || res?.customer || res;
        setCreatedCustomer(cust);
      }
    } catch (err) {
      setServerError(typeof err === 'string' ? err : err.message || 'Operation failed');
    }
  };

  if (loadingCustomer) return <LoadingSpinner fullScreen label="Loading customer details..." />;

  // Success view for newly created customer
  if (createdCustomer) {
    return (
      <div className="space-y-6">
        <Header title="Customer Created" />
        <div className="max-w-xl mx-auto bg-white rounded-2xl p-8 border border-slate-200 shadow-sm text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/25">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">
            Customer Profile Created!
          </h2>
          
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 my-6 text-center">
            <p className="text-[11px] text-slate-400 uppercase tracking-widest font-bold">Assigned Customer ID</p>
            <p className="text-3xl font-mono font-black text-emerald-700 tracking-wider mt-1">
              {createdCustomer.customerCode}
            </p>
            <p className="text-base font-bold text-slate-900 mt-2">{createdCustomer.customerName}</p>
            <p className="text-xs text-slate-500 font-medium">{createdCustomer.businessName} • {createdCustomer.mobile}</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to={`/bills/new?customerId=${createdCustomer.id}`}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-emerald-600/20 hover:-translate-y-0.5"
            >
              <FilePlus className="w-4 h-4" />
              <span>Create Bill</span>
            </Link>
            <Link
              to={`/customers/${createdCustomer.id}`}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-sm transition-all shadow-sm hover:-translate-y-0.5"
            >
              <Eye className="w-4 h-4" />
              <span>View Customer</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to="/customers"
          className="p-2.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-xl transition-colors border border-slate-200 bg-white/70 shadow-2xs"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <Header title={isEdit ? 'Edit Customer' : 'Add New Customer'} />
      </div>

      <div className="max-w-2xl mx-auto bg-white rounded-2xl p-8 border border-slate-200/90 shadow-sm">
        {serverError && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 font-medium">{serverError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Customer Name */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Customer Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('customerName')}
                placeholder="e.g. Samrat Patil"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {errors.customerName && (
                <p className="text-xs text-red-600 mt-1">{errors.customerName.message}</p>
              )}
            </div>

            {/* Business / Shop Name */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Business / Shop Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('businessName')}
                placeholder="e.g. Samrat-1 Chicken Center"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {errors.businessName && (
                <p className="text-xs text-red-600 mt-1">{errors.businessName.message}</p>
              )}
            </div>

            {/* Mobile */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Mobile Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                maxLength={10}
                {...register('mobile')}
                placeholder="e.g. 9326153310"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {errors.mobile && (
                <p className="text-xs text-red-600 mt-1">{errors.mobile.message}</p>
              )}
            </div>

            {/* Alternate Mobile */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Alternate Mobile (Optional)
              </label>
              <input
                type="text"
                maxLength={10}
                {...register('alternateMobile')}
                placeholder="e.g. 9822000000"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {errors.alternateMobile && (
                <p className="text-xs text-red-600 mt-1">{errors.alternateMobile.message}</p>
              )}
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Address (Optional)
            </label>
            <textarea
              rows={3}
              {...register('address')}
              placeholder="e.g. Near Mutton Market, Jaysingpur"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {errors.address && (
              <p className="text-xs text-red-600 mt-1">{errors.address.message}</p>
            )}
          </div>

          {/* GST Number */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              GST Number (Optional)
            </label>
            <input
              type="text"
              {...register('gstNumber')}
              placeholder="e.g. 27ABCDE1234F1Z5"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {errors.gstNumber && (
              <p className="text-xs text-red-600 mt-1">{errors.gstNumber.message}</p>
            )}
          </div>

          {/* Form Action Buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <Link
              to="/customers"
              className="px-5 py-2.5 border border-slate-300 text-slate-700 font-semibold text-sm rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-lg shadow-xs transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : 'Save Customer'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
