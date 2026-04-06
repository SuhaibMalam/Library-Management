const { Author } = require('../models');

exports.addAuthor = async (req, res) => {
    try {
        const { name } = req.body;
        const author = await Author.create({ name });
        res.status(201).json(author);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getAllAuthors = async (req, res) => {
    try {
        const authors = await Author.findAll();
        res.json(authors);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
