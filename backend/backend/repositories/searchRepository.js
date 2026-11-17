// RDS access for the record search (S-01, S-03). SQL lives here only. Only completed records
// are ever searched. Values are always parameterized; LIKE wildcards in user input are escaped.
const { query } = require('../db/pool');
const { ACTIVITY_TYPE_BY_ID, ACTIVITY_TYPE_ID_BY_VALUE } = require('../common/constants');
const { fromDbDate } = require('../common/dateUtil');
const { containsWord } = require('../common/wordMatch');

const FROM = `
    FROM activities a
    JOIN applications ap ON ap.application_id = a.application_id
    JOIN companies c ON c.company_id = ap.company_id
    JOIN users o ON o.users_id = ap.owner_id`;
const ORDER = 'ORDER BY a.activity_date DESC, a.activity_id DESC';

function escapeLike(value) {
    return value.replace(/[\\%_]/g, '\\$&');
}

// One keyword matches when ANY searched field contains it (fields are OR):
// question text, answer, exam content, and the impressions of interview / exam / briefing / other.
const KEYWORD_CONDITION = `(
    EXISTS (SELECT 1 FROM activity_details ad
            JOIN interviews t ON t.activity_detail_id = ad.activity_detail_id
            LEFT JOIN interview_questions q ON q.interview_id = t.interview_id
            WHERE ad.activity_id = a.activity_id
              AND (q.question_text LIKE ? OR q.answer_text LIKE ? OR t.impressions LIKE ?))
    OR EXISTS (SELECT 1 FROM activity_details ad
            JOIN exams t ON t.activity_detail_id = ad.activity_detail_id
            WHERE ad.activity_id = a.activity_id
              AND (t.exam_content LIKE ? OR t.impressions LIKE ?))
    OR EXISTS (SELECT 1 FROM activity_details ad
            JOIN briefings t ON t.activity_detail_id = ad.activity_detail_id
            WHERE ad.activity_id = a.activity_id AND t.impressions LIKE ?)
    OR EXISTS (SELECT 1 FROM activity_details ad
            JOIN other_activities t ON t.activity_detail_id = ad.activity_detail_id
            WHERE ad.activity_id = a.activity_id AND t.impressions_advice LIKE ?)
)`;

// Different conditions are ANDed; several values of one condition are ORed; keyword tokens are ANDed.
function buildWhere(f) {
    const where = ['a.record_status = 1'];
    const params = [];
    if (f.companyName) {
        const pattern = `%${escapeLike(f.companyName)}%`;
        where.push('(c.company_name LIKE ? OR c.company_name_kana LIKE ?)');
        params.push(pattern, pattern);
    }
    if (f.graduationYear !== undefined) {
        where.push('o.graduation_year = ?');
        params.push(f.graduationYear);
    }
    if (f.activityTypes.length > 0) {
        where.push(
            `EXISTS (SELECT 1 FROM activity_details ad
                     WHERE ad.activity_id = a.activity_id AND ad.activity_type_id IN (?))`,
        );
        params.push(f.activityTypes.map((t) => ACTIVITY_TYPE_ID_BY_VALUE[t]));
    }
    if (f.dbFrom) {
        where.push('a.activity_date >= ?');
        params.push(f.dbFrom);
    }
    if (f.dbTo) {
        where.push('a.activity_date <= ?');
        params.push(f.dbTo);
    }
    if (f.regionIds.length > 0) {
        where.push(
            `EXISTS (SELECT 1 FROM company_locations cl
                     WHERE cl.company_id = c.company_id AND cl.prefecture_id IN (?))`,
        );
        params.push(f.regionIds);
    }
    // For "exact" this is only a pre-filter (a whole word is always also a substring).
    for (const token of f.tokens) {
        where.push(KEYWORD_CONDITION);
        const p = `%${escapeLike(token)}%`;
        params.push(p, p, p, p, p, p, p);
    }
    return { clause: `WHERE ${where.join(' AND ')}`, params };
}

