import { Router } from 'express';
import { Op, fn, col } from 'sequelize';
import { Book, Loan, User } from '../models.js';

const router = Router();

router.get('/', async (req, res) => {
  const now = new Date();
  const [titles, copies, available, members, activeLoans, overdueLoans, finesCollected, popular] = await Promise.all([
    Book.count(),
    Book.sum('totalCopies'),
    Book.sum('availableCopies'),
    User.count({ where: { role: 'member' } }),
    Loan.count({ where: { returnedAt: null } }),
    Loan.count({ where: { returnedAt: null, dueDate: { [Op.lt]: now } } }),
    Loan.sum('fine'),
    Loan.findAll({
      attributes: ['bookId', [fn('COUNT', col('Loan.id')), 'borrowCount']],
      include: [{ model: Book, attributes: ['title', 'author'] }],
      group: ['bookId', 'Book.id'],
      order: [[fn('COUNT', col('Loan.id')), 'DESC']],
      limit: 5,
    }),
  ]);

  // Loans per week for the last 8 weeks, oldest first
  const WEEK = 7 * 86_400_000;
  const recent = await Loan.findAll({ attributes: ['borrowedAt'], where: { borrowedAt: { [Op.gte]: new Date(now - 8 * WEEK) } } });
  const loansByWeek = Array.from({ length: 8 }, (_, i) => ({ weekStart: new Date(now - (8 - i) * WEEK), count: 0 }));
  for (const { borrowedAt } of recent) {
    const i = 7 - Math.floor((now - borrowedAt) / WEEK);
    if (loansByWeek[i]) loansByWeek[i].count++;
  }

  res.json({
    loansByWeek,
    titles,
    copies: copies || 0,
    available: available || 0,
    members,
    activeLoans,
    overdueLoans,
    finesCollected: finesCollected || 0,
    popular,
  });
});

export default router;
