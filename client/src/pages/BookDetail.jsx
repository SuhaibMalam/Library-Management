import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarClock, Pencil, Trash2 } from 'lucide-react';
import { api, formatDate } from '../api';
import { useAuth } from '../AuthContext';
import { Alert, Avatar, Cover, Empty, LoanStatus, Spinner, isOverdue } from '../components/ui';

function Detail({ label, children }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 font-medium text-ink">{children}</dd>
    </div>
  );
}

export default function BookDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isStaff } = useAuth();
  const [book, setBook] = useState(null);
  const [loans, setLoans] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () =>
    Promise.all([api(`/books/${id}`), isStaff ? api(`/loans?bookId=${id}`) : Promise.resolve([])])
      .then(([b, l]) => {
        setBook(b);
        setLoans(l);
      })
      .catch((err) => setError(err.message));

  useEffect(() => {
    load();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function run(action, message) {
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const result = await action();
      setNotice(message(result));
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const borrow = () =>
    run(
      () => api('/loans', { method: 'POST', body: { bookId: book.id } }),
      (loan) => `Borrowed. Please return it by ${formatDate(loan.dueDate)}.`
    );
  const renew = () =>
    run(
      () => api(`/loans/${book.myLoan.id}/renew`, { method: 'PATCH' }),
      (loan) => `Renewed. New due date: ${formatDate(loan.dueDate)}.`
    );
  const giveBack = (loanId) =>
    run(
      () => api(`/loans/${loanId}/return`, { method: 'PATCH' }),
      (loan) => `Returned.${loan.fine ? ` Late fine: ₹${loan.fine}.` : ''}`
    );

  async function remove() {
    if (!window.confirm(`Delete "${book.title}" from the catalogue?`)) return;
    try {
      await api(`/books/${book.id}`, { method: 'DELETE' });
      navigate('/books', { replace: true });
    } catch (err) {
      setError(err.message);
    }
  }

  if (!book) return error ? <Alert>{error}</Alert> : <Spinner />;

  const onLoan = book.totalCopies - book.availableCopies;
  const active = loans.filter((l) => !l.returnedAt);
  const history = loans.filter((l) => l.returnedAt);
  const myLoan = book.myLoan;
  const myLoanOverdue = myLoan && new Date(myLoan.dueDate) < new Date();

  return (
    <>
      <Link to="/books" className="btn btn-ghost mb-4 -ml-3"><ArrowLeft /> Back to catalogue</Link>

      <Alert onClose={() => setError('')}>{error}</Alert>
      <Alert type="success" onClose={() => setNotice('')}>{notice}</Alert>

      <div className="card mb-6 flex flex-col gap-6 p-6 sm:flex-row">
        <Cover book={book} className="aspect-[2/3] w-40 shrink-0 self-start shadow-md" />

        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-xs font-semibold tracking-wide text-brand uppercase">{book.category}</span>
          <h1 className="mt-1 text-2xl font-bold">{book.title}</h1>
          <p className="mt-1 text-muted">by {book.author}</p>

          <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Detail label="ISBN">{book.isbn}</Detail>
            <Detail label="Published">{book.publishedYear || '—'}</Detail>
            <Detail label="Copies">{book.totalCopies}</Detail>
            <Detail label="On shelf">
              {book.availableCopies > 0 ? (
                <span className="text-brand">{book.availableCopies} available</span>
              ) : (
                <span className="text-danger">None</span>
              )}
            </Detail>
          </dl>

          {!isStaff && myLoan && (
            <div className={`mt-5 flex items-start gap-3 rounded-lg p-3.5 text-sm ${myLoanOverdue ? 'bg-danger-soft text-danger' : 'bg-brand-soft text-brand-dark'}`}>
              <CalendarClock className="mt-px size-4 shrink-0" />
              <span>
                {myLoanOverdue
                  ? `You have this book and it was due on ${formatDate(myLoan.dueDate)}. Please return it as soon as possible.`
                  : `You have this book. It's due back on ${formatDate(myLoan.dueDate)}.`}
              </span>
            </div>
          )}

          {!myLoan && book.nextDueBack && (
            <p className="mt-5 flex items-center gap-2 text-sm text-muted">
              <CalendarClock className="size-4" />
              All copies are out. The next one is due back on {formatDate(book.nextDueBack)}.
            </p>
          )}

          <div className="mt-auto flex flex-wrap gap-2 pt-6">
            {!isStaff && !myLoan && (
              <button className="btn btn-primary" disabled={busy || book.availableCopies < 1} onClick={borrow}>
                {book.availableCopies < 1 ? 'Unavailable' : busy ? 'Borrowing…' : 'Borrow this book'}
              </button>
            )}
            {!isStaff && myLoan && (
              <>
                <button className="btn btn-primary" disabled={busy} onClick={() => giveBack(myLoan.id)}>Return book</button>
                {!myLoanOverdue && myLoan.renewals < 2 && (
                  <button className="btn btn-secondary" disabled={busy} onClick={renew}>
                    Renew ({2 - myLoan.renewals} left)
                  </button>
                )}
              </>
            )}
            {isStaff && (
              <>
                <Link to={`/books/${book.id}/edit`} className="btn btn-secondary"><Pencil /> Edit book</Link>
                <button className="btn btn-danger" onClick={remove}><Trash2 /> Delete</button>
              </>
            )}
          </div>
        </div>
      </div>

      {!isStaff && book.borrowers.length > 0 && (
        <section className="card overflow-hidden">
          <div className="border-b border-line px-5 py-4">
            <h2 className="font-semibold">Currently borrowed by</h2>
            <p className="text-xs text-muted">{onLoan} of {book.totalCopies} copies are with members</p>
          </div>
          <ul className="divide-y divide-line">
            {book.borrowers.map((b, i) => {
              const late = new Date(b.dueDate) < new Date();
              return (
                <li key={i} className="flex items-center gap-3 px-5 py-3">
                  <Avatar name={b.name} className="size-8 text-xs" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-ink">{b.name}</p>
                    <p className="text-xs text-muted">Borrowed {formatDate(b.borrowedAt)}</p>
                  </div>
                  <span className={`badge ${late ? 'badge-red' : 'badge-gray'}`}>
                    {late ? 'Overdue since' : 'Due'} {formatDate(b.dueDate)}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {isStaff && (
        <>
          <section className="card mb-6 overflow-hidden">
            <div className="border-b border-line px-5 py-4">
              <h2 className="font-semibold">Currently checked out</h2>
              <p className="text-xs text-muted">{onLoan} of {book.totalCopies} copies are with members</p>
            </div>
            {active.length === 0 ? (
              <Empty title="All copies are on the shelf" />
            ) : (
              <div className="overflow-x-auto">
                <table className="table min-w-[560px]">
                  <thead>
                    <tr><th>Member</th><th>Checked out</th><th>Due</th><th>Status</th><th /></tr>
                  </thead>
                  <tbody>
                    {active.map((l) => (
                      <tr key={l.id}>
                        <td>
                          <div className="flex items-center gap-2.5">
                            <Avatar name={l.User.name} className="size-7 text-[11px]" />
                            <div>
                              {l.User.name}
                              <span className="block text-xs text-muted">{l.User.email}</span>
                            </div>
                          </div>
                        </td>
                        <td>{formatDate(l.borrowedAt)}</td>
                        <td className={isOverdue(l) ? 'font-medium text-danger' : ''}>{formatDate(l.dueDate)}</td>
                        <td><LoanStatus loan={l} /></td>
                        <td className="text-right">
                          <button className="btn btn-primary" disabled={busy} onClick={() => giveBack(l.id)}>Check in</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="card overflow-hidden">
            <div className="border-b border-line px-5 py-4">
              <h2 className="font-semibold">Borrowing history</h2>
              <p className="text-xs text-muted">Borrowed {loans.length} times in total</p>
            </div>
            {history.length === 0 ? (
              <Empty title="No past loans" />
            ) : (
              <div className="overflow-x-auto">
                <table className="table min-w-[560px]">
                  <thead>
                    <tr><th>Member</th><th>Checked out</th><th>Returned</th><th>Fine</th></tr>
                  </thead>
                  <tbody>
                    {history.map((l) => (
                      <tr key={l.id}>
                        <td>{l.User.name}</td>
                        <td>{formatDate(l.borrowedAt)}</td>
                        <td>{formatDate(l.returnedAt)}</td>
                        <td>{l.fine ? <span className="font-medium text-danger">₹{l.fine}</span> : <span className="text-muted">—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}
