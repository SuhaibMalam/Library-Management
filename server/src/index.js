import app from './app.js';
import { sequelize } from './db.js';

const PORT = process.env.PORT || 5000;

await sequelize.authenticate();
await sequelize.sync();
app.listen(PORT, () => console.log(`API listening on port ${PORT}`));
