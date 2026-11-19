// The 30-second limit on new registrations (RD-01 / R-01). The last success time lives on the
// operator's users row; the DB clock is the only clock used (never Lambda memory or the client).
const { query } = require('../db/pool');

// Fixed column names (never input). Rounds and activity records have separate slots.
const COLUMN_BY_KIND = Object.freeze({
    round: 'last_application_created_at',
    activityRecord: 'last_activity_created_at',
});

// Locks the operator's users row (FOR UPDATE) and returns the microseconds since the last
// success: null when there was none yet, undefined when the user row does not exist.
// Call inside the creation transaction, so simultaneous creations are serialized.
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

// Records "now" as the last success. Same transaction as the creation, so a rollback keeps the
// old time.
async function markCreated(conn, userId, kind) {
    await query(
        `UPDATE users SET ${COLUMN_BY_KIND[kind]} = NOW(6) WHERE users_id = ?`,
        [userId],
        conn,
    );
}

module.exports = { lockAndGetElapsedMicros, markCreated };
