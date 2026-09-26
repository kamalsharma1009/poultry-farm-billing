import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../../lib/api';
import { UserPlus, X, Save, AlertCircle } from 'lucide-react';

const IndianMobileRegex = /^[6-9]\d{9}$/;
const GstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const schema = z.object({
  customerName: z.string().trim().min(1, 'Customer Name is required'),
  businessName: z.string().trim().min(1, 'Business / Shop Name is required'),
  mobile: z.string().min(1, 'Mobile Number is required').regex(IndianMobileRegex, 'Enter valid 10-digit mobile number (e.g. 9876543210)'),
  alternateMobile: z.string().optional().refine(val => !val || IndianMobileRegex.test(val), 'Enter valid 10-digit alternate mobile number'),
  address: z.string().trim().optional(),
  gstNumber: z.string().trim().optional().refine(val => !val || GstRegex.test(val.toUpperCase()), 'Invalid GSTIN format'),
  currentDue: z.coerce.number().min(0, 'Due cannot be negative').optional().default(0),
});

export default function AddCustomerModal({
  isOpen,
  onClose,
  onCustomerCreated,
  initialQuery = '',
  submitLabel = 'Save Customer',
}) {
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    reset,
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
      currentDue: 0,
    },
  });

  useEffect(() => {
    if (isOpen) {
      setServerError('');
      reset({
        customerName: '',
        businessName: initialQuery ? initialQuery.trim() : '',
        mobile: '',
        alternateMobile: '',
        address: '',
        gstNumber: '',
        currentDue: 0,
      });
      // If query is digits, fill mobile, else businessName
      if (initialQuery && /^\d{10}$/.test(initialQuery.trim())) {
        setValue('mobile', initialQuery.trim());
        setValue('businessName', '');
      }
    }
  }, [isOpen, initialQuery, reset, setValue]);

  if (!isOpen) return null;

  const onSubmit = async (data) => {
    setServerError('');
    try {
      const res = await api.post('/customers', data);
      const newCustomer = res?.data?.customer || res?.customer || res;
      if (onCustomerCreated) {
        onCustomerCreated(newCustomer);
      }
      onClose();
    } catch (err) {
      setServerError(typeof err === 'string' ? err : err.message || 'Failed to create customer');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <UserPlus className="w-4 h-4 text-emerald-700" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">Add New Customer</h3>
              <p className="text-xs text-slate-500">Quickly register client &amp; assign opening balance</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Server Error Alert */}
        {serverError && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <p className="text-xs text-red-700 font-semibold">{serverError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Customer Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Customer Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('customerName')}
                placeholder="e.g. Samrat Patil"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              />
              {errors.customerName && (
                <p className="text-[11px] text-red-600 mt-1">{errors.customerName.message}</p>
              )}
            </div>

            {/* Business / Shop Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Business / Shop Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('businessName')}
                placeholder="e.g. Samrat Chicken"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              />
              {errors.businessName && (
                <p className="text-[11px] text-red-600 mt-1">{errors.businessName.message}</p>
              )}
            </div>

            {/* Mobile Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mobile Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                maxLength={10}
                {...register('mobile')}
                placeholder="e.g. 9326153310"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              />
              {errors.mobile && (
                <p className="text-[11px] text-red-600 mt-1">{errors.mobile.message}</p>
              )}
            </div>

            {/* Alternate Mobile */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Alternate Mobile (Optional)
              </label>
              <input
                type="text"
                maxLength={10}
                {...register('alternateMobile')}
                placeholder="e.g. 9822000000"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              />
              {errors.alternateMobile && (
                <p className="text-[11px] text-red-600 mt-1">{errors.alternateMobile.message}</p>
              )}
            </div>
          </div>

          {/* Opening / Previous Due Balance */}
          <div className="bg-amber-50/80 p-3 rounded-xl border border-amber-200 space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-black text-amber-900 uppercase tracking-wider">
                Opening / Previous Due (₹)
              </label>
              <span className="text-[10px] font-bold text-amber-800 bg-amber-200/70 px-2 py-0.5 rounded-full">
                Past Balance
              </span>
            </div>
            <input
              type="number"
              step="0.01"
              min="0"
              {...register('currentDue')}
              placeholder="0.00"
              className="w-full px-3 py-1.5 border border-amber-300 rounded-lg text-xs font-bold font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
            />
            <p className="text-[10px] text-amber-800 font-medium">
              Past unpaid debt before onboarding. Automatically populates on bill generation.
            </p>
            {errors.currentDue && (
              <p className="text-[11px] text-red-600 mt-0.5">{errors.currentDue.message}</p>
            )}
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Address (Optional)
            </label>
            <input
              type="text"
              {...register('address')}
              placeholder="e.g. Near Mutton Market, Jaysingpur"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            />
          </div>

          {/* GST Number */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              GST Number (Optional)
            </label>
            <input
              type="text"
              {...register('gstNumber')}
              placeholder="e.g. 27ABCDE1234F1Z5"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            />
            {errors.gstNumber && (
              <p className="text-[11px] text-red-600 mt-1">{errors.gstNumber.message}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 font-bold text-xs rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Saving...' : submitLabel}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
