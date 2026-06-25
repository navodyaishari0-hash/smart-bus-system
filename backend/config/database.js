const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');

dotenv.config();

// Railway injects MYSQL_URL (internal) or MYSQL_PUBLIC_URL (external).
// Also check for a generic DATABASE_URL fallback or individual DB_* vars.
// MYSQL_URL (internal) is preferred when both backend and DB are on Railway.
// MYSQL_PUBLIC_URL is for external connections; DATABASE_URL is a generic fallback.
const connectionUrl = process.env.MYSQL_URL
    || process.env.MYSQL_PUBLIC_URL
    || process.env.DATABASE_URL
    || '';

let dbName, dbUser, dbPass, dbHost, dbPort, dbDialect;

if (connectionUrl) {
    // Parse mysql://user:pass@host:port/database
    const parsed = new URL(connectionUrl);
    dbUser   = decodeURIComponent(parsed.username);
    dbPass   = decodeURIComponent(parsed.password);
    dbHost   = parsed.hostname;
    dbPort   = parsed.port || '3306';
    dbName   = parsed.pathname.replace(/^\//, '');
    dbDialect = parsed.protocol.replace(/:$/, '') || 'mysql';
} else {
    dbName    = process.env.DB_NAME || 'railway';
    dbUser    = process.env.DB_USER || 'root';
    dbPass    = process.env.DB_PASS || '';
    dbHost    = process.env.DB_HOST || '127.0.0.1';
    dbPort    = process.env.DB_PORT || '3306';
    dbDialect = process.env.DB_DIALECT || 'mysql';
}

const sequelize = new Sequelize(dbName, dbUser, dbPass, {
    host: dbHost,
    port: parseInt(dbPort, 10),
    dialect: dbDialect,
    logging: false,
    pool: {
        max: 10,
        min: 0,
        acquire: 60000,
        idle: 15000
    },
    dialectOptions: {
        connectTimeout: 60000
    }
});

module.exports = sequelize;
