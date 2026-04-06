const express = require('express');
const { addBook, getAllBooks } = require('../controllers/bookController');
const { checkRole } = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/', checkRole('Admin'), addBook);
router.get('/', getAllBooks);

module.exports = router;
