const { query } = require('../db/pool');
const { fromDbDateTime } = require('../common/dateUtil');

const targetTables = new Map([
    ['record', 'activities'],
    ['round', 'applications'],
    ['company', 'companies'],
    ['user', 'users'],
]);
const targetTypes = new Map(Array.from(targetTables, ([type, table]) => [table, type]));
const columns = `l.operation_log_id, l.users_id, u.users_name,
    CONVERT_TZ(l.operated_at, @@session.time_zone, '+09:00') AS operatedAt,
    l.operation_type, l.target_table, l.target_id, l.operation_result`;
const source = ' FROM operation_logs l JOIN users u ON u.users_id = l.users_id';

function toLog(row) {
    return {
        logId: String(row.operation_log_id),
        operatorUserId: String(row.users_id),
        operatorName: row.users_name,
        operatedAt: fromDbDateTime(row.operatedAt),
        operationType: row.operation_type,
        targetType: targetTypes.get(row.target_table),
        targetId: row.target_id === null ? null : String(row.target_id),
        result: row.operation_result,
    };
}

async function list(filters, page) {
    const conditions = [];
    const values = [];
    for (const [clause, value] of [
        ["l.operated_at >= CONVERT_TZ(?, '+09:00', @@session.time_zone)", filters.start],
        ["l.operated_at <= CONVERT_TZ(?, '+09:00', @@session.time_zone)", filters.end],
        ['l.users_id = ?', filters.operatorId],
        ['l.target_table = ?', filters.table],
    ]) {
        if (value !== undefined) {
            conditions.push(clause);
            values.push(value);
        }
    }
    if (filters.operationType !== undefined) {
        const { matchingOperationTypes } = await import('../common/operationLogTypes.mjs');
        conditions.push('l.operation_type IN (?)');
        values.push(matchingOperationTypes(filters.operationType));
    }
    const where = conditions.length ? ' WHERE ' + conditions.join(' AND ') : '';
    const [count] = await query('SELECT COUNT(*) AS total' + source + where, values);
    const pageSize = 10;
    const rows = await query(
        'SELECT ' +
            columns +
            source +
            where +
            ' ORDER BY l.operated_at DESC, l.operation_log_id DESC LIMIT ? OFFSET ?',
        [...values, pageSize, (page - 1) * pageSize],
    );
    return { items: rows.map(toLog), totalCount: Number(count.total), page, pageSize };
}

async function find(id) {
    const [row] = await query('SELECT ' + columns + source + ' WHERE l.operation_log_id = ?', [id]);
    return row ? toLog(row) : null;
}

async function recordOperationLog(
    { operatorUserId, operationType, targetType, targetId, result },
    conn,
) {
    await query(
        `INSERT INTO operation_logs
            (users_id, operation_type, target_table, target_id, operation_result)
         VALUES (?, ?, ?, ?, ?)`,
        [operatorUserId, operationType, targetTables.get(targetType), targetId, result],
        conn,
    );
}

module.exports = { targetTables, list, find, recordOperationLog };
