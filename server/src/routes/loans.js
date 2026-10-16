import { Router } from 'express';
import { Op } from 'sequelize';
import { sequelize } from '../db.js';
import { Book, Loan, User, LOAN_DAYS, MAX_ACTIVE_LOANS, MAX_RENEWALS, calcFine } from '../models.js';
import { HttpError, isStaff } from '../auth.js';

const router = Router();

const include = [
  { model: Book, attributes: ['id', 'title', 'author', 'isbn'] },
  { model: User, attributes: ['id', 'name', 'email'] },
];

router.get('/', async (req, res) => {
  const where = {};
  if (!isStaff(req.user)) where.userId = req.user.id;
  else if (req.query.userId) where.userId = req.query.userId;
  if (req.query.bookId) where.bookId = req.query.bookId;

  const { status } = req.query;
  if (status === 'returned') where.returnedAt = { [Op.ne]: null };
  if (status === 'active') where.returnedAt = null;
  if (status === 'overdue') Object.assign(where, { returnedAt: null, dueDate: { [Op.lt]: new Date() } });

  const loans = await Loan.findAll({ where, include, order: [['borrowedAt', 'DESC']], limit: 200 });
  res.json(loans);
});

router.post('/', async (req, res) => {
  const { bookId } = req.body;
  // Members always borrow for themselves; staff may issue a book to any member
  const userId = isStaff(req.user) && req.body.userId ? Number(req.body.userId) : req.user.id;

  const loan = await sequelize.transaction(async (transaction) => {
    const borrower = await User.findByPk(userId, { transaction });
    if (!borrower) throw new HttpError(404, 'Member not found');

    // Row lock prevents two concurrent borrows from taking the last copy
    const book = await Book.findByPk(bookId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!book) throw new HttpError(404, 'Book not found');
    if (book.availableCopies < 1) throw new HttpError(409, 'No copies of this book are currently available');

    const active = await Loan.findAll({ where: { userId, returnedAt: null }, transaction });
    if (active.some((l) => l.bookId === book.id)) throw new HttpError(409, 'This book is already borrowed by the member');
    if (active.length >= MAX_ACTIVE_LOANS) {
      throw new HttpError(409, `Borrowing limit reached (${MAX_ACTIVE_LOANS} books at a time)`);
    }

    await book.decrement('availableCopies', { transaction });
    return Loan.create(
      { userId, bookId: book.id, dueDate: new Date(Date.now() + LOAN_DAYS * 86_400_000) },
      { transaction }
    );
  });

  res.status(201).json(await Loan.findByPk(loan.id, { include }));
});

router.patch('/:id/return', async (req, res) => {
  await sequelize.transaction(async (transaction) => {
    const loan = await Loan.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!loan) throw new HttpError(404, 'Loan not found');
    if (!isStaff(req.user) && loan.userId !== req.user.id) throw new HttpError(403, 'You can only return your own loans');
    if (loan.returnedAt) throw new HttpError(409, 'This loan has already been returned');

    const returnedAt = new Date();
    await loan.update({ returnedAt, fine: calcFine(loan.dueDate, returnedAt) }, { transaction });
    await Book.increment('availableCopies', { where: { id: loan.bookId }, transaction });
  });

  res.json(await Loan.findByPk(req.params.id, { include }));
});

router.patch('/:id/renew', async (req, res) => {
  const loan = await Loan.findByPk(req.params.id);
  if (!loan) throw new HttpError(404, 'Loan not found');
  if (!isStaff(req.user) && loan.userId !== req.user.id) throw new HttpError(403, 'You can only renew your own loans');
  if (loan.returnedAt) throw new HttpError(409, 'This loan has already been returned');
  if (loan.dueDate < new Date()) throw new HttpError(409, 'Overdue loans cannot be renewed, please return the book');
  if (loan.renewals >= MAX_RENEWALS) throw new HttpError(409, `Renewal limit reached (${MAX_RENEWALS})`);

  await loan.update({
    dueDate: new Date(loan.dueDate.getTime() + LOAN_DAYS * 86_400_000),
    renewals: loan.renewals + 1,
  });
  res.json(await Loan.findByPk(loan.id, { include }));
});

export default router;
