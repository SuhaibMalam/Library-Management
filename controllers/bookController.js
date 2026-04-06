const { Book, Author } = require('../models');

exports.addBook = async (req, res) => {
    try {
        const { title, publishedYear, authorId } = req.body;
        const book = await Book.create({ title, publishedYear, AuthorId: authorId });
        res.status(201).json(book);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getAllBooks = async (req, res) => {
    try {
        const books = await Book.findAll({ include: Author });
        res.json(books);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
