import bcrypt from 'bcrypt';
import { sequelize } from './db.js';
import { Book, Loan, User, LOAN_DAYS, calcFine } from './models.js';

const books = [
  ['Clean Code', 'Robert C. Martin', '978-0132350884', 'Software Engineering', 2008, 4],
  ['The Pragmatic Programmer', 'Andrew Hunt, David Thomas', '978-0135957059', 'Software Engineering', 2019, 3],
  ['Refactoring', 'Martin Fowler', '978-0134757599', 'Software Engineering', 2018, 2],
  ['Design Patterns', 'Erich Gamma et al.', '978-0201633610', 'Software Engineering', 1994, 2],
  ['Introduction to Algorithms', 'Thomas H. Cormen et al.', '978-0262046305', 'Computer Science', 2022, 5],
  ['Operating System Concepts', 'Abraham Silberschatz', '978-1119800361', 'Computer Science', 2021, 4],
  ['Computer Networks', 'Andrew S. Tanenbaum', '978-0132126953', 'Computer Science', 2010, 3],
  ['Database System Concepts', 'Abraham Silberschatz', '978-0078022159', 'Computer Science', 2019, 3],
  ['Let Us C', 'Yashavant Kanetkar', '978-9388511391', 'Programming', 2020, 6],
  ['Eloquent JavaScript', 'Marijn Haverbeke', '978-1593279509', 'Programming', 2018, 3],
  ["You Don't Know JS Yet", 'Kyle Simpson', '978-1091210099', 'Programming', 2020, 2],
  ['Effective Java', 'Joshua Bloch', '978-0134685991', 'Programming', 2017, 2],
  ['Head First Java', 'Kathy Sierra, Bert Bates', '978-1491910771', 'Programming', 2022, 3],
  ['Learning React', 'Alex Banks, Eve Porcello', '978-1492051725', 'Web Development', 2020, 2],
  ['Node.js Design Patterns', 'Mario Casciaro', '978-1839214110', 'Web Development', 2020, 2],
  ['Godaan', 'Munshi Premchand', '978-8171828425', 'Literature', 1936, 3],
  ['Gitanjali', 'Rabindranath Tagore', '978-8171673407', 'Literature', 1910, 2],
  ['The Guide', 'R. K. Narayan', '978-0143039648', 'Literature', 1958, 2],
  ['Train to Pakistan', 'Khushwant Singh', '978-0143065883', 'Literature', 1956, 2],
  ['The God of Small Things', 'Arundhati Roy', '978-0679457312', 'Literature', 1997, 1],
  ['To Kill a Mockingbird', 'Harper Lee', '978-0061120084', 'Literature', 1960, 2],
  ['1984', 'George Orwell', '978-0451524935', 'Literature', 1949, 3],
  ['Wings of Fire', 'A. P. J. Abdul Kalam', '978-8173711466', 'Biography', 1999, 4],
  ['The Story of My Experiments with Truth', 'M. K. Gandhi', '978-8172345662', 'Biography', 1927, 2],
  ['Steve Jobs', 'Walter Isaacson', '978-1451648539', 'Biography', 2011, 1],
  ['A Brief History of Time', 'Stephen Hawking', '978-0553380163', 'Science', 1988, 2],
  ['Sapiens', 'Yuval Noah Harari', '978-0062316097', 'History', 2015, 3],
  ['India After Gandhi', 'Ramachandra Guha', '978-0060958589', 'History', 2007, 1],
  ['Atomic Habits', 'James Clear', '978-0735211292', 'Self Help', 2018, 3],
  ['Rich Dad Poor Dad', 'Robert T. Kiyosaki', '978-1612680194', 'Finance', 1997, 2],
];

const users = [
  ['Admin User', 'admin@library.com', 'admin'],
  ['Priya Shah', 'librarian@library.com', 'librarian'],
  ['Rahul Patel', 'member@library.com', 'member'],
  ['Aisha Khan', 'aisha@library.com', 'member'],
  ['Karan Mehta', 'karan@library.com', 'member'],
  ['Neha Desai', 'neha@library.com', 'member'],
];

const day = 86_400_000;
const ago = (n) => new Date(Date.now() - n * day);

await sequelize.sync({ force: true });

const passwordHash = await bcrypt.hash('password123', 10);
const u = await User.bulkCreate(users.map(([name, email, role]) => ({ name, email, role, passwordHash })));
const b = await Book.bulkCreate(
  books.map(([title, author, isbn, category, publishedYear, totalCopies]) => ({
    title, author, isbn, category, publishedYear, totalCopies, availableCopies: totalCopies,
  }))
);

// [userIndex, bookIndex, borrowedDaysAgo, returnedDaysAgo | null]
const history = [
  [2, 0, 5, null], [2, 9, 20, null], [2, 22, 40, 30],
  [3, 4, 18, null], [3, 0, 60, 41], [3, 28, 10, null],
  [4, 26, 3, null], [4, 0, 35, 15], [4, 21, 50, 38],
  [5, 13, 25, null], [5, 22, 12, 4], [5, 4, 45, 33],
];

for (const [ui, bi, borrowed, returned] of history) {
  const borrowedAt = ago(borrowed);
  const dueDate = new Date(borrowedAt.getTime() + LOAN_DAYS * day);
  const returnedAt = returned === null ? null : ago(returned);
  const fine = returnedAt ? calcFine(dueDate, returnedAt) : 0;
  await Loan.create({ userId: u[ui].id, bookId: b[bi].id, borrowedAt, dueDate, returnedAt, fine });
  if (!returnedAt) await b[bi].decrement('availableCopies');
}

// Older, already returned loans so reports have a few weeks of history
let past = 0;
for (let i = 0; i < 36; i++) {
  const borrowed = 4 + ((i * 13) % 52);
  const returned = borrowed - (4 + (i % 13));
  if (returned < 1) continue;
  const borrowedAt = ago(borrowed);
  const dueDate = new Date(borrowedAt.getTime() + LOAN_DAYS * day);
  const returnedAt = ago(returned);
  await Loan.create({
    userId: u[2 + (i % 4)].id,
    bookId: b[(i * 7) % b.length].id,
    borrowedAt, dueDate, returnedAt,
    fine: calcFine(dueDate, returnedAt),
  });
  past++;
}

console.log(`Seeded ${u.length} users, ${b.length} books, ${history.length + past} loans`);
await sequelize.close();
