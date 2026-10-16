import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Books from './pages/Books';
import BookForm from './pages/BookForm';
import BookDetail from './pages/BookDetail';
import Loans from './pages/Loans';
import Users from './pages/Users';
import Dashboard from './pages/Dashboard';
import { Spinner } from './components/ui';

function Protected({ roles, children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

// Login and sign-up pages are only for signed-out visitors; anyone signed in goes back to the app
function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (user) return <Navigate to="/" replace />;
  return children;
}

const STAFF = ['admin', 'librarian'];

export default function App() {
  const { isStaff } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
      <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
      <Route
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={isStaff ? <Dashboard /> : <Navigate to="/books" replace />} />
        <Route path="books" element={<Books />} />
        <Route path="books/:id" element={<BookDetail />} />
        <Route path="books/new" element={<Protected roles={STAFF}><BookForm /></Protected>} />
        <Route path="books/:id/edit" element={<Protected roles={STAFF}><BookForm /></Protected>} />
        <Route path="loans" element={<Loans />} />
        <Route path="members" element={<Protected roles={STAFF}><Users /></Protected>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
