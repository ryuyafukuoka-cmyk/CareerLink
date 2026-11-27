// 活動記録検索（S-01・S-03）のSQLをまとめる。対象は完了済みの活動記録のみ。
// 値はパラメーターとして渡し、入力に含まれる LIKE のワイルドカードはエスケープする。
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

// 質問文、回答、試験内容、各種別（面接・試験・説明会・その他）の感想のうち、いずれかに検索語があれば一致とする。
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

// 異なる条件同士は AND、同じ条件の複数の値は OR、複数のキーワードは AND で組み合わせる。
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
    // 完全一致（exact）でも単語は必ず部分文字列として出現するため、ここでは候補だけを絞る。
    for (const token of f.tokens) {
        where.push(KEYWORD_CONDITION);
        const p = `%${escapeLike(token)}%`;
        params.push(p, p, p, p, p, p, p);
    }
    return { clause: `WHERE ${where.join(' AND ')}`, params };
}

// 完全一致モードで単語単位の照合を行うため、対象記録から検索可能なテキストをすべて取得する。
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

// 各行を RecordSearchItem に変換する。一覧には概要だけを含め、抜粋・氏名・選考情報は含めない。
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

// S-01。parseSearchQuery が返した条件で検索する。結果と総件数はともに活動記録単位で、{ items, totalCount } を返す。
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

    // 完全一致ではSQLで候補を絞り、各キーワードがいずれかの項目の単語全体と一致するかを調べる。語ごとに一致する項目は異なってよい。
    // 利用者30人未満の規模を想定し、単語の照合後にページを切り出す。
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

// S-03。完了済み記録がある卒業年度を新しい順に返す。
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
