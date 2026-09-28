import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Header({ title = 'Dashboard', backTo, className = '' }) {
  const { user } = useAuth();
  const todayFormatted = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <header className={`w-full flex-1 bg-white/90 backdrop-blur-md border border-slate-200/90 rounded-2xl px-4 sm:px-5 py-2.5 sm:py-3 flex items-center justify-between shadow-xs mb-4 gap-3 ${className}`}>
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {backTo && (
          <Link
            to={backTo}
            className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors border border-slate-200 shrink-0"
            title="Go Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
        )}
        <div className="w-1.5 h-5 bg-gradient-to-b from-emerald-500 to-teal-600 rounded-full shrink-0"></div>
        <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight truncate">{title}</h1>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-100/90 border border-slate-200/80 px-3 py-1.5 rounded-xl">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>{todayFormatted}</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 pl-1">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-extrabold flex items-center justify-center text-xs shadow-xs">
            {(user?.name || 'A')[0].toUpperCase()}
          </div>
          <span className="hidden md:inline font-extrabold text-slate-800">{user?.name || 'Operator'}</span>
        </div>
      </div>
    </header>
  );
}
