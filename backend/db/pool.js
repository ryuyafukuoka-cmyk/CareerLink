// リポジトリに MariaDB の接続プールとトランザクション処理を提供する。
// SQLはリポジトリに置き、どこまでを1トランザクションにするかはサービスが決める（詳細設計の層のルール）。
const mysql = require('mysql2/promise');
const { config } = require('../common/config');

let pool = null;

// 接続プールは初回利用時に作成し、同じ Lambda 実行環境で再利用する。
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
            // 大きなIDと DATETIME(6) の精度を保つ。日時は文字列で受け取り、サービスで整形する。
            dateStrings: true,
            namedPlaceholders: false,
        });
    }
    return pool;
}

// SQLとパラメーターを分けて渡す。executor があればトランザクション接続を、省略時はプールを使う。
async function query(sql, params = [], executor = getPool()) {
    const [rows] = await executor.query(sql, params);
    return rows;
}

// fn(conn) を1トランザクションで実行する。成功時はコミットし、例外時はロールバックして再送出する。
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

// MariaDB のキー重複エラー（エラー番号1062）。
function isDuplicateEntry(err) {
    return err?.code === 'ER_DUP_ENTRY' || err?.errno === 1062;
}

module.exports = { getPool, query, withTransaction, isDuplicateEntry };
