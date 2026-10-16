import jwt from 'jsonwebtoken';
import { User } from './models.js';

const SECRET = process.env.JWT_SECRET || 'dev-only-secret';

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const signToken = (user) =>
  jwt.sign({ sub: user.id, role: user.role }, SECRET, { expiresIn: '7d' });

export async function requireAuth(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) throw new HttpError(401, 'Authentication required');

  let payload;
  try {
    payload = jwt.verify(token, SECRET);
  } catch {
    throw new HttpError(401, 'Invalid or expired token');
  }
  // Load the user so deleted accounts and role changes take effect immediately
  req.user = await User.findByPk(payload.sub);
  if (!req.user) throw new HttpError(401, 'Account no longer exists');
  next();
}

export const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) throw new HttpError(403, 'You do not have permission for this action');
    next();
  };

export const isStaff = (user) => user.role === 'admin' || user.role === 'librarian';
