// companies と company_locations の SQL をまとめる（DB設計）。末尾の任意引数 executor にトランザクション接続を渡せる。
const { query } = require('../db/pool');

// 入力を文字どおりに検索するため、LIKE のワイルドカードをエスケープする。MariaDB の既定のエスケープ文字はバックスラッシュ。
function escapeLike(value) {
    return value.replace(/[\\%_]/g, '\\$&');
}

const COMPANY_COLUMNS = `
    c.company_id AS id, c.company_name AS nameOfficial,
    c.company_name_kana AS nameKatakana, c.website_url AS websiteUrl`;

// 企業の各行に地域IDの文字列配列 prefectures（昇順）を加え、API用の Company 配列に変換する。
async function withRegions(rows, executor) {
    if (rows.length === 0) return [];
    const locations = await query(
        `SELECT company_id AS companyId, prefecture_id AS regionId
         FROM company_locations
         WHERE company_id IN (?)
         ORDER BY company_id ASC, prefecture_id ASC`,
        [rows.map((r) => r.id)],
        executor,
    );
    const byCompany = new Map();
    for (const { companyId, regionId } of locations) {
        if (!byCompany.has(companyId)) byCompany.set(companyId, []);
        byCompany.get(companyId).push(String(regionId));
    }
    return rows.map((row) => ({
        companyId: String(row.id),
        nameOfficial: row.nameOfficial,
        nameKatakana: row.nameKatakana,
        prefectures: byCompany.get(row.id) ?? [],
        websiteUrl: row.websiteUrl ?? null,
    }));
}

