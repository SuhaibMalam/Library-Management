import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, BookCopy, Library, Users } from 'lucide-react';
import { api, formatDate } from '../api';
import { useAuth } from '../AuthContext';
import { Alert, Empty, PageHeader, Spinner } from '../components/ui';

function Stat({ icon: Icon, label, value, note, tone = 'brand' }) {
  const tones = { brand: 'bg-brand-soft text-brand', red: 'bg-danger-soft text-danger' };
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted">{label}</p>
        <span className={`rounded-lg p-2 ${tones[tone]}`}>
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-2 text-3xl font-bold text-ink">{value}</p>
      {note && <p className="mt-1 text-xs text-muted">{note}</p>}
    </div>
  );
}

function WeeklyChart({ weeks }) {
  const max = Math.max(1, ...weeks.map((w) => w.count));
  const total = weeks.reduce((sum, w) => sum + w.count, 0);
  return (
    <section className="card p-5">
      <div className="mb-5 flex items-baseline justify-between">
        <div>
          <h2 className="font-semibold">Loans per week</h2>
          <p className="text-xs text-muted">Last 8 weeks</p>
        </div>
        <p className="text-sm text-muted"><span className="font-semibold text-ink">{total}</span> loans</p>
      </div>
      <div className="flex h-40 items-end gap-2 sm:gap-3">
        {weeks.map((w) => (
          <div key={w.weekStart} className="group flex h-full flex-1 flex-col items-center justify-end gap-2">
            <span className="text-xs font-medium text-muted opacity-0 transition group-hover:opacity-100">{w.count}</span>
            <div
              className="w-full max-w-10 rounded-t-md bg-brand/80 transition group-hover:bg-brand"
              style={{ height: `${Math.max(4, (w.count / max) * 100)}%` }}
              title={`${w.count} loans, week of ${formatDate(w.weekStart)}`}
            />
            <span className="text-[11px] whitespace-nowrap text-muted">
              {new Date(w.weekStart).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [overdue, setOverdue] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api('/stats'), api('/loans?status=overdue')])
      .then(([s, o]) => {
        setStats(s);
        setOverdue(o);
      })
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <Alert>{error}</Alert>;
  if (!stats) return <Spinner />;

  const now = Date.now();
  const firstName = user.name.split(' ')[0];

  return (
    <>
      <PageHeader title={`Hello, ${firstName}`} subtitle="Here's what's happening at the library today.">
        <Link to="/loans" className="btn btn-primary">New check out</Link>
      </PageHeader>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={Library} label="Titles" value={stats.titles} note={`${stats.copies} copies in total`} />
        <Stat icon={BookCopy} label="On shelf" value={stats.available} note={`${stats.copies - stats.available} checked out`} />
        <Stat icon={Users} label="Members" value={stats.members} note={`${stats.activeLoans} active loans`} />
        <Stat icon={AlertTriangle} label="Overdue" value={stats.overdueLoans} note={`₹${stats.finesCollected} fines collected`} tone="red" />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3"><WeeklyChart weeks={stats.loansByWeek} /></div>

        <section className="card lg:col-span-2">
          <div className="border-b border-line px-5 py-4">
            <h2 className="font-semibold">Most borrowed</h2>
          </div>
          {stats.popular.length === 0 ? (
            <Empty title="No loans yet" />
          ) : (
            <ol className="divide-y divide-line">
              {stats.popular.map((p, i) => (
                <li key={p.bookId} className="flex items-center gap-3 px-5 py-3">
                  <span className="flex size-6 items-center justify-center rounded-full bg-subtle text-xs font-semibold text-muted">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{p.Book.title}</p>
                    <p className="truncate text-xs text-muted">{p.Book.author}</p>
                  </div>
                  <span className="badge badge-gray">{p.borrowCount} loans</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="font-semibold">Overdue loans</h2>
            <p className="text-xs text-muted">Books past their due date</p>
          </div>
          <Link to="/loans" className="btn btn-ghost">View all <ArrowRight /></Link>
        </div>
        {overdue.length === 0 ? (
          <Empty title="Nothing overdue">Every book is back on time.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="table min-w-[520px]">
              <thead>
                <tr><th>Book</th><th>Member</th><th>Due date</th><th>Late by</th></tr>
              </thead>
              <tbody>
                {overdue.map((l) => (
                  <tr key={l.id}>
                    <td className="font-medium text-ink">{l.Book.title}</td>
                    <td>{l.User.name}</td>
                    <td>{formatDate(l.dueDate)}</td>
                    <td><span className="badge badge-red">{Math.floor((now - new Date(l.dueDate)) / 86_400_000)} days</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
