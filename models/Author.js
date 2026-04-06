const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Book = require('./Book');

const Author = sequelize.define('Author', {
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
});

Author.hasMany(Book, { onDelete: 'CASCADE' });
Book.belongsTo(Author);

module.exports = Author;
