const express = require('express');
const { addAuthor, getAllAuthors } = require('../controllers/authorController');
const router = express.Router();

router.post('/', addAuthor);
router.get('/', getAllAuthors);

module.exports = router;
