const sequelize = require('../config/database');
const Author = require('./Author');
const Book = require('./Book');
const User = require('./User');

module.exports = { sequelize, Author, Book, User };
