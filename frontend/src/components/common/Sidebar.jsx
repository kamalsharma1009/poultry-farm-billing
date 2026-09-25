import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, Settings, PlusCircle, LogOut, Sparkles, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Customers', path: '/customers', icon: Users },
    { label: 'Bills', path: '/bills', icon: FileText },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#090D16] text-slate-200 flex flex-col h-screen border-r border-slate-800/70 select-none transition-transform duration-300 ease-in-out md:sticky md:top-0 md:translate-x-0 shrink-0 ${
        isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
      }`}
    >
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative shrink-0">
              <div className="w-11 h-11 rounded-2xl bg-white p-1 shadow-lg shadow-emerald-500/10 border border-slate-700/50 flex items-center justify-center overflow-hidden">
                <img
                  src="/chicken_logo.jpg"
                  alt="Broilers Express"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#090D16] rounded-full shadow-xs"></span>
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="font-extrabold text-base tracking-wide text-white leading-tight truncate">
                Broilers Express
              </h1>
              <p className="text-[11px] font-medium text-slate-400 truncate mt-0.5">
                Motton Market, Jaysingpur
              </p>
            </div>
          </div>

          {/* Close button for mobile screens */}
          <button
            onClick={onClose}
            className="md:hidden p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl transition-colors shrink-0"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Status Banner */}
        <div className="mt-3.5 flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800/80 text-[11px]">
          <span className="text-slate-400 font-medium">Billing System</span>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Online
          </span>
        </div>
      </div>

      {/* Quick Action: Create New Bill */}
      <div className="p-4">
        <NavLink
          to="/bills/new"
          onClick={onClose}
          className="group relative flex items-center justify-center gap-2.5 w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-extrabold rounded-xl shadow-lg shadow-emerald-900/30 hover:shadow-emerald-900/50 transition-all duration-200 text-sm hover:-translate-y-0.5 active:translate-y-0"
        >
          <PlusCircle className="w-4 h-4 transition-transform group-hover:rotate-90 duration-300" />
          <span>Create New Bill</span>
          <Sparkles className="w-3.5 h-3.5 text-emerald-200 opacity-70 group-hover:opacity-100" />
        </NavLink>
      </div>

      {/* Navigation Section */}
      <div className="px-4 py-1 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
        Navigation
      </div>
      <nav className="flex-1 px-3 py-1.5 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            onClick={onClose}
            className={({ isActive }) =>
              `group flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all duration-150 ${
                isActive
                  ? 'bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/25 shadow-xs shadow-emerald-500/5'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                />
                <span className="flex-1">{item.label}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400"></span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User Profile Card */}
      <div className="p-4 border-t border-slate-800/80">
        <div className="p-3 bg-slate-900/70 border border-slate-800/90 rounded-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
              {(user?.name || 'A')[0].toUpperCase()}
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-white truncate leading-tight">
                {user?.name || 'Administrator'}
              </p>
              <span className="inline-block text-[10px] font-semibold text-emerald-400/90 uppercase tracking-wider mt-0.5">
                {user?.role ? user.role.toLowerCase() : 'Admin'}
              </span>
            </div>
          </div>

          <button
            onClick={logout}
            title="Log out"
            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-150 shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
