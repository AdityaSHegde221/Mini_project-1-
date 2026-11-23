import React from 'react';

export const Badge = ({ status, className = '' }) => {
  const getStyle = (s) => {
    switch (s?.toLowerCase()) {
      case 'approved':
      case 'completed':
      case 'matched':
      case 'full':
      case 'paid':
      case 'accepted':
      case 'receiptconfirmed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/20';
      
      case 'pending':
      case 'submitted':
      case 'sent':
      case 'waiting':
      case 'interested':
        return 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/20';
      
      case 'vendor selected':
      case 'quoted':
      case 'confirmed':
      case 'invoiced':
        return 'bg-sky-50 text-sky-700 border-sky-200 ring-sky-500/20';

      case 'ordered':
      case 'shipped':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-indigo-500/20';

      case 'received':
        return 'bg-teal-50 text-teal-700 border-teal-200 ring-teal-500/20';

      case 'rejected':
      case 'failed':
      case 'mismatch':
      case 'discrepancy':
      case 'declined':
      case 'cancelled':
      case 'receiptmismatch':
        return 'bg-rose-50 text-rose-700 border-rose-200 ring-rose-500/20';

      default:
        return 'bg-slate-100 text-slate-700 border-slate-200 ring-slate-500/20';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ring-1 ${getStyle(
        status
      )} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70"></span>
      {status || 'Unknown'}
    </span>
  );
};

export default Badge;
