import 'dotenv/config';
import { Sequelize } from 'sequelize';

const {
  DB_HOST = 'localhost',
  DB_PORT = 3306,
  DB_NAME = 'library_dev',
  DB_USER = 'root',
  DB_PASSWORD = '',
  DB_SSL,
  DB_CA,
  NODE_ENV,
} = process.env;

export const sequelize = new Sequelize(
  NODE_ENV === 'test' ? 'library_test' : DB_NAME,
  DB_USER,
  DB_PASSWORD,
  {
    host: DB_HOST,
    port: Number(DB_PORT),
    dialect: 'mysql',
    logging: false,
    // Managed MySQL (e.g. Aiven) requires TLS; DB_CA holds the provider's CA certificate
    dialectOptions:
      DB_SSL === 'true'
        ? { ssl: { rejectUnauthorized: true, ca: DB_CA?.replace(/\\n/g, '\n') } }
        : {},
  }
);