// All searched texts of the given records (for the word-level check of "exact" mode).
async function loadSearchTexts(activityIds, executor) {
    if (activityIds.length === 0) return new Map();
    const JOIN = 'JOIN activity_details ad ON ad.activity_detail_id = t.activity_detail_id';
    const parts = [
        `SELECT ad.activity_id AS id, q.question_text AS txt FROM interview_questions q
         JOIN interviews t ON t.interview_id = q.interview_id ${JOIN}`,
        `SELECT ad.activity_id AS id, q.answer_text AS txt FROM interview_questions q
         JOIN interviews t ON t.interview_id = q.interview_id ${JOIN}`,
        `SELECT ad.activity_id AS id, t.impressions AS txt FROM interviews t ${JOIN}`,
        `SELECT ad.activity_id AS id, t.exam_content AS txt FROM exams t ${JOIN}`,
        `SELECT ad.activity_id AS id, t.impressions AS txt FROM exams t ${JOIN}`,
        `SELECT ad.activity_id AS id, t.impressions AS txt FROM briefings t ${JOIN}`,
        `SELECT ad.activity_id AS id, t.impressions_advice AS txt FROM other_activities t ${JOIN}`,
    ];
    const sql = parts.map((p) => `${p} WHERE ad.activity_id IN (?)`).join(' UNION ALL ');
    const rows = await query(
        sql,
        parts.map(() => activityIds),
        executor,
    );
    const byId = new Map();
    for (const { id, txt } of rows) {
        if (txt === null || txt === undefined) continue;
        if (!byId.has(id)) byId.set(id, []);
        byId.get(id).push(txt);
    }
    return byId;
}

// Rows -> RecordSearchItem[] (overview only: no excerpts, names or selection info).
async function toItems(rows, executor) {
    if (rows.length === 0) return [];
    const types = await query(
        `SELECT activity_id AS activityId, activity_type_id AS typeId
         FROM activity_details WHERE activity_id IN (?) ORDER BY activity_type_id ASC`,
        [rows.map((r) => r.id)],
        executor,
    );
    const byActivity = new Map();
    for (const { activityId, typeId } of types) {
        if (!byActivity.has(activityId)) byActivity.set(activityId, []);
        byActivity.get(activityId).push(ACTIVITY_TYPE_BY_ID[typeId]);
    }
    return rows.map((r) => ({
        recordId: String(r.id),
        companyId: String(r.companyId),
        companyName: r.companyName,
        activityTypes: byActivity.get(r.id) ?? [],
        conductedOn: fromDbDate(r.conductedOn),
        graduationYear: r.graduationYear === null ? null : Number(r.graduationYear),
    }));
}

const ITEM_COLUMNS = `a.activity_id AS id, c.company_id AS companyId, c.company_name AS companyName,
    a.activity_date AS conductedOn, o.graduation_year AS graduationYear`;

// S-01. filter comes from parseSearchQuery. One item per record; the count is per record too.
// Returns { items, totalCount }.
async function search(filter, executor) {
    const { clause, params } = buildWhere(filter);
    const offset = (filter.page - 1) * filter.pageSize;

    if (!filter.exact || filter.tokens.length === 0) {
        const count = await query(`SELECT COUNT(*) AS n ${FROM} ${clause}`, params, executor);
        const rows = await query(
            `SELECT ${ITEM_COLUMNS} ${FROM} ${clause} ${ORDER} LIMIT ? OFFSET ?`,
            [...params, filter.pageSize, offset],
            executor,
        );
        return { items: await toItems(rows, executor), totalCount: Number(count[0].n) };
    }

    // Exact (word) match: SQL narrows the candidates, then each keyword must equal a whole word of
    // one searched field (each keyword may match in a different field). Small data (< 30 users),
    // so the candidates are filtered here and paged afterwards.
    const candidates = await query(
        `SELECT a.activity_id AS id ${FROM} ${clause} ${ORDER}`,
        params,
        executor,
    );
    const ids = candidates.map((r) => r.id);
    const texts = await loadSearchTexts(ids, executor);
    const matched = ids.filter((id) =>
        filter.tokens.every((token) => (texts.get(id) ?? []).some((t) => containsWord(t, token))),
    );
    const pageIds = matched.slice(offset, offset + filter.pageSize);
    if (pageIds.length === 0) return { items: [], totalCount: matched.length };

    const rows = await query(
        `SELECT ${ITEM_COLUMNS} ${FROM} WHERE a.activity_id IN (?)`,
        [pageIds],
        executor,
    );
    rows.sort((a, b) => pageIds.indexOf(a.id) - pageIds.indexOf(b.id));
    return { items: await toItems(rows, executor), totalCount: matched.length };
}

// S-03. Graduation years that have completed records, newest first.
async function listGraduationYears(executor) {
    const rows = await query(
        `SELECT DISTINCT o.graduation_year AS year
         FROM activities a
         JOIN applications ap ON ap.application_id = a.application_id
         JOIN users o ON o.users_id = ap.owner_id
         WHERE a.record_status = 1 AND o.graduation_year IS NOT NULL
         ORDER BY o.graduation_year DESC`,
        [],
        executor,
    );
    return rows.map((r) => Number(r.year));
}

module.exports = { search, listGraduationYears };
