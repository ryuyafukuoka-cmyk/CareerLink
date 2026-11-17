const { query } = require('../db/pool');
const { fromDbDateTime } = require('../common/dateUtil');

const targetTables = new Map([
    ['record', 'activities'],
    ['round', 'applications'],
    ['company', 'companies'],
    ['user', 'users'],
]);
const targetTypes = new Map(Array.from(targetTables, ([type, table]) => [table, type]));
const columns = `l.operation_log_id, l.users_id, u.users_name, l.operated_at,
    l.operation_type, l.target_table, l.target_id, l.operation_result`;
const source = ' FROM operation_logs l JOIN users u ON u.users_id = l.users_id';

function toLog(row) {
    return {
        logId: String(row.operation_log_id),
        operatorUserId: String(row.users_id),
        operatorName: row.users_name,
        operatedAt: fromDbDateTime(row.operated_at),
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
        ['l.operated_at >= ?', filters.start],
        ['l.operated_at <= ?', filters.end],
        ['l.users_id = ?', filters.operatorId],
        ['l.operation_type = ?', filters.operationType],
        ['l.target_table = ?', filters.table],
    ]) {
        if (value !== undefined) {
            conditions.push(clause);
            values.push(value);
        }
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

module.exports = { targetTables, list, find };
