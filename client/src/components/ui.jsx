import { useState } from 'react';
import { AlertCircle, BookOpen, CheckCircle2, Eye, EyeOff, Inbox, X } from 'lucide-react';

export function Spinner({ label = 'Loading…' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted" role="status">
      <span className="size-4 animate-spin rounded-full border-2 border-line border-t-brand" />
      {label}
    </div>
  );
}

export function Alert({ children, type = 'error', onClose }) {
  if (!children) return null;
  const success = type === 'success';
  const Icon = success ? CheckCircle2 : AlertCircle;
  return (
    <div
      role="alert"
      className={`mb-4 flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm ${
        success ? 'border-brand/20 bg-brand-soft text-brand-dark' : 'border-danger/20 bg-danger-soft text-danger'
      }`}
    >
      <Icon className="mt-px size-4 shrink-0" />
      <span className="flex-1">{children}</span>
      {onClose && (
        <button onClick={onClose} className="opacity-60 hover:opacity-100" aria-label="Dismiss">
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}

export function Empty({ title = 'Nothing here yet', children }) {
  return (
    <div className="flex flex-col items-center px-4 py-14 text-center">
      <div className="mb-3 rounded-full bg-subtle p-3 text-muted">
        <Inbox className="size-5" />
      </div>
      <p className="font-semibold text-ink">{title}</p>
      {children && <p className="mt-1 text-sm text-muted">{children}</p>}
    </div>
  );
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export const isOverdue = (loan) => !loan.returnedAt && new Date(loan.dueDate) < new Date();

export function LoanStatus({ loan }) {
  if (loan.returnedAt) return <span className="badge badge-gray">Returned</span>;
  if (isOverdue(loan)) return <span className="badge badge-red">Overdue</span>;
  return <span className="badge badge-green">On loan</span>;
}

export function Avatar({ name, className = 'size-9 text-sm' }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <span className={`${className} inline-flex shrink-0 items-center justify-center rounded-full bg-brand-soft font-semibold text-brand`}>
      {initials}
    </span>
  );
}

export function PasswordInput({ id, ...props }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input id={id} type={visible ? 'text' : 'password'} className="input pr-10" {...props} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted hover:text-ink"
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-controls={id}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

// Covers come from Open Library by ISBN; books without one get a plain placeholder
export function Cover({ book, className = 'aspect-[2/3] w-full', compact = false }) {
  const [failed, setFailed] = useState(false);
  const isbn = book.isbn?.replace(/-/g, '');
  if (failed || !isbn) {
    return (
      <div className={`${className} flex flex-col items-center justify-center gap-2 rounded-lg bg-brand-soft p-3 text-center text-brand ${compact ? 'rounded-md p-0' : ''}`}>
        <BookOpen className={compact ? 'size-3.5 opacity-70' : 'size-6 opacity-70'} />
        {!compact && <span className="line-clamp-3 text-xs font-semibold">{book.title}</span>}
      </div>
    );
  }
  return (
    <img
      src={`https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg?default=false`}
      alt={`Cover of ${book.title}`}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`${className} ${compact ? 'rounded-md' : 'rounded-lg'} bg-subtle object-cover`}
    />
  );
}

export function Logo({ light }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={`flex size-9 items-center justify-center rounded-lg ${light ? 'bg-white/15' : 'bg-brand'} text-white`}>
        <BookOpen className="size-5" />
      </span>
      <span className={`text-lg font-bold tracking-tight ${light ? 'text-white' : 'text-ink'}`}>City Library</span>
    </div>
  );
}
