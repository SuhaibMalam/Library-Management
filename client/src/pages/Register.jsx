import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { Alert, PasswordInput } from '../components/ui';
import { AuthShell } from './Login';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const tooShort = form.password.length > 0 && form.password.length < 8;

  async function submit(e) {
    e.preventDefault();
    if (form.password.length < 8) return setError('Password must be at least 8 characters');
    setError('');
    setBusy(true);
    try {
      await register(form);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Create your account" subtitle="Join the library to borrow and renew books online.">
      <Alert>{error}</Alert>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="name">Full name</label>
          <input id="name" required autoComplete="name" className="input" value={form.name} onChange={set('name')} />
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" required autoComplete="email" className="input" placeholder="you@example.com"
            value={form.email} onChange={set('email')} />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <PasswordInput id="password" required minLength={8} autoComplete="new-password"
            value={form.password} onChange={set('password')} aria-describedby="password-hint" />
          <p id="password-hint" className={`mt-1.5 text-xs ${tooShort ? 'text-danger' : 'text-muted'}`}>
            Must be at least 8 characters.
          </p>
        </div>
        <button className="btn btn-primary h-10 w-full" disabled={busy}>
          {busy ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p className="mt-5 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link to="/login" replace className="font-semibold text-brand hover:underline">Sign in</Link>
      </p>
    </AuthShell>
  );
}
