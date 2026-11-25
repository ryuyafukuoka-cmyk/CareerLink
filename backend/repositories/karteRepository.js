// 企業別カルテ（K-01〜K-03）のSQLをまとめる。完了済みの活動記録だけを読み取り、選考段階・備考や他の学生の下書きは取得しない。
const { query } = require('../db/pool');
const {
    ACTIVITY_TYPE_BY_ID,
    ACTIVITY_TYPE_ID_BY_VALUE,
    QUESTION_CATEGORY_BY_ID,
} = require('../common/constants');
const { fromDbDate } = require('../common/dateUtil');
const { parseFollowUps } = require('./recordRepository');

const FROM = `
    FROM activities a
    JOIN applications ap ON ap.application_id = a.application_id
    JOIN users o ON o.users_id = ap.owner_id`;
const BASE_WHERE = `a.record_status = 1 AND ap.company_id = ? AND o.graduation_year IS NOT NULL`;
const ORDER = 'ORDER BY o.graduation_year DESC, a.activity_date DESC, a.activity_id DESC';

// 任意の graduationYear と activityType を WHERE 条件に追加する。
function filterParts(filter) {
    const where = [];
    const params = [];
    if (filter.graduationYear !== undefined) {
        where.push('o.graduation_year = ?');
        params.push(filter.graduationYear);
    }
    if (filter.activityType !== undefined) {
        where.push(
            `EXISTS (SELECT 1 FROM activity_details ad
                     WHERE ad.activity_id = a.activity_id AND ad.activity_type_id = ?)`,
        );
        params.push(ACTIVITY_TYPE_ID_BY_VALUE[filter.activityType]);
    }
    return { sql: where.map((w) => ` AND ${w}`).join(''), params };
}

// K-01。企業の活動記録に所有者の卒業年度を付け、新しい年度から返す。
// 各項目は recordId、conductedOn、graduationYear、ownerUserId、ownerName、activityTypes を持つ。
async function listRecords(companyId, filter, executor) {
    const extra = filterParts(filter);
    const rows = await query(
        `SELECT a.activity_id AS id, a.activity_date AS conductedOn,
                o.graduation_year AS graduationYear, o.users_id AS ownerId,
                o.users_name AS ownerName
         ${FROM} WHERE ${BASE_WHERE}${extra.sql} ${ORDER}`,
        [companyId, ...extra.params],
        executor,
    );
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
        conductedOn: fromDbDate(r.conductedOn),
        graduationYear: Number(r.graduationYear),
        ownerUserId: String(r.ownerId),
        ownerName: r.ownerName,
        activityTypes: byActivity.get(r.id) ?? [],
    }));
}

// K-02。面接の質問をカテゴリ・深掘り質問とともに取得する。回答は含めない。
async function listInterviewInfo(companyId, filter, executor) {
    const extra = filterParts(filter);
    const rows = await query(
        `SELECT a.activity_id AS recordId, o.graduation_year AS graduationYear,
                a.activity_date AS conductedOn, q.question_category_id AS categoryId,
                q.question_text AS content, q.follow_up_questions AS followUps
         ${FROM}
         JOIN activity_details ad ON ad.activity_id = a.activity_id
         JOIN interviews i ON i.activity_detail_id = ad.activity_detail_id
         JOIN interview_questions q ON q.interview_id = i.interview_id
         WHERE ${BASE_WHERE}${extra.sql} AND q.question_text IS NOT NULL
         ${ORDER}, q.display_order ASC, q.interview_question_id ASC`,
        [companyId, ...extra.params],
        executor,
    );
    return rows.map((r) => ({
        recordId: String(r.recordId),
        graduationYear: Number(r.graduationYear),
        conductedOn: fromDbDate(r.conductedOn),
        category: r.categoryId === null ? null : QUESTION_CATEGORY_BY_ID[r.categoryId],
        content: r.content,
        followUps: parseFollowUps(r.followUps),
    }));
}

// K-03。試験名・形式、内容、対策を取得する。
async function listExamInfo(companyId, filter, executor) {
    const extra = filterParts(filter);
    const rows = await query(
        `SELECT a.activity_id AS recordId, o.graduation_year AS graduationYear,
                a.activity_date AS conductedOn, e.exam_name_format AS nameFormat,
                e.exam_content AS content, e.preparation AS preparation
         ${FROM}
         JOIN activity_details ad ON ad.activity_id = a.activity_id
         JOIN exams e ON e.activity_detail_id = ad.activity_detail_id
         WHERE ${BASE_WHERE}${extra.sql}
         ${ORDER}`,
        [companyId, ...extra.params],
        executor,
    );
    return rows.map((r) => ({
        recordId: String(r.recordId),
        graduationYear: Number(r.graduationYear),
        conductedOn: fromDbDate(r.conductedOn),
        nameFormat: r.nameFormat,
        content: r.content,
        preparation: r.preparation ?? null,
    }));
}

module.exports = { listRecords, listInterviewInfo, listExamInfo };
