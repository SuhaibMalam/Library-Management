import express from 'express';
import cors from 'cors';
import { BaseError, UniqueConstraintError, ValidationError, ForeignKeyConstraintError } from 'sequelize';
import { requireAuth, requireRole } from './auth.js';
import authRoutes from './routes/auth.js';
import bookRoutes from './routes/books.js';
import loanRoutes from './routes/loans.js';
import userRoutes from './routes/users.js';
import statsRoutes from './routes/stats.js';

const app = express();
// Render sits one proxy in front, so the rate limiter needs the real client IP
app.set('trust proxy', 1);

const origins = process.env.CLIENT_URL?.split(',').map((s) => s.trim());
app.use(cors(origins ? { origin: origins } : {}));
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/books', requireAuth, bookRoutes);
app.use('/api/loans', requireAuth, loanRoutes);
app.use('/api/users', requireAuth, userRoutes);
app.use('/api/stats', requireAuth, requireRole('admin', 'librarian'), statsRoutes);

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err, req, res, next) => {
  if (err instanceof UniqueConstraintError) {
    const field = Object.keys(err.fields || {})[0] || 'value';
    return res.status(409).json({ error: `A record with this ${field} already exists` });
  }
  if (err instanceof ValidationError) {
    return res.status(400).json({ error: err.errors.map((e) => e.message).join(', ') });
  }
  if (err instanceof ForeignKeyConstraintError) {
    return res.status(409).json({ error: 'This record is referenced by other records' });
  }
  if (err.status && !(err instanceof BaseError)) {
    return res.status(err.status).json({ error: err.status < 500 ? err.message : 'Something went wrong' });
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
});

export default app;
