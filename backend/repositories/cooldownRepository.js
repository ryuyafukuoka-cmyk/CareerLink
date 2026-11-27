// 新規登録（RD-01・R-01）の30秒制限。直前の成功時刻は操作者の users 行に保存し、経過時間はDBの時計で測る。
const { query } = require('../db/pool');

// 列名には固定値を使う。応募回と活動記録の最終作成時刻は別々に保持する。
const COLUMN_BY_KIND = Object.freeze({
    round: 'last_application_created_at',
    activityRecord: 'last_activity_created_at',
});

// 操作者の users 行を FOR UPDATE でロックし、前回の作成成功からの経過時間をマイクロ秒で返す。
// 初回なら null、ユーザー行がなければ undefined。作成と同じトランザクションで呼び、同時登録を順番に処理する。
async function lockAndGetElapsedMicros(conn, userId, kind) {
    const column = COLUMN_BY_KIND[kind];
    const rows = await query(
        `SELECT TIMESTAMPDIFF(MICROSECOND, ${column}, NOW(6)) AS elapsed
         FROM users WHERE users_id = ? FOR UPDATE`,
        [userId],
        conn,
    );
    if (rows.length === 0) return undefined;
    return rows[0].elapsed === null ? null : Number(rows[0].elapsed);
}

// 現在のDB時刻を最終成功時刻として記録する。作成と同じトランザクションなので、ロールバック時は以前の時刻が残る。
async function markCreated(conn, userId, kind) {
    await query(
        `UPDATE users SET ${COLUMN_BY_KIND[kind]} = NOW(6) WHERE users_id = ?`,
        [userId],
        conn,
    );
}

module.exports = { lockAndGetElapsedMicros, markCreated };
