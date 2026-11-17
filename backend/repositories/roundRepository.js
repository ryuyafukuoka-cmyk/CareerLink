// RDS access for applications and selection_history (DB設計). SQL lives here only.
// Every function takes an optional `executor` (a transaction connection) as its last argument.
const { query } = require('../db/pool');
const { STAGE_BY_ID, ACTIVITY_TYPE_BY_ID, RECORD_STATUS_BY_VALUE } = require('../common/constants');
const { fromDbDate, fromDbDateTime } = require('../common/dateUtil');

const ROUND_SELECT = `
    SELECT ap.application_id AS id, ap.owner_id AS ownerId, ap.company_id AS companyId,
           ap.application_date AS applicationDate, ap.selection_status_id AS statusId,
           ap.selection_notes AS statusNote
    FROM applications ap`;

// DB row -> API `ApplicationRound` (ids are strings, date is YYYY/MM/DD or null).
function toRound(row) {
    return {
        applicationRoundId: String(row.id),
        studentUserId: String(row.ownerId),
        companyId: String(row.companyId),
        applicationDate: fromDbDate(row.applicationDate),
        stage: STAGE_BY_ID[row.statusId],
        statusNote: row.statusNote ?? '',
    };
}

// Returns ApplicationRound | null. forUpdate (in a transaction) locks the row.
async function findById(id, executor, { forUpdate = false } = {}) {
    const rows = await query(
        `${ROUND_SELECT} WHERE ap.application_id = ?${forUpdate ? ' FOR UPDATE' : ''}`,
        [id],
        executor,
    );
    return rows.length ? toRound(rows[0]) : null;
}

// RD-02. filter: { studentId?: number, companyId?: number }. Newest round first.
async function list({ studentId, companyId } = {}, executor) {
    const where = [];
    const params = [];
    if (studentId !== undefined) {
        where.push('ap.owner_id = ?');
        params.push(studentId);
    }
    if (companyId !== undefined) {
        where.push('ap.company_id = ?');
        params.push(companyId);
    }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = await query(
        `${ROUND_SELECT} ${clause} ORDER BY ap.application_id DESC`,
        params,
        executor,
    );
    return rows.map(toRound);
}

// RD-01. New rounds always start at stage 1 (considering). dbDate: 'YYYY-MM-DD' | null.
async function insert(conn, { ownerId, companyId, dbDate }, userId) {
    const result = await query(
        `INSERT INTO applications
            (owner_id, company_id, application_date, selection_status_id, selection_notes, updated_by)
         VALUES (?, ?, ?, 1, NULL, ?)`,
        [ownerId, companyId, dbDate, userId],
        conn,
    );
    return result.insertId;
}

// RD-04. All three values are final (the service merged them with the current row).
async function update(conn, id, { statusId, statusNote, dbDate }, userId) {
    await query(
        `UPDATE applications
         SET selection_status_id = ?, selection_notes = ?, application_date = ?,
             updated_by = ?, updated_at = NOW()
         WHERE application_id = ?`,
        [statusId, statusNote, dbDate, userId, id],
        conn,
    );
}

// One history row per change: editor and time only, never old values (DB設計 selection_history).
async function insertHistory(conn, applicationId, userId) {
    await query(
        'INSERT INTO selection_history (application_id, updated_by) VALUES (?, ?)',
        [applicationId, userId],
        conn,
    );
}

// RD-06. Newest first.
async function listHistory(applicationId, executor) {
    const rows = await query(
        `SELECT sh.updated_by AS editorId, u.users_name AS editorName, sh.updated_at AS editedAt
         FROM selection_history sh
         JOIN users u ON u.users_id = sh.updated_by
         WHERE sh.application_id = ?
         ORDER BY sh.updated_at DESC, sh.selection_history_id DESC`,
        [applicationId],
        executor,
    );
    return rows.map((r) => ({
        editorUserId: String(r.editorId),
        editorName: r.editorName,
        editedAt: fromDbDateTime(r.editedAt),
    }));
}

// RD-05. Records of the round as ActivityRecordSummary[]; drafts only when includeDrafts.
async function listRecords(applicationId, includeDrafts, executor) {
    const rows = await query(
        `SELECT a.activity_id AS id, c.company_name AS companyName,
                a.activity_date AS conductedOn, a.updated_at AS updatedAt,
                a.record_status AS status
         FROM activities a
         JOIN applications ap ON ap.application_id = a.application_id
         JOIN companies c ON c.company_id = ap.company_id
         WHERE a.application_id = ?${includeDrafts ? '' : ' AND a.record_status = 1'}
         ORDER BY a.updated_at DESC, a.activity_id DESC`,
        [applicationId],
        executor,
    );
    if (rows.length === 0) return [];

    const details = await query(
        `SELECT activity_id AS activityId, activity_type_id AS typeId
         FROM activity_details WHERE activity_id IN (?)
         ORDER BY activity_type_id ASC`,
        [rows.map((r) => r.id)],
        executor,
    );
    const typesByActivity = new Map();
    for (const { activityId, typeId } of details) {
        if (!typesByActivity.has(activityId)) typesByActivity.set(activityId, []);
        typesByActivity.get(activityId).push(ACTIVITY_TYPE_BY_ID[typeId]);
    }
    return rows.map((r) => ({
        recordId: String(r.id),
        companyName: r.companyName,
        activityTypes: typesByActivity.get(r.id) ?? [],
        conductedOn: fromDbDate(r.conductedOn),
        updatedAt: fromDbDateTime(r.updatedAt),
        status: RECORD_STATUS_BY_VALUE[r.status],
    }));
}

// True when an interview question of this round has no category (RD-04 / E-216).
async function hasUncategorizedQuestions(applicationId, executor) {
    const rows = await query(
        `SELECT 1
         FROM interview_questions iq
         JOIN interviews i ON i.interview_id = iq.interview_id
         JOIN activity_details ad ON ad.activity_detail_id = i.activity_detail_id
         JOIN activities a ON a.activity_id = ad.activity_id
         WHERE a.application_id = ? AND iq.question_category_id IS NULL
         LIMIT 1`,
        [applicationId],
        executor,
    );
    return rows.length > 0;
}

module.exports = {
    findById,
    list,
    insert,
    update,
    insertHistory,
    listHistory,
    listRecords,
    hasUncategorizedQuestions,
};
