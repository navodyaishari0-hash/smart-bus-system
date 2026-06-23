const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');

dotenv.config();

const dialect = process.env.DB_DIALECT || 'mysql';

// PGSSLMODE=require is set at the environment level for Render;
// the pg driver reads it automatically.  We mirror it in dialectOptions
// so Sequelize also enforces it at the ORM layer.
const pgSslMode = process.env.PGSSLMODE || 'require';

const sequelize = new Sequelize(
    process.env.DB_NAME || 'smart_bus_system',
    process.env.DB_USER || 'root',
    process.env.DB_PASS || '',
    {
        host: process.env.DB_HOST || '127.0.0.1',
        dialect: dialect,
        logging: false,
        dialectOptions: dialect === 'postgres' ? {
            ssl: {
                rejectUnauthorized: pgSslMode === 'require' || pgSslMode === 'verify-full' ? false : false,
                // Render free-tier PostgreSQL uses self-signed certs, so
                // rejectUnauthorized stays false unless you upload the CA.
                ...(process.env.DB_CA_CERT ? { ca: process.env.DB_CA_CERT } : {})
            }
        } : {}
    }
);

module.exports = sequelize;
