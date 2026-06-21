const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');

dotenv.config();

const dialect = process.env.DB_DIALECT || 'mysql';

const sequelize = new Sequelize(
    process.env.DB_NAME || 'smart_bus_system',
    process.env.DB_USER || 'root',
    process.env.DB_PASS || '',
    {
        host: process.env.DB_HOST || '127.0.0.1',
        dialect: dialect,
        logging: false,
        dialectOptions: dialect === 'postgres' ? {
            ssl: { rejectUnauthorized: false }
        } : {}
    }
);

module.exports = sequelize;
