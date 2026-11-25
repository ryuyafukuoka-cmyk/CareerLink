// activities と活動種別ごとのテーブルのSQLをまとめる（DB設計）。末尾の任意引数 executor にトランザクション接続を渡せる。
const { query } = require('../db/pool');
const {
    ACTIVITY_TYPE_BY_ID,
    ACTIVITY_TYPE_ID_BY_VALUE,
    QUESTION_CATEGORY_BY_ID,
    QUESTION_CATEGORY_ID_BY_NAME,
    RECORD_STATUS_BY_VALUE,
    RECORD_STATUS_VALUE,
} = require('../common/constants');
const { fromDbDate, fromDbDateTime } = require('../common/dateUtil');

// follow_up_questions はJSON配列を文字列で保持する。旧データには改行区切りの形式もある。
function parseFollowUps(value) {
    if (value === null || value === undefined || value === '') return [];
    try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
        // 旧形式の読み取りに進む。
    }
    return String(value)
        .split('\n')
        .map((v) => v.trim())
        .filter(Boolean);
}

// 記録をAPIの形式で返し、なければ null を返す。forUpdate は活動記録と応募回の行をロックする。
// 先に企業行をロックし、企業 → 応募回 → 活動記録の順序を守る。
async function findById(id, executor, { forUpdate = false } = {}) {
    const rows = await query(
        `SELECT a.activity_id AS id, a.application_id AS roundId, ap.company_id AS companyId,
                ap.owner_id AS ownerId, a.created_by AS createdBy, a.updated_by AS updatedBy,
                a.activity_date AS conductedOn, a.record_status AS status,
                CONVERT_TZ(a.created_at, @@session.time_zone, '+09:00') AS createdAt,
                CONVERT_TZ(a.updated_at, @@session.time_zone, '+09:00') AS updatedAt
         FROM activities a
         JOIN applications ap ON ap.application_id = a.application_id
         WHERE a.activity_id = ?${forUpdate ? ' FOR UPDATE' : ''}`,
        [id],
        executor,
    );
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
        recordId: String(r.id),
        applicationRoundId: String(r.roundId),
        companyId: String(r.companyId),
        ownerUserId: String(r.ownerId),
        createdByUserId: String(r.createdBy),
        lastEditedByUserId: String(r.updatedBy),
        conductedOn: fromDbDate(r.conductedOn),
        status: RECORD_STATUS_BY_VALUE[r.status],
        createdAt: fromDbDateTime(r.createdAt),
        updatedAt: fromDbDateTime(r.updatedAt),
    };
}

// 記録に含まれる活動種別と、その種別のセクションだけをAPIの形式で取得する。
async function loadContent(activityId, executor) {
    const ids = [activityId];
    const details = await query(
        `SELECT activity_type_id AS typeId FROM activity_details
         WHERE activity_id = ? ORDER BY activity_type_id ASC`,
        ids,
        executor,
    );
    const activityTypes = details.map((d) => ACTIVITY_TYPE_BY_ID[d.typeId]);
    const sections = {};
    const JOIN = 'JOIN activity_details ad ON ad.activity_detail_id = t.activity_detail_id';

    if (activityTypes.includes('interview')) {
        const [i] = await query(
            `SELECT t.interview_id AS id, t.duration_minutes AS durationMinutes,
                    t.interview_format AS interviewFormat, t.interviewer_count AS interviewerCount,
                    t.impressions AS impression, t.cautions AS caution, t.advice AS advice
             FROM interviews t ${JOIN} WHERE ad.activity_id = ?`,
            ids,
            executor,
        );
        const questions = await query(
            `SELECT q.question_category_id AS categoryId, q.question_text AS content,
                    q.answer_text AS answer, q.follow_up_questions AS followUps
             FROM interview_questions q WHERE q.interview_id = ?
             ORDER BY q.display_order ASC, q.interview_question_id ASC`,
            [i.id],
            executor,
        );
        sections.interview = {
            durationMinutes: i.durationMinutes === null ? null : Number(i.durationMinutes),
            interviewFormat: i.interviewFormat,
            interviewerCount: i.interviewerCount === null ? null : Number(i.interviewerCount),
            questions: questions.map((q) => ({
                category: q.categoryId === null ? null : QUESTION_CATEGORY_BY_ID[q.categoryId],
                content: q.content,
                answer: q.answer,
                followUps: parseFollowUps(q.followUps),
            })),
            impression: i.impression,
            caution: i.caution,
            adviceToJuniors: i.advice,
        };
    }
    if (activityTypes.includes('exam')) {
        const [e] = await query(
            `SELECT t.exam_name_format AS nameFormat, t.duration_minutes AS duration,
                    t.exam_content AS content, t.impressions AS impression,
                    t.difficulty AS difficulty, t.preparation AS preparation, t.cautions AS caution
             FROM exams t ${JOIN} WHERE ad.activity_id = ?`,
            ids,
            executor,
        );
        sections.exam = { ...e, duration: e.duration === null ? null : Number(e.duration) };
    }
    if (activityTypes.includes('briefing')) {
        const [b] = await query(
            `SELECT t.impressions AS impression, t.learned_info AS newInfo,
                    t.key_points AS keyPoints, t.questions_answers AS qa
             FROM briefings t ${JOIN} WHERE ad.activity_id = ?`,
            ids,
            executor,
        );
        sections.briefing = { ...b };
    }
    if (activityTypes.includes('other')) {
        const [o] = await query(
            `SELECT t.activity_name AS activityName, t.activity_content AS content,
                    t.impressions_advice AS impressionAdvice, t.key_points AS keyPoints
             FROM other_activities t ${JOIN} WHERE ad.activity_id = ?`,
            ids,
            executor,
        );
        sections.other = { ...o };
    }
    return { activityTypes, sections };
}

