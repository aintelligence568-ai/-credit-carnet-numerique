import React from 'react';
import { ClientStatus } from '../types';
import { AlertCircle, Clock, CheckCircle2, ShieldAlert, Check } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface StatusBadgeProps {
  status: ClientStatus;
  daysOverdue?: number;
  daysUntilDue?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  daysOverdue,
  daysUntilDue,
  className = '',
  size = 'md',
}) => {
  const { t } = useLanguage();

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs font-semibold',
    lg: 'px-3 py-1.5 text-sm font-semibold',
  };

  switch (status) {
    case 'BLOCKED':
      return (
        <span
          id="badge-blocked"
          className={`inline-flex items-center gap-1.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 ${sizeClasses[size]} ${className}`}
        >
          <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          {t.status_blocked}
        </span>
      );

    case 'OVERDUE':
      return (
        <span
          id="badge-overdue"
          className={`inline-flex items-center gap-1.5 rounded-full bg-red-100 text-red-800 border border-red-200 ${sizeClasses[size]} ${className}`}
        >
          <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
          {daysOverdue ? t.status_overdue_days.replace('{days}', String(daysOverdue)) : t.status_overdue}
        </span>
      );

    case 'DUE_SOON':
      return (
        <span
          id="badge-due-soon"
          className={`inline-flex items-center gap-1.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 ${sizeClasses[size]} ${className}`}
        >
          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          {daysUntilDue === 1
            ? t.status_due_tomorrow
            : daysUntilDue === 0
            ? t.status_due_today
            : t.status_due_soon}
        </span>
      );

    case 'SETTLED':
      return (
        <span
          id="badge-settled"
          className={`inline-flex items-center gap-1.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 ${sizeClasses[size]} ${className}`}
        >
          <Check className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          {t.status_settled}
        </span>
      );

    case 'UP_TO_DATE':
    default:
      return (
        <span
          id="badge-up-to-date"
          className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 ${sizeClasses[size]} ${className}`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          {t.status_up_to_date}
        </span>
      );
  }
};
