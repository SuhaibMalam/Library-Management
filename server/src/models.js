import { DataTypes } from 'sequelize';
import { sequelize } from './db.js';

export const ROLES = ['admin', 'librarian', 'member'];
export const LOAN_DAYS = 14;
export const MAX_ACTIVE_LOANS = 3;
export const FINE_PER_DAY = 10;
export const MAX_RENEWALS = 2;

export const User = sequelize.define(
  'User',
  {
    name: { type: DataTypes.STRING(100), allowNull: false, validate: { notEmpty: true } },
    email: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
      set(v) {
        this.setDataValue('email', String(v).trim().toLowerCase());
      },
    },
    passwordHash: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.ENUM(...ROLES), allowNull: false, defaultValue: 'member' },
  },
  {
    defaultScope: { attributes: { exclude: ['passwordHash'] } },
    scopes: { withPassword: {} },
  }
);

export const Book = sequelize.define(
  'Book',
  {
    title: { type: DataTypes.STRING(200), allowNull: false, validate: { notEmpty: true } },
    author: { type: DataTypes.STRING(150), allowNull: false, validate: { notEmpty: true } },
    isbn: {
      type: DataTypes.STRING(17),
      allowNull: false,
      unique: true,
      validate: { is: /^[0-9-]{10,17}X?$/i },
    },
    category: { type: DataTypes.STRING(60), allowNull: false, defaultValue: 'General' },
    publishedYear: { type: DataTypes.INTEGER, validate: { min: 1000, max: 2100 } },
    totalCopies: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1, validate: { min: 1 } },
    availableCopies: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1, validate: { min: 0 } },
  },
  {
    validate: {
      copiesInRange() {
        if (this.availableCopies > this.totalCopies) {
          throw new Error('Available copies cannot exceed total copies');
        }
      },
    },
  }
);

export const Loan = sequelize.define('Loan', {
  borrowedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  dueDate: { type: DataTypes.DATE, allowNull: false },
  returnedAt: { type: DataTypes.DATE },
  fine: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  renewals: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
});

const fk = { allowNull: false };
User.hasMany(Loan, { foreignKey: { name: 'userId', ...fk }, onDelete: 'RESTRICT' });
Loan.belongsTo(User, { foreignKey: { name: 'userId', ...fk } });
Book.hasMany(Loan, { foreignKey: { name: 'bookId', ...fk }, onDelete: 'RESTRICT' });
Loan.belongsTo(Book, { foreignKey: { name: 'bookId', ...fk } });

export function calcFine(dueDate, returnedAt = new Date()) {
  // Only full days count, so a book returned a few hours late is not fined
  const lateDays = Math.floor((returnedAt - new Date(dueDate)) / 86_400_000);
  return Math.max(0, lateDays) * FINE_PER_DAY;
}
