const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Book = sequelize.define('Book', {
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    publishedYear: {
        type: DataTypes.INTEGER,
    },
});

module.exports = Book;
