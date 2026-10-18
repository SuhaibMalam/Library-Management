import app from './app.js';
import { sequelize } from './db.js';
import { User } from './models.js';
import { seed } from './seed.js';

const PORT = process.env.PORT || 5000;
const WEEK = 7 * 86_400_000;

await sequelize.authenticate();
await sequelize.sync();

// The demo's dates are relative to when it was seeded, so refresh it weekly
if (process.env.DEMO_MODE === 'true') {
  const admin = await User.findOne({ where: { email: 'admin@library.com' } });
  if (!admin || Date.now() - admin.createdAt > WEEK) console.log(await seed());
}

app.listen(PORT, () => console.log(`API listening on port ${PORT}`));