async function insertActivity(conn, { roundId, dbDate, status }, userId) {
    const result = await query(
        `INSERT INTO activities (application_id, created_by, activity_date, record_status, updated_by)
         VALUES (?, ?, ?, ?, ?)`,
        [roundId, userId, dbDate, RECORD_STATUS_VALUE[status], userId],
        conn,
    );
    return result.insertId;
}

async function updateActivity(conn, id, { dbDate, status }, userId) {
    await query(
        `UPDATE activities
         SET activity_date = ?, record_status = ?, updated_by = ?, updated_at = NOW()
         WHERE activity_id = ?`,
        [dbDate, RECORD_STATUS_VALUE[status], userId, id],
        conn,
    );
}

// 1件の活動記録に属する種別別の行と activity_details を、子から順に削除する。
async function deleteContent(conn, activityId) {
    const VIA = 'JOIN activity_details ad ON ad.activity_detail_id = t.activity_detail_id';
    await query(
        `DELETE q FROM interview_questions q
         JOIN interviews t ON t.interview_id = q.interview_id ${VIA}
         WHERE ad.activity_id = ?`,
        [activityId],
        conn,
    );
    for (const table of ['interviews', 'exams', 'briefings', 'other_activities']) {
        await query(`DELETE t FROM ${table} t ${VIA} WHERE ad.activity_id = ?`, [activityId], conn);
    }
    await query('DELETE FROM activity_details WHERE activity_id = ?', [activityId], conn);
}

