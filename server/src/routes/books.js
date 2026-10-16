import { Router } from 'express';
import { Op } from 'sequelize';
import { Book, Loan, User } from '../models.js';
import { HttpError, requireRole } from '../auth.js';

const router = Router();
const staff = requireRole('admin', 'librarian');
const FIELDS = ['title', 'author', 'isbn', 'category', 'publishedYear', 'totalCopies'];

const pick = (body) => Object.fromEntries(FIELDS.filter((f) => body[f] !== undefined).map((f) => [f, body[f]]));

async function findBook(id) {
  const book = await Book.findByPk(id);
  if (!book) throw new HttpError(404, 'Book not found');
  return book;
}

router.get('/', async (req, res) => {
  const { q, category, available } = req.query;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 12));

  const where = {};
  if (q) {
    const like = { [Op.like]: `%${q}%` };
    where[Op.or] = [{ title: like }, { author: like }, { isbn: like }];
  }
  if (category) where.category = category;
  if (available === 'true') where.availableCopies = { [Op.gt]: 0 };

  const { rows, count } = await Book.findAndCountAll({
    where,
    order: [['title', 'ASC']],
    limit,
    offset: (page - 1) * limit,
  });
  res.json({ books: rows, total: count, page, pages: Math.max(1, Math.ceil(count / limit)) });
});

router.get('/categories', async (req, res) => {
  const rows = await Book.findAll({ attributes: ['category'], group: ['category'], order: [['category', 'ASC']] });
  res.json(rows.map((r) => r.category));
});

router.get('/:id', async (req, res) => {
  const book = await findBook(req.params.id);
  const active = await Loan.findAll({
    where: { bookId: book.id, returnedAt: null },
    attributes: ['id', 'userId', 'borrowedAt', 'dueDate', 'renewals'],
    include: [{ model: User, attributes: ['name'] }],
    order: [['dueDate', 'ASC']],
  });
  const mine = active.find((l) => l.userId === req.user.id);

  res.json({
    ...book.toJSON(),
    // Earliest date a copy should come back, only useful when the shelf is empty
    nextDueBack: book.availableCopies === 0 ? (active[0]?.dueDate ?? null) : null,
    myLoan: mine ? { id: mine.id, dueDate: mine.dueDate, renewals: mine.renewals } : null,
    // Names only: contact details stay visible to staff alone
    borrowers: active.map((l) => ({ name: l.User.name, borrowedAt: l.borrowedAt, dueDate: l.dueDate })),
  });
});

router.post('/', staff, async (req, res) => {
  const data = pick(req.body);
  const book = await Book.create({ ...data, availableCopies: data.totalCopies ?? 1 });
  res.status(201).json(book);
});

router.put('/:id', staff, async (req, res) => {
  const book = await findBook(req.params.id);
  const data = pick(req.body);

  // Changing total copies shifts available copies by the same amount, so books on loan stay accounted for
  if (data.totalCopies !== undefined) {
    const onLoan = book.totalCopies - book.availableCopies;
    if (data.totalCopies < onLoan) {
      throw new HttpError(409, `Cannot reduce copies below the ${onLoan} currently on loan`);
    }
    data.availableCopies = data.totalCopies - onLoan;
  }
  res.json(await book.update(data));
});

router.delete('/:id', staff, async (req, res) => {
  const book = await findBook(req.params.id);
  if (await Loan.count({ where: { bookId: book.id } })) {
    throw new HttpError(409, 'This book has borrowing history and cannot be deleted');
  }
  await book.destroy();
  res.status(204).end();
});

export default router;
