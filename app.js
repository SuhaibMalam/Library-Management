const express = require('express');
const { sequelize } = require('./models');
const bookRoutes = require('./routes/bookRoutes');
const authorRoutes = require('./routes/authorRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();
app.use(express.json());

app.use('/api/books', bookRoutes);
app.use('/api/authors', authorRoutes);
app.use('/api/users', userRoutes);

sequelize.sync({ force: true }).then(() => {
    console.log('Database synced!');
    app.listen(3000, () => console.log('Server running at http://localhost:3000'));
});
