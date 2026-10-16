import { Router } from 'express';
import { Op } from 'sequelize';
import { Loan, User, ROLES } from '../models.js';
import { HttpError, requireRole } from '../auth.js';

const router = Router();
const DEMO_ACCOUNTS = ['admin@library.com', 'librarian@library.com', 'member@library.com'];

router.get('/', requireRole('admin', 'librarian'), async (req, res) => {
  const where = {};
  // Librarians manage members only; admins see every account
  if (req.user.role === 'librarian') where.role = 'member';
  else if (ROLES.includes(req.query.role)) where.role = req.query.role;
  if (req.query.q) {
    const like = { [Op.like]: `%${req.query.q}%` };
    where[Op.or] = [{ name: like }, { email: like }];
  }
  // role is an ENUM, which MySQL sorts in declared order: admin, librarian, member
  res.json(await User.findAll({ where, order: [['role', 'ASC'], ['name', 'ASC']] }));
});

async function findOther(req) {
  const user = await User.findByPk(req.params.id);
  if (!user) throw new HttpError(404, 'User not found');
  if (user.id === req.user.id) throw new HttpError(400, 'You cannot change your own account here');
  // On the public demo the sign-in accounts must keep working for the next visitor
  if (process.env.DEMO_MODE === 'true' && DEMO_ACCOUNTS.includes(user.email)) {
    throw new HttpError(403, 'Demo accounts cannot be changed. Try it on a member you registered.');
  }
  return user;
}

router.patch('/:id/role', requireRole('admin'), async (req, res) => {
  if (!ROLES.includes(req.body.role)) throw new HttpError(400, `Role must be one of: ${ROLES.join(', ')}`);
  const user = await findOther(req);
  res.json(await user.update({ role: req.body.role }));
});

router.delete('/:id', requireRole('admin'), async (req, res) => {
  const user = await findOther(req);
  if (await Loan.count({ where: { userId: user.id } })) {
    throw new HttpError(409, 'This user has borrowing history and cannot be deleted');
  }
  await user.destroy();
  res.status(204).end();
});

export default router;
