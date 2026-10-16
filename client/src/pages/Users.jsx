import { useEffect, useState } from 'react';
import { api, formatDate } from '../api';
import { useAuth } from '../AuthContext';
import { Search } from 'lucide-react';
import { Alert, Avatar, Empty, PageHeader, Spinner } from '../components/ui';

const ROLES = ['member', 'librarian', 'admin'];

export default function Users() {
  const { user: me } = useAuth();
  const isAdmin = me.role === 'admin';
  const [users, setUsers] = useState(null);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = (search = q) =>
    api(`/users${search ? `?q=${encodeURIComponent(search)}` : ''}`)
      .then(setUsers)
      .catch((err) => setError(err.message));

  useEffect(() => {
    load('');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function changeRole(user, role) {
    setError('');
    try {
      await api(`/users/${user.id}/role`, { method: 'PATCH', body: { role } });
      setNotice(`${user.name} is now a ${role}.`);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(user) {
    if (!window.confirm(`Delete the account for ${user.name}?`)) return;
    setError('');
    try {
      await api(`/users/${user.id}`, { method: 'DELETE' });
      setNotice(`${user.name}'s account was deleted.`);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <PageHeader
        title={isAdmin ? 'Users' : 'Members'}
        subtitle={isAdmin ? 'Manage accounts and staff roles' : 'Registered library members'}
      />

      <form
        className="mb-6 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setUsers(null);
          load();
        }}
      >
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <input className="input pl-9" placeholder="Search by name or email" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search users" />
        </div>
        <button className="btn btn-secondary h-10">Search</button>
      </form>

      <Alert onClose={() => setError('')}>{error}</Alert>
      <Alert type="success" onClose={() => setNotice('')}>{notice}</Alert>

      <div className="card overflow-x-auto">
        {!users ? (
          <Spinner />
        ) : users.length === 0 ? (
          <Empty title="No users found">Try a different name or email.</Empty>
        ) : (
          <table className="table min-w-[560px]">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined</th>
                {isAdmin && <th />}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} className="size-8 text-xs" />
                      <span className="font-medium text-ink">{u.name}</span>
                      {u.id === me.id && <span className="badge badge-gray">You</span>}
                    </div>
                  </td>
                  <td>{u.email}</td>
                  <td>
                    {isAdmin && u.id !== me.id ? (
                      <select className="input h-8 w-32 capitalize" value={u.role} onChange={(e) => changeRole(u, e.target.value)} aria-label={`Role for ${u.name}`}>
                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    ) : (
                      <span className={`badge capitalize ${u.role === 'member' ? 'badge-gray' : 'badge-green'}`}>{u.role}</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap">{formatDate(u.createdAt)}</td>
                  {isAdmin && (
                    <td className="text-right">
                      {u.id !== me.id && <button className="btn btn-danger" onClick={() => remove(u)}>Delete</button>}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