// parseRecordContent で正規化した内容に置き換える。選択した種別ごとに activity_details と種別別テーブルへ1行ずつ保存する。
async function replaceContent(conn, activityId, { activityTypes, sections }) {
    await deleteContent(conn, activityId);
    for (const type of activityTypes) {
        const detail = await query(
            'INSERT INTO activity_details (activity_id, activity_type_id) VALUES (?, ?)',
            [activityId, ACTIVITY_TYPE_ID_BY_VALUE[type]],
            conn,
        );
        const detailId = detail.insertId;
        const s = sections[type];

        if (type === 'interview') {
            const result = await query(
                `INSERT INTO interviews (activity_detail_id, duration_minutes, interview_format,
                    interviewer_count, impressions, cautions, advice)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    detailId,
                    s.durationMinutes,
                    s.interviewFormat,
                    s.interviewerCount,
                    s.impression,
                    s.caution,
                    s.adviceToJuniors,
                ],
                conn,
            );
            for (const [i, q] of s.questions.entries()) {
                await query(
                    `INSERT INTO interview_questions (interview_id, question_category_id,
                        question_text, answer_text, follow_up_questions, display_order)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        result.insertId,
                        QUESTION_CATEGORY_ID_BY_NAME[q.category] ?? null,
                        q.content,
                        q.answer,
                        q.followUps.length ? JSON.stringify(q.followUps) : null,
                        i + 1,
                    ],
                    conn,
                );
            }
        } else if (type === 'exam') {
            await query(
                `INSERT INTO exams (activity_detail_id, exam_name_format, duration_minutes,
                    exam_content, difficulty, preparation, impressions, cautions)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    detailId,
                    s.nameFormat,
                    s.duration,
                    s.content,
                    s.difficulty,
                    s.preparation,
                    s.impression,
                    s.caution,
                ],
                conn,
            );
        } else if (type === 'briefing') {
            await query(
                `INSERT INTO briefings (activity_detail_id, learned_info, key_points,
                    questions_answers, impressions)
                 VALUES (?, ?, ?, ?, ?)`,
                [detailId, s.newInfo, s.keyPoints, s.qa, s.impression],
                conn,
            );
        } else if (type === 'other') {
            await query(
                `INSERT INTO other_activities (activity_detail_id, activity_name, activity_content,
                    key_points, impressions_advice)
                 VALUES (?, ?, ?, ?, ?)`,
                [detailId, s.activityName, s.content, s.keyPoints, s.impressionAdvice],
                conn,
            );
        }
    }
}

// R-09。活動記録とその配下のデータを物理削除する。1トランザクション内で呼ぶ。
async function deleteWithChildren(conn, activityId) {
    await deleteContent(conn, activityId);
    await query('DELETE FROM activity_history WHERE activity_id = ?', [activityId], conn);
    await query('DELETE FROM activities WHERE activity_id = ?', [activityId], conn);
}

// 編集のたびに履歴を1行追加し、編集者と日時だけを記録する（DB設計 activity_history）。
async function insertHistory(conn, activityId, userId) {
    await query(
        'INSERT INTO activity_history (activity_id, updated_by) VALUES (?, ?)',
        [activityId, userId],
        conn,
    );
}

// 任意の ownerId と status（draft または completed）で絞り込み、ActivityRecordSummary の配列を返す。
// 下書きを更新日時の降順で先に並べ、その後に完了済み記録を実施日の降順で並べる。
async function listSummaries({ ownerId, status } = {}, executor) {
    const where = [];
    const params = [];
    if (ownerId !== undefined) {
        where.push('ap.owner_id = ?');
        params.push(ownerId);
    }
    if (status !== undefined) {
        where.push('a.record_status = ?');
        params.push(RECORD_STATUS_VALUE[status]);
    }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = await query(
        `SELECT a.activity_id AS id, c.company_name AS companyName,
                a.activity_date AS conductedOn, CONVERT_TZ(a.updated_at, @@session.time_zone, '+09:00') AS updatedAt,
                a.record_status AS status
         FROM activities a
         JOIN applications ap ON ap.application_id = a.application_id
         JOIN companies c ON c.company_id = ap.company_id
         ${clause}
         ORDER BY a.record_status ASC,
                  CASE WHEN a.record_status = 0 THEN a.updated_at END DESC,
                  CASE WHEN a.record_status = 1 THEN a.activity_date END DESC,
                  a.activity_id DESC`,
        params,
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
        companyName: r.companyName,
        activityTypes: byActivity.get(r.id) ?? [],
        conductedOn: fromDbDate(r.conductedOn),
        updatedAt: fromDbDateTime(r.updatedAt),
        status: RECORD_STATUS_BY_VALUE[r.status],
    }));
}

// S-02 の詳細画面に必要な企業名、所有者名、最終編集者名、編集履歴を取得する。
async function findDetailExtras(id, executor) {
    const rows = await query(
        `SELECT c.company_id AS companyId, c.company_name AS companyName,
                o.users_name AS ownerName, o.graduation_year AS graduationYear,
                e.users_name AS lastEditorName
         FROM activities a
         JOIN applications ap ON ap.application_id = a.application_id
         JOIN companies c ON c.company_id = ap.company_id
         JOIN users o ON o.users_id = ap.owner_id
         JOIN users e ON e.users_id = a.updated_by
         WHERE a.activity_id = ?`,
        [id],
        executor,
    );
    const r = rows[0];
    const history = await query(
        `SELECT u.users_name AS editorName, CONVERT_TZ(h.updated_at, @@session.time_zone, '+09:00') AS editedAt
         FROM activity_history h JOIN users u ON u.users_id = h.updated_by
         WHERE h.activity_id = ?
         ORDER BY h.updated_at DESC, h.activity_history_id DESC`,
        [id],
        executor,
    );
    return {
        company: { companyId: String(r.companyId), nameOfficial: r.companyName },
        ownerName: r.ownerName,
        graduationYear: r.graduationYear === null ? null : Number(r.graduationYear),
        lastEditorName: r.lastEditorName,
        history: history.map((h) => ({
            editorName: h.editorName,
            editedAt: fromDbDateTime(h.editedAt),
        })),
    };
}

module.exports = {
    parseFollowUps,
    findById,
    loadContent,
    insertActivity,
    updateActivity,
    replaceContent,
    deleteWithChildren,
    insertHistory,
    listSummaries,
    findDetailExtras,
};
