import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeftRight, BookOpen, LayoutDashboard, LogOut, Menu, Users, X } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { Avatar, Logo } from './ui';

const ROLE_LABEL = { admin: 'Administrator', librarian: 'Librarian', member: 'Member' };

export default function Layout() {
  const { user, isStaff, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  const links = isStaff
    ? [
        ['/', 'Overview', LayoutDashboard],
        ['/books', 'Catalogue', BookOpen],
        ['/loans', 'Loans', ArrowLeftRight],
        ['/members', user.role === 'admin' ? 'Users' : 'Members', Users],
      ]
    : [
        ['/books', 'Catalogue', BookOpen],
        ['/loans', 'My loans', ArrowLeftRight],
      ];

  const signOut = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen lg:pl-64">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-card px-4 lg:hidden">
        <Logo />
        <button className="btn btn-ghost px-2" onClick={() => setOpen(true)} aria-label="Open menu">
          <Menu />
        </button>
      </header>

      {open && <div className="fixed inset-0 z-30 bg-ink/30 lg:hidden" onClick={() => setOpen(false)} />}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-line bg-card transition-transform lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <Logo />
          <button className="btn btn-ghost px-2 lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
            <X />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 px-3 py-4">
          <p className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-muted uppercase">Menu</p>
          {links.map(([to, label, Icon]) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive ? 'bg-brand-soft text-brand' : 'text-body hover:bg-subtle hover:text-ink'
                }`
              }
            >
              <Icon className="size-4.5" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-line p-3">
          <div className="flex items-center gap-3 rounded-lg p-2">
            <Avatar name={user.name} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
              <p className="truncate text-xs text-muted">{ROLE_LABEL[user.role]}</p>
            </div>
            <button className="btn btn-ghost px-2" onClick={signOut} title="Sign out" aria-label="Sign out">
              <LogOut />
            </button>
          </div>
        </div>
      </aside>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}
