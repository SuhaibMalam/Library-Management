import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { Alert, PageHeader, Spinner } from '../components/ui';

const EMPTY = { title: '', author: '', isbn: '', category: '', publishedYear: '', totalCopies: 1 };

export default function BookForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(id ? null : EMPTY);
  const [onLoan, setOnLoan] = useState(0);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api('/books/categories').then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;
    api(`/books/${id}`)
      .then((book) => {
        setForm({ ...book, publishedYear: book.publishedYear ?? '' });
        setOnLoan(book.totalCopies - book.availableCopies);
      })
      .catch((err) => setError(err.message));
  }, [id]);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    const body = {
      ...form,
      category: form.category.trim() || 'General',
      publishedYear: form.publishedYear ? Number(form.publishedYear) : null,
      totalCopies: Number(form.totalCopies),
    };
    try {
      await api(id ? `/books/${id}` : '/books', { method: id ? 'PUT' : 'POST', body });
      navigate('/books');
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  if (!form) return error ? <Alert>{error}</Alert> : <Spinner />;

  return (
    <>
      <PageHeader title={id ? 'Edit book' : 'Add book'} subtitle={id ? form.title : 'Add a new title to the catalogue'} />
      <form onSubmit={submit} className="card max-w-2xl space-y-5 p-6">
        <Alert>{error}</Alert>
        <div>
          <label className="label" htmlFor="title">Title</label>
          <input id="title" required className="input" value={form.title} onChange={set('title')} />
        </div>
        <div>
          <label className="label" htmlFor="author">Author</label>
          <input id="author" required className="input" value={form.author} onChange={set('author')} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="isbn">ISBN</label>
            <input id="isbn" required className="input" placeholder="978-0132350884" value={form.isbn} onChange={set('isbn')} />
          </div>
          <div>
            <label className="label" htmlFor="category">Category</label>
            <input id="category" className="input" list="categories" placeholder="General" value={form.category} onChange={set('category')} />
            <datalist id="categories">
              {categories.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div>
            <label className="label" htmlFor="year">Year published</label>
            <input id="year" type="number" min="1000" max="2100" className="input" value={form.publishedYear} onChange={set('publishedYear')} />
          </div>
          <div>
            <label className="label" htmlFor="copies">Total copies</label>
            <input id="copies" type="number" min={Math.max(1, onLoan)} required className="input" value={form.totalCopies} onChange={set('totalCopies')} />
            {onLoan > 0 && <p className="mt-1 text-xs text-muted">{onLoan} currently checked out.</p>}
          </div>
        </div>
        <div className="flex gap-2 border-t border-line pt-4">
          <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          <Link to="/books" className="btn btn-secondary">Cancel</Link>
        </div>
      </form>
    </>
  );
}
