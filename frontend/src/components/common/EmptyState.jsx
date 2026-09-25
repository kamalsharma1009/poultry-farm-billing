import React from 'react';
import { FolderOpen } from 'lucide-react';

export default function EmptyState({
  title = 'No records found',
  description = 'There are no items to display at this moment.',
  icon: Icon = FolderOpen,
  actionButton = null,
}) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-xl border border-slate-200 shadow-xs my-4">
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-slate-800 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 max-w-md mb-6">{description}</p>
      {actionButton && <div>{actionButton}</div>}
    </div>
  );
}
