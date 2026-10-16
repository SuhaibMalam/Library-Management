import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { api, formatDate } from '../api';
import { useAuth } from '../AuthContext';
import { Alert, Cover, Empty, PageHeader, Spinner } from '../components/ui';

export default function Books() {
  const { isStaff } = useAuth();
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState(params.get('q') || '');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState(null);

  const page = Number(params.get('page')) || 1;
  const category = params.get('category') || '';
  const available = params.get('available') === 'true';

  const update = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries({ page: 1, ...changes }).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next);
  };

  const load = () =>
    api(`/books?${params.toString()}`)
      .then(setData)
      .catch((err) => setError(err.message));

  useEffect(() => {
    setData(null);
    load();
  }, [params]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    api('/books/categories').then(setCategories).catch(() => {});
  }, []);

  async function borrow(book) {
    setError('');
    setNotice('');
    setBusyId(book.id);
    try {
      const loan = await api('/loans', { method: 'POST', body: { bookId: book.id } });
      setNotice(`"${book.title}" is checked out to you. Due back ${formatDate(loan.dueDate)}.`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function remove(book) {
    if (!window.confirm(`Delete "${book.title}" from the catalogue?`)) return;
    setError('');
    try {
      await api(`/books/${book.id}`, { method: 'DELETE' });
      setNotice(`"${book.title}" was removed.`);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <PageHeader title="Catalogue" subtitle={data ? `${data.total} titles in the collection` : 'Browse the collection'}>
        {isStaff && <Link to="/books/new" className="btn btn-primary"><Plus /> Add book</Link>}
      </PageHeader>

      <form
        className="card mb-6 flex flex-wrap items-center gap-3 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          update({ q: query.trim() });
        }}
      >
        <div className="relative min-w-0 flex-1 basis-64">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <input
            className="input pl-9"
            placeholder="Search by title, author or ISBN"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search"
          />
        </div>
        <select className="input w-full sm:w-48" value={category} onChange={(e) => update({ category: e.target.value })} aria-label="Category">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <label className="flex h-10 cursor-pointer items-center gap-2 px-1 text-sm font-medium text-ink">
          <input
            type="checkbox"
            className="size-4 accent-brand"
            checked={available}
            onChange={(e) => update({ available: e.target.checked && 'true' })}
          />
          Available only
        </label>
        <button className="btn btn-secondary h-10">Search</button>
      </form>

      <Alert onClose={() => setError('')}>{error}</Alert>
      <Alert type="success" onClose={() => setNotice('')}>{notice}</Alert>

      {!data ? (
        <Spinner />
      ) : data.books.length === 0 ? (
        <div className="card"><Empty title="No books found">Try a different search or category.</Empty></div>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))]">
          {data.books.map((book) => (
            <li key={book.id} className="card flex flex-col overflow-hidden p-3 transition hover:shadow-md">
              <Link to={`/books/${book.id}`} aria-label={`View ${book.title}`}>
                <Cover book={book} />
              </Link>
              <div className="mt-3 flex flex-1 flex-col">
                <span className="text-[11px] font-semibold tracking-wide text-brand uppercase">{book.category}</span>
                <h2 className="mt-0.5 line-clamp-2 leading-snug font-semibold">
                  <Link to={`/books/${book.id}`} className="hover:text-brand">{book.title}</Link>
                </h2>
                <p className="truncate text-xs text-muted">
                  {book.author}
                  {book.publishedYear ? ` · ${book.publishedYear}` : ''}
                </p>
                <div className="mt-2">
                  {book.availableCopies > 0 ? (
                    <span className="badge badge-green">{book.availableCopies} of {book.totalCopies} available</span>
                  ) : (
                    <span className="badge badge-red">All checked out</span>
                  )}
                </div>
                <div className="mt-auto flex gap-1.5 pt-3">
                  {!isStaff && (
                    <button
                      className="btn btn-primary w-full"
                      disabled={book.availableCopies < 1 || busyId === book.id}
                      onClick={() => borrow(book)}
                    >
                      {busyId === book.id ? 'Borrowing…' : book.availableCopies < 1 ? 'Unavailable' : 'Borrow'}
                    </button>
                  )}
                  {isStaff && (
                    <>
                      <Link to={`/books/${book.id}/edit`} className="btn btn-secondary flex-1"><Pencil /> Edit</Link>
                      <button className="btn btn-danger px-2.5" onClick={() => remove(book)} aria-label={`Delete ${book.title}`}>
                        <Trash2 />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {data && data.pages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <button className="btn btn-secondary" disabled={page <= 1} onClick={() => update({ page: page - 1 })}>
            Previous
          </button>
          <span className="text-sm text-muted">Page {page} of {data.pages}</span>
          <button className="btn btn-secondary" disabled={page >= data.pages} onClick={() => update({ page: page + 1 })}>
            Next
          </button>
        </div>
      )}
    </>
  );
}
