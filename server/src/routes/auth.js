import { Router } from 'express';
import bcrypt from 'bcrypt';
import rateLimit from 'express-rate-limit';
import { User } from '../models.js';
import { HttpError, requireAuth, signToken } from '../auth.js';

const router = Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { error: 'Too many attempts, please try again later' },
});

router.post('/register', limiter, async (req, res) => {
  const { name, email, password } = req.body;
  if (!password || password.length < 8) throw new HttpError(400, 'Password must be at least 8 characters');

  // Public sign-up always creates a member; staff accounts are promoted by an admin
  const created = await User.create({
    name,
    email,
    passwordHash: await bcrypt.hash(password, 10),
    role: 'member',
  });
  const user = await User.findByPk(created.id);
  res.status(201).json({ token: signToken(user), user });
});

router.post('/login', limiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new HttpError(400, 'Email and password are required');

  const user = await User.scope('withPassword').findOne({ where: { email: String(email).trim().toLowerCase() } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new HttpError(401, 'Invalid email or password');
  }
  const { passwordHash, ...safe } = user.toJSON();
  res.json({ token: signToken(user), user: safe });
});

router.get('/me', requireAuth, (req, res) => res.json(req.user));

export default router;