// C-01。企業名またはカナ名の条件と地域条件を AND で組み合わせ、地域は保存済みIDとの OR 一致で判定する。
// 更新日時の新しい順に取得し、{ items: Company[], totalCount } を返す。
async function search({ keyword, regionIds, limit, offset }, executor) {
    const where = [];
    const params = [];
    if (keyword) {
        const pattern = `%${escapeLike(keyword)}%`;
        where.push('(c.company_name LIKE ? OR c.company_name_kana LIKE ?)');
        params.push(pattern, pattern);
    }
    if (regionIds.length > 0) {
        where.push(
            `EXISTS (SELECT 1 FROM company_locations cl
                     WHERE cl.company_id = c.company_id AND cl.prefecture_id IN (?))`,
        );
        params.push(regionIds);
    }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const countRows = await query(
        `SELECT COUNT(*) AS n FROM companies c ${clause}`,
        params,
        executor,
    );
    const rows = await query(
        `SELECT ${COMPANY_COLUMNS}
         FROM companies c ${clause}
         ORDER BY c.updated_at DESC, c.company_id DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset],
        executor,
    );
    return { items: await withRegions(rows, executor), totalCount: Number(countRows[0].n) };
}

// C-07。企業の選択候補をカナ順に並べ、[{ companyId, nameOfficial }] で返す。
async function listOptions(keyword, executor) {
    const params = [];
    let clause = '';
    if (keyword) {
        const pattern = `%${escapeLike(keyword)}%`;
        clause = 'WHERE c.company_name LIKE ? OR c.company_name_kana LIKE ?';
        params.push(pattern, pattern);
    }
    const rows = await query(
        `SELECT c.company_id AS id, c.company_name AS nameOfficial
         FROM companies c ${clause}
         ORDER BY c.company_name_kana ASC, c.company_id ASC`,
        params,
        executor,
    );
    return rows.map((r) => ({ companyId: String(r.id), nameOfficial: r.nameOfficial }));
}

// 企業があれば Company、なければ null を返す。トランザクション内で forUpdate を指定すると企業行をロックし、
// 同じ企業に対する変更と削除を順番に処理できる（DB設計 companies）。
async function findById(id, executor, { forUpdate = false } = {}) {
    const rows = await query(
        `SELECT ${COMPANY_COLUMNS}, CAST(c.deletion_version AS CHAR) AS deletionVersion
         FROM companies c WHERE c.company_id = ?${forUpdate ? ' FOR UPDATE' : ''}`,
        [id],
        executor,
    );
    if (rows.length === 0) return null;
    const [company] = await withRegions(rows, executor);
    return { ...company, deletionVersion: rows[0].deletionVersion };
}

// 企業配下のデータを変更する際は最初に企業行をロックする。企業が存在しなければ false を返す。
async function lockById(conn, id) {
    const rows = await query(
        'SELECT company_id FROM companies WHERE company_id = ? FOR UPDATE',
        [id],
        conn,
    );
    return rows.length === 1;
}

// 削除確認後の変更を検知するため、企業配下のデータを変更したことを記録する。
// lockById の後で、データ変更と同じトランザクション内で呼ぶ。
async function bumpDeletionVersion(conn, id) {
    await query(
        'UPDATE companies SET deletion_version = deletion_version + 1 WHERE company_id = ?',
        [id],
        conn,
    );
}

// 企業とその地域を1トランザクションで登録し、新しい企業IDを返す。
async function insert(conn, { nameOfficial, nameKatakana, websiteUrl, regionIds }, userId) {
    const result = await query(
        `INSERT INTO companies (company_name, company_name_kana, website_url, created_by, updated_by)
         VALUES (?, ?, ?, ?, ?)`,
        [nameOfficial, nameKatakana, websiteUrl, userId, userId],
        conn,
    );
    await replaceLocations(conn, result.insertId, regionIds);
    return result.insertId;
}

// findById で行をロックしてから同じトランザクション内で企業情報を更新し、地域を置き換える。
// deletion_version を進め、変更前の削除確認を無効にする。
async function update(conn, id, { nameOfficial, nameKatakana, websiteUrl, regionIds }, userId) {
    await query(
        `UPDATE companies
         SET company_name = ?, company_name_kana = ?, website_url = ?,
             updated_by = ?, updated_at = NOW(), deletion_version = deletion_version + 1
         WHERE company_id = ?`,
        [nameOfficial, nameKatakana, websiteUrl, userId, id],
        conn,
    );
    await replaceLocations(conn, id, regionIds);
}

async function replaceLocations(conn, companyId, regionIds) {
    await query('DELETE FROM company_locations WHERE company_id = ?', [companyId], conn);
    await query(
        'INSERT INTO company_locations (company_id, prefecture_id) VALUES ?',
        [regionIds.map((regionId) => [companyId, regionId])],
        conn,
    );
}

// C-05。活動記録数・応募回数と deletionVersion を単一のSQLで取得し、同じ時点の値を返す。企業がなければ null。
async function findDeletionImpact(id, executor) {
    const rows = await query(
        `SELECT CAST(c.deletion_version AS CHAR) AS deletionVersion,
                (SELECT COUNT(*) FROM applications ap
                 WHERE ap.company_id = c.company_id) AS applicationRoundCount,
                (SELECT COUNT(*) FROM activities a
                 JOIN applications ap ON ap.application_id = a.application_id
                 WHERE ap.company_id = c.company_id) AS activityRecordCount
         FROM companies c WHERE c.company_id = ?`,
        [id],
        executor,
    );
    if (rows.length === 0) return null;
    return {
        activityRecordCount: Number(rows[0].activityRecordCount),
        applicationRoundCount: Number(rows[0].applicationRoundCount),
        deletionVersion: rows[0].deletionVersion,
    };
}

// applications から activities をたどり、企業配下の行を特定する。削除順は明示する（機能詳細設計「企業削除のDB処理」）。
// 下記のテーブル名は固定値を使い、外部入力から組み立てない。
const VIA_ACTIVITY = `
    JOIN activities a ON a.activity_id = ad.activity_id
    JOIN applications ap ON ap.application_id = a.application_id
    WHERE ap.company_id = ?`;
const DETAIL_TABLES = ['interviews', 'exams', 'briefings', 'other_activities'];

// C-06。子から順に企業と関連データを物理削除する。1トランザクションで呼び、途中で失敗したら全体を取り消す。
async function deleteWithRelations(conn, id) {
    await query(
        `DELETE iq FROM interview_questions iq
         JOIN interviews t ON t.interview_id = iq.interview_id
         JOIN activity_details ad ON ad.activity_detail_id = t.activity_detail_id
         ${VIA_ACTIVITY}`,
        [id],
        conn,
    );
    for (const table of DETAIL_TABLES) {
        await query(
            `DELETE t FROM ${table} t
             JOIN activity_details ad ON ad.activity_detail_id = t.activity_detail_id
             ${VIA_ACTIVITY}`,
            [id],
            conn,
        );
    }
    await query(`DELETE ad FROM activity_details ad ${VIA_ACTIVITY}`, [id], conn);
    await query(
        `DELETE ah FROM activity_history ah
         JOIN activities a ON a.activity_id = ah.activity_id
         JOIN applications ap ON ap.application_id = a.application_id
         WHERE ap.company_id = ?`,
        [id],
        conn,
    );
    await query(
        `DELETE a FROM activities a
         JOIN applications ap ON ap.application_id = a.application_id
         WHERE ap.company_id = ?`,
        [id],
        conn,
    );
    await query(
        `DELETE sh FROM selection_history sh
         JOIN applications ap ON ap.application_id = sh.application_id
         WHERE ap.company_id = ?`,
        [id],
        conn,
    );
    await query('DELETE FROM applications WHERE company_id = ?', [id], conn);
    await query('DELETE FROM company_locations WHERE company_id = ?', [id], conn);
    await query('DELETE FROM companies WHERE company_id = ?', [id], conn);
}

module.exports = {
    search,
    listOptions,
    findById,
    lockById,
    bumpDeletionVersion,
    insert,
    update,
    findDeletionImpact,
    deleteWithRelations,
};
