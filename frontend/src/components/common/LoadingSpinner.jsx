import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ label = 'Loading...', fullScreen = false }) {
  if (fullScreen) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-600">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mb-3" />
        <p className="text-sm font-medium">{label}</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-8 text-slate-500 gap-2">
      <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}
