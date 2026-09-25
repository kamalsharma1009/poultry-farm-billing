import React, { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Menu, PlusCircle } from 'lucide-react';
import Sidebar from '../components/common/Sidebar';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-emerald-500 selection:text-white flex flex-col md:flex-row">
      {/* Mobile Top Navigation Bar */}
      <header className="md:hidden sticky top-0 z-30 bg-[#090D16] text-white px-4 py-3 flex items-center justify-between border-b border-slate-800 shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-1 text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-xl transition-colors focus:outline-none"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white p-0.5 flex items-center justify-center overflow-hidden">
              <img
                src="/chicken_logo.jpg"
                alt="Logo"
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
            <div>
              <h1 className="font-extrabold text-sm tracking-wide text-white leading-tight">
                Broilers Express
              </h1>
              <span className="text-[10px] text-emerald-400 font-bold block leading-none">
                Billing System
              </span>
            </div>
          </div>
        </div>

        <Link
          to="/bills/new"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-lg text-xs font-bold shadow-xs active:scale-95 transition-all"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>New Bill</span>
        </Link>
      </header>

      {/* Backdrop for mobile drawer */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Responsive Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto animate-in fade-in duration-200">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
