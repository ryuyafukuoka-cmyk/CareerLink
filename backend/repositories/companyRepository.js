// RDS access for companies and company_locations (DB設計). SQL lives here only.
// Every function takes an optional `executor` (a transaction connection) as its last argument.
const { query } = require('../db/pool');

// Escapes LIKE wildcards so user input is matched literally (MariaDB default escape is "\").
function escapeLike(value) {
    return value.replace(/[\\%_]/g, '\\$&');
}

const COMPANY_COLUMNS = `
    c.company_id AS id, c.company_name AS nameOfficial,
    c.company_name_kana AS nameKatakana, c.website_url AS websiteUrl`;

// Adds `prefectures: string[]` (region ids, ascending) to company rows -> API `Company[]`.
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

// C-01. Keyword (name or katakana) AND regions (OR, matched directly against stored region ids).
// Newest update first. Returns { items: Company[], totalCount }.
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

// C-07. Selection list: [{ companyId, nameOfficial }] ordered by katakana.
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

// Returns Company | null. forUpdate (inside a transaction) locks the company row, which is how
// every change and the delete are serialized (DB設計 companies).
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

// Locks the company row (first lock of every change under a company). Returns false if missing.
async function lockById(conn, id) {
    const rows = await query(
        'SELECT company_id FROM companies WHERE company_id = ? FOR UPDATE',
        [id],
        conn,
    );
    return rows.length === 1;
}

// Marks that data under the company changed, so a pending delete confirmation becomes stale.
// Call after lockById, in the same transaction as the change.
async function bumpDeletionVersion(conn, id) {
    await query(
        'UPDATE companies SET deletion_version = deletion_version + 1 WHERE company_id = ?',
        [id],
        conn,
    );
}

// Creates the company and its locations. Call inside one transaction. Returns the new id.
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

// Updates the company, replaces its locations and bumps deletion_version (so a pending delete
// confirmation becomes stale). Call inside one transaction, after findById(..., forUpdate).
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

// C-05. Counts and version come from ONE statement, so they are the same point in time.
// Returns { activityRecordCount, applicationRoundCount, deletionVersion } | null.
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

// Reaches a company's rows through applications -> activities (explicit order, no ON DELETE
// CASCADE: 機能詳細設計 企業削除のDB処理). Table names below are fixed constants, never input.
const VIA_ACTIVITY = `
    JOIN activities a ON a.activity_id = ad.activity_id
    JOIN applications ap ON ap.application_id = a.application_id
    WHERE ap.company_id = ?`;
const DETAIL_TABLES = ['interviews', 'exams', 'briefings', 'other_activities'];

// C-06. Physically deletes the company and everything under it, children first.
// Call inside one transaction: any error must roll the whole thing back.
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
