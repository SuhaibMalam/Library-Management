import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeftRight, BookOpen, Users } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { Alert, Logo, PasswordInput } from '../components/ui';

const FEATURES = [
  [BookOpen, 'Searchable catalogue', 'Find books by title, author or ISBN and see live availability.'],
  [ArrowLeftRight, 'Check out & check in', 'Due dates, renewals and late fines handled automatically.'],
  [Users, 'Role-based access', 'Separate views for admins, librarians and members.'],
];

export function AuthShell({ title, subtitle, children }) {
  return (
    <div className="flex min-h-screen bg-card">
      <aside className="relative hidden w-[44%] max-w-xl flex-col justify-between overflow-hidden bg-brand-dark p-10 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '22px 22px' }}
        />
        <div className="relative"><Logo light /></div>
        <div className="relative">
          <h2 className="max-w-sm text-3xl leading-tight font-bold text-white">Run your library from one place.</h2>
          <ul className="mt-8 space-y-5">
            {FEATURES.map(([Icon, heading, text]) => (
              <li key={heading} className="flex gap-3.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <Icon className="size-4.5" />
                </span>
                <div>
                  <p className="font-semibold">{heading}</p>
                  <p className="text-sm text-white/70">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-white/50">Library Management System</p>
      </aside>

      <main className="flex flex-1 items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden"><Logo /></div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="mt-1.5 mb-6 text-sm text-muted">{subtitle}</p>
          {children}
        </div>
      </main>
    </div>
  );
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [slow, setSlow] = useState(false);

  async function signIn(email, password) {
    setError('');
    setBusy(true);
    // The free API host sleeps when idle, so the first request can take a while
    const timer = setTimeout(() => setSlow(true), 4000);
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    } finally {
      clearTimeout(timer);
      setSlow(false);
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your library account.">
      <Alert>{error}</Alert>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          signIn(form.email, form.password);
        }}
        className="space-y-4"
      >
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" required autoComplete="email" className="input" placeholder="you@example.com"
            value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <PasswordInput id="password" required autoComplete="current-password"
            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <button className="btn btn-primary h-10 w-full" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        {slow && <p className="text-xs text-muted">Waking up the server, this can take up to a minute on the first visit.</p>}
      </form>
      <p className="mt-5 text-center text-sm text-muted">
        Don't have an account?{' '}
        <Link to="/register" replace className="font-semibold text-brand hover:underline">Sign up</Link>
      </p>
    </AuthShell>
  );
}
