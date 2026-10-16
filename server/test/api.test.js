process.env.NODE_ENV = 'test';

import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import bcrypt from 'bcrypt';

const { default: app } = await import('../src/app.js');
const { sequelize } = await import('../src/db.js');
const { User, Book, Loan, calcFine } = await import('../src/models.js');

const tokens = {};
let book;

async function loginAs(role) {
  const res = await request(app).post('/api/auth/login').send({ email: `${role}@test.com`, password: 'secret123' });
  assert.equal(res.status, 200);
  return res.body.token;
}

const as = (role) => ({ Authorization: `Bearer ${tokens[role]}` });

before(async () => {
  await sequelize.sync({ force: true });
  const passwordHash = await bcrypt.hash('secret123', 10);
  await User.bulkCreate(['admin', 'librarian', 'member'].map((role) => ({ name: role, email: `${role}@test.com`, role, passwordHash })));
  for (const role of ['admin', 'librarian', 'member']) tokens[role] = await loginAs(role);
});

after(() => sequelize.close());

describe('auth', () => {
  it('rejects a wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'member@test.com', password: 'nope' });
    assert.equal(res.status, 401);
  });

  it('registers new users as members even if a role is sent', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'New', email: 'new@test.com', password: 'secret123', role: 'admin' });
    assert.equal(res.status, 201);
    assert.equal(res.body.user.role, 'member');
    assert.equal(res.body.user.passwordHash, undefined);
  });

  it('requires passwords of at least 8 characters', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'Short', email: 'short@test.com', password: 'abc1234' });
    assert.equal(res.status, 400);
  });

  it('rejects duplicate emails', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'Dup', email: 'NEW@test.com', password: 'secret123' });
    assert.equal(res.status, 409);
  });

  it('requires a token', async () => {
    assert.equal((await request(app).get('/api/books')).status, 401);
  });
});

describe('role based access', () => {
  it('stops members from adding books', async () => {
    const res = await request(app).post('/api/books').set(as('member')).send({ title: 'X', author: 'Y', isbn: '9780000000001' });
    assert.equal(res.status, 403);
  });

  it('lets librarians add books', async () => {
    const res = await request(app).post('/api/books').set(as('librarian'))
      .send({ title: 'Clean Code', author: 'Robert C. Martin', isbn: '978-0132350884', totalCopies: 1 });
    assert.equal(res.status, 201);
    assert.equal(res.body.availableCopies, 1);
    book = res.body;
  });

  it('only lets admins change roles', async () => {
    const member = await User.findOne({ where: { email: 'new@test.com' } });
    const denied = await request(app).patch(`/api/users/${member.id}/role`).set(as('librarian')).send({ role: 'admin' });
    assert.equal(denied.status, 403);
    const ok = await request(app).patch(`/api/users/${member.id}/role`).set(as('admin')).send({ role: 'librarian' });
    assert.equal(ok.body.role, 'librarian');
  });

  it('lists admins first, then librarians, then members', async () => {
    const res = await request(app).get('/api/users').set(as('admin'));
    const rank = res.body.map((u) => ['admin', 'librarian', 'member'].indexOf(u.role));
    assert.deepEqual(rank, [...rank].sort());
  });

  it('hides staff accounts from librarians', async () => {
    const res = await request(app).get('/api/users').set(as('librarian'));
    assert.ok(res.body.every((u) => u.role === 'member'));
  });
});

describe('borrowing', () => {
  let loan;

  it('checks out a book and decrements copies', async () => {
    const res = await request(app).post('/api/loans').set(as('member')).send({ bookId: book.id });
    assert.equal(res.status, 201);
    loan = res.body;
    assert.equal((await Book.findByPk(book.id)).availableCopies, 0);
  });

  it('shows the borrower their loan and others when it is due back', async () => {
    const own = await request(app).get(`/api/books/${book.id}`).set(as('member'));
    assert.equal(own.body.myLoan.id, loan.id);
    const other = await request(app).get(`/api/books/${book.id}`).set(as('librarian'));
    assert.equal(other.body.myLoan, null);
    assert.ok(other.body.nextDueBack);
    assert.deepEqual(Object.keys(other.body.borrowers[0]).sort(), ['borrowedAt', 'dueDate', 'name']);
  });

  it('refuses when no copies are left', async () => {
    const res = await request(app).post('/api/loans').set(as('admin')).send({ bookId: book.id });
    assert.equal(res.status, 409);
  });

  it('blocks deleting a book with loan history', async () => {
    const res = await request(app).delete(`/api/books/${book.id}`).set(as('librarian'));
    assert.equal(res.status, 409);
  });

  it('only shows members their own loans', async () => {
    const staff = await request(app).get('/api/loans').set(as('librarian'));
    assert.equal(staff.body.length, 1);
    const other = await request(app).post('/api/auth/register').send({ name: 'Other', email: 'other@test.com', password: 'secret123' });
    const res = await request(app).get('/api/loans').set({ Authorization: `Bearer ${other.body.token}` });
    assert.equal(res.body.length, 0);
  });

  it('renews an active loan', async () => {
    const res = await request(app).patch(`/api/loans/${loan.id}/renew`).set(as('member'));
    assert.equal(res.status, 200);
    assert.equal(res.body.renewals, 1);
  });

  it('returns a book with a fine when overdue', async () => {
    await Loan.update({ dueDate: new Date(Date.now() - 3 * 86_400_000) }, { where: { id: loan.id } });
    const res = await request(app).patch(`/api/loans/${loan.id}/return`).set(as('member'));
    assert.equal(res.status, 200);
    assert.equal(res.body.fine, 30);
    assert.equal((await Book.findByPk(book.id)).availableCopies, 1);
  });

  it('does not return the same loan twice', async () => {
    const res = await request(app).patch(`/api/loans/${loan.id}/return`).set(as('member'));
    assert.equal(res.status, 409);
  });
});

describe('calcFine', () => {
  it('charges nothing when on time and ₹10 per late day', () => {
    const due = new Date('2026-01-10T12:00:00Z');
    assert.equal(calcFine(due, new Date('2026-01-09T12:00:00Z')), 0);
    assert.equal(calcFine(due, new Date('2026-01-12T12:00:00Z')), 20);
  });
});
