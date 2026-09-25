import React from 'react';
import { Calendar, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Header({ title = 'Dashboard' }) {
  const { user } = useAuth();
  const todayFormatted = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <header className="bg-white/90 backdrop-blur-md border border-slate-200/90 rounded-2xl px-6 py-3.5 flex items-center justify-between shadow-xs mb-6">
      <div className="flex items-center gap-3">
        <div className="w-2 h-6 bg-gradient-to-b from-emerald-500 to-teal-600 rounded-full"></div>
        <h1 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">{title}</h1>
      </div>
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-100/90 border border-slate-200/80 px-3 py-1.5 rounded-xl">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>{todayFormatted}</span>
        </div>
        <div className="flex items-center gap-2.5 text-xs font-bold text-slate-700 pl-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-extrabold flex items-center justify-center text-xs shadow-xs">
            {(user?.name || 'A')[0].toUpperCase()}
          </div>
          <span className="hidden md:inline font-extrabold text-slate-800">{user?.name || 'Operator'}</span>
        </div>
      </div>
    </header>
  );
}
