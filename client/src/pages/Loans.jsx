import { useEffect, useState } from 'react';
import { api, formatDate } from '../api';
import { useAuth } from '../AuthContext';
import { BookUp } from 'lucide-react';
import { Alert, Avatar, Cover, Empty, LoanStatus, PageHeader, Spinner } from '../components/ui';

const TABS = [
  ['active', 'On loan'],
  ['overdue', 'Overdue'],
  ['returned', 'Returned'],
  ['', 'All'],
];

function CheckoutForm({ onDone, onError }) {
  const [members, setMembers] = useState([]);
  const [books, setBooks] = useState([]);
  const [form, setForm] = useState({ userId: '', bookId: '' });
  const [busy, setBusy] = useState(false);

  const loadBooks = () => api('/books?available=true&limit=50').then((d) => setBooks(d.books));

  useEffect(() => {
    api('/users?role=member').then((users) => setMembers(users.filter((u) => u.role === 'member'))).catch(() => {});
    loadBooks().catch(() => {});
  }, []);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const loan = await api('/loans', { method: 'POST', body: form });
      setForm({ userId: '', bookId: '' });
      await loadBooks();
      onDone(`Checked out "${loan.Book.title}" to ${loan.User.name}, due ${formatDate(loan.dueDate)}.`);
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card mb-6 p-5">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="rounded-lg bg-brand-soft p-2 text-brand"><BookUp className="size-4" /></span>
        <div>
          <h2 className="font-semibold">Check out a book</h2>
          <p className="text-xs text-muted">Issue an available copy to a member for 14 days</p>
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-0 flex-1 basis-52">
        <label className="label" htmlFor="member">Member</label>
        <select id="member" required className="input" value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })}>
          <option value="">Select member…</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.name} ({m.email})</option>
          ))}
        </select>
      </div>
      <div className="min-w-0 flex-1 basis-64">
        <label className="label" htmlFor="book">Book</label>
        <select id="book" required className="input" value={form.bookId} onChange={(e) => setForm({ ...form, bookId: e.target.value })}>
          <option value="">Select available book…</option>
          {books.map((b) => (
            <option key={b.id} value={b.id}>{b.title} ({b.availableCopies} left)</option>
          ))}
        </select>
      </div>
      <button className="btn btn-primary h-10" disabled={busy}>{busy ? 'Checking out…' : 'Check out'}</button>
      </div>
    </form>
  );
}

export default function Loans() {
  const { isStaff } = useAuth();
  const [status, setStatus] = useState('active');
  const [loans, setLoans] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = () =>
    api(`/loans${status ? `?status=${status}` : ''}`)
      .then(setLoans)
      .catch((err) => setError(err.message));

  useEffect(() => {
    setLoans(null);
    load();
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  async function act(loan, action) {
    setError('');
    setNotice('');
    setBusyId(loan.id);
    try {
      const updated = await api(`/loans/${loan.id}/${action}`, { method: 'PATCH' });
      if (action === 'renew') setNotice(`Renewed "${loan.Book.title}". New due date: ${formatDate(updated.dueDate)}.`);
      else setNotice(`Checked in "${loan.Book.title}".${updated.fine ? ` Late fine: ₹${updated.fine}.` : ''}`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  const showMessage = (msg) => {
    setError('');
    setNotice(msg);
    load();
  };

  return (
    <>
      <PageHeader
        title={isStaff ? 'Loans' : 'My loans'}
        subtitle={isStaff ? 'Check out, renew and check in books' : 'Books are lent for 14 days and can be renewed twice. Late returns are fined ₹10 per day.'}
      />

      {isStaff && <CheckoutForm onDone={showMessage} onError={setError} />}

      <Alert onClose={() => setError('')}>{error}</Alert>
      <Alert type="success" onClose={() => setNotice('')}>{notice}</Alert>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between gap-3 overflow-x-auto border-b border-line px-4 py-3">
          <div className="inline-flex rounded-lg bg-subtle p-1">
            {TABS.map(([value, label]) => (
              <button
                key={label}
                onClick={() => setStatus(value)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition ${
                  status === value ? 'bg-card text-ink shadow-sm' : 'text-muted hover:text-ink'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {loans && <span className="text-xs whitespace-nowrap text-muted">{loans.length} loans</span>}
        </div>
        <div className="overflow-x-auto">
        {!loans ? (
          <Spinner />
        ) : loans.length === 0 ? (
          <Empty title="No loans to show">{isStaff ? 'Loans matching this filter will appear here.' : 'Borrow a book from the catalogue to get started.'}</Empty>
        ) : (
          <table className="table min-w-[720px]">
            <thead>
              <tr>
                <th>Title</th>
                {isStaff && <th>Member</th>}
                <th>Checked out</th>
                <th>Due</th>
                <th>Renewals</th>
                <th>Status</th>
                <th>Fine</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {loans.map((loan) => (
                <tr key={loan.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <Cover book={loan.Book} className="h-12 w-8 shrink-0" compact />
                      <div className="min-w-0">
                        <span className="font-medium text-ink">{loan.Book.title}</span>
                        <span className="block text-xs text-muted">{loan.Book.author}</span>
                      </div>
                    </div>
                  </td>
                  {isStaff && (
                    <td>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={loan.User.name} className="size-7 text-[11px]" />
                        <div>
                          {loan.User.name}
                          <span className="block text-xs text-muted">{loan.User.email}</span>
                        </div>
                      </div>
                    </td>
                  )}
                  <td className="whitespace-nowrap">{formatDate(loan.borrowedAt)}</td>
                  <td className="whitespace-nowrap">{loan.returnedAt ? <span className="text-muted">Returned {formatDate(loan.returnedAt)}</span> : formatDate(loan.dueDate)}</td>
                  <td>{loan.renewals} / 2</td>
                  <td><LoanStatus loan={loan} /></td>
                  <td>{loan.fine ? <span className="font-medium text-danger">₹{loan.fine}</span> : <span className="text-muted">—</span>}</td>
                  <td className="whitespace-nowrap text-right">
                    {!loan.returnedAt && (
                      <>
                        {new Date(loan.dueDate) > new Date() && loan.renewals < 2 && (
                          <button className="btn btn-secondary mr-1.5" disabled={busyId === loan.id} onClick={() => act(loan, 'renew')}>
                            Renew
                          </button>
                        )}
                        <button className="btn btn-primary" disabled={busyId === loan.id} onClick={() => act(loan, 'return')}>
                          {isStaff ? 'Check in' : 'Return'}
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        </div>
      </div>
    </>
  );
}
