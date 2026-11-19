// MariaDB access. SQL lives only in repositories/; this file gives them a connection pool and a
// transaction helper. Services own the transaction boundary (詳細設計 層のルール).
const mysql = require('mysql2/promise');
const { config } = require('../common/config');

let pool = null;

// The pool is created on first use and reused across Lambda invocations.
function getPool() {
    if (!pool) {
        pool = mysql.createPool({
            host: config.db.host,
            port: config.db.port,
            user: config.db.user,
            password: config.db.password,
            database: config.db.database,
            connectionLimit: config.db.connectionLimit,
            charset: 'utf8mb4',
            timezone: '+09:00',
            // Large ids and DATETIME(6) are returned as-is; dates as strings (formatted in services).
            dateStrings: true,
            namedPlaceholders: false,
        });
    }
    return pool;
}

// Runs `sql` with `params` (always parameterized, never string-concatenated).
// `executor` is a transaction connection from withTransaction, or omitted to use the pool.
async function query(sql, params = [], executor = getPool()) {
    const [rows] = await executor.query(sql, params);
    return rows;
}

// Runs fn(conn) in one transaction: commit on success, rollback on any error (and rethrow).
async function withTransaction(fn) {
    const conn = await getPool().getConnection();
    try {
        await conn.beginTransaction();
        const result = await fn(conn);
        await conn.commit();
        return result;
    } catch (err) {
        try {
            await conn.rollback();
        } catch (rollbackErr) {
            console.error('Rollback failed:', rollbackErr);
        }
        throw err;
    } finally {
        conn.release();
    }
}

// MariaDB duplicate-key error (errno 1062).
function isDuplicateEntry(err) {
    return err?.code === 'ER_DUP_ENTRY' || err?.errno === 1062;
}

module.exports = { getPool, query, withTransaction, isDuplicateEntry };
