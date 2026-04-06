# 📚 Libary Management

A RESTful API for managing a college library system — books, authors, and users — built with **Node.js**, **Express**, **Sequelize ORM**, and **SQLite**.

---

## 🚀 Features

- Add and list **Books** with author associations
- Add and list **Authors** (one author can have many books)
- Add and list **Users** with role-based access (`Admin`, `Author`, `User`)
- Role-based middleware to restrict certain actions (e.g., only Admins can add books)

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| ORM | Sequelize |
| Database | SQLite |

---

## 📁 Project Structure

```
Clg App/
├── app.js                  # Entry point
├── config/
│   └── database.js         # Sequelize + SQLite setup
├── models/
│   ├── index.js            # Model registry
│   ├── User.js             # User model
│   ├── Author.js           # Author model (has many Books)
│   └── Book.js             # Book model (belongs to Author)
├── controllers/
│   ├── userController.js
│   ├── authorController.js
│   └── bookController.js
├── middleware/
│   └── authMiddleware.js   # Role-based access control
├── routes/
│   ├── userRoutes.js
│   ├── authorRoutes.js
│   └── bookRoutes.js
└── package.json
```

---

## ⚙️ Getting Started

### Prerequisites
- Node.js v14+
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/clg-app.git
cd clg-app

# Install dependencies
npm install

# Start the server
node app.js
```

Server runs at **http://localhost:3000**

---

## 📡 API Endpoints

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/users` | Create a new user |
| GET | `/api/users` | Get all users |

**POST `/api/users` — Request Body:**
```json
{
  "name": "Suhaib",
  "email": "suhaib@example.com",
  "role": "Admin"
}
```

---

### Authors
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/authors` | Add a new author |
| GET | `/api/authors` | Get all authors |

**POST `/api/authors` — Request Body:**
```json
{
  "name": "Robert C. Martin"
}
```

---

### Books
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/books` | Add a new book *(Admin only)* |
| GET | `/api/books` | Get all books (with author info) |

**POST `/api/books` — Request Body:**
```json
{
  "title": "Clean Code",
  "publishedYear": 2008,
  "authorId": 1,
  "role": "Admin"
}
```

> ⚠️ The `role` field must be `"Admin"` to add a book. Access is denied otherwise.

---

## 🗃️ Data Models

### User
| Field | Type | Notes |
|-------|------|-------|
| name | STRING | Required |
| email | STRING | Required, Unique |
| role | ENUM | `Admin`, `Author`, `User` (default: `User`) |

### Author
| Field | Type | Notes |
|-------|------|-------|
| name | STRING | Required |

### Book
| Field | Type | Notes |
|-------|------|-------|
| title | STRING | Required |
| publishedYear | INTEGER | Optional |
| AuthorId | FK | References Author |

---

## 📌 Notes

- The database auto-syncs on every server start (`sequelize.sync`)
- SQLite database is stored locally as `database.sqlite`
- This project is intended for learning purposes

---

## 👨‍💻 Author

**Suhaib** — Full Stack Web Developer
