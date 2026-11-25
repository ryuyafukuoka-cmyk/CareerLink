// 企業管理（F-006）のサービス。C-01〜C-07 に対応する。
const { ROLES } = require('../common/constants');
const { notFound, conflict, validationError } = require('../common/errors');
const { parseId } = require('../common/validation');
const {
    PAGE_SIZE,
    parseCompanyInput,
    parseCompanySearchQuery,
} = require('../common/companyValidation');
const { requireRole } = require('../authorization/guards');
const { withTransaction } = require('../db/pool');
const companyRepository = require('../repositories/companyRepository');
const { recordOperationLog } = require('../repositories/operationLogRepository');

// ロック時に取得した deletionVersion を除き、APIの Company 型にそろえる。
function toCompany({ deletionVersion, ...company }) {
    return company;
}

function parseCompanyId(param) {
    const id = parseId(param);
    if (id === null) throw notFound();
    return id;
}

async function withCompanyLog(actor, operationType, param, run) {
    const id = parseId(param);
    const entry = {
        operatorUserId: actor.userId,
        operationType,
        targetType: 'company',
        targetId: id !== null && id <= 0xffffffff ? id : null,
    };

    try {
        return await run(entry);
    } catch (error) {
        try {
            await recordOperationLog({ ...entry, result: 'failure' });
        } catch {
            console.error('Failed to save company failure log:', operationType);
        }
        throw error;
    }
}

// C-01 listCompanies。ログイン済みの全権限で利用できる。企業名と地域条件の両方で絞り、地域はいずれかに一致すればよい。1ページ10件。
async function listCompanies(query) {
    const { keyword, regionIds, page, pageSize } = parseCompanySearchQuery(query);
    const { items, totalCount } = await companyRepository.search({
        keyword,
        regionIds,
        limit: pageSize,
        offset: (page - 1) * pageSize,
    });
    return { items, totalCount, page, pageSize: PAGE_SIZE };
}

// C-07。企業の選択候補を取得する。
async function listCompanyOptions(query = {}) {
    const keyword = typeof query.keyword === 'string' ? query.keyword.trim() : '';
    return companyRepository.listOptions(keyword);
}

// C-03。企業の詳細を取得する。
async function getCompany(param) {
    const company = await companyRepository.findById(parseCompanyId(param));
    if (!company) throw notFound();
    return toCompany(company);
}

// C-02 createCompany。全権限で登録できる（F-006）。作成者には認証済みの操作者を記録する。
async function createCompany(actor, body) {
    return withCompanyLog(actor, 'createCompany', null, async (entry) => {
        const input = parseCompanyInput(body);

        return withTransaction(async (conn) => {
            const id = await companyRepository.insert(conn, input, Number(actor.userId));
            await recordOperationLog({ ...entry, targetId: id, result: 'success' }, conn);
            return toCompany(await companyRepository.findById(id, conn));
        });
    });
}

// C-04 updateCompany。全権限で編集できる。行をロックし、更新時に変更番号を進める。
// 更新前の削除確認は409となり、変更後の内容を確認するまで削除できない。
async function updateCompany(actor, param, body) {
    return withCompanyLog(actor, 'updateCompany', param, async (entry) => {
        const id = parseCompanyId(param);
        const input = parseCompanyInput(body);

        return withTransaction(async (conn) => {
            const current = await companyRepository.findById(id, conn, { forUpdate: true });
            if (!current) throw notFound();

            await companyRepository.update(conn, id, input, Number(actor.userId));
            await recordOperationLog({ ...entry, result: 'success' }, conn);
            return toCompany(await companyRepository.findById(id, conn));
        });
    });
}
// C-05 getDeletionImpact は管理者のみ。件数と変更番号を単一のSQLで取得する。
async function getDeletionImpact(actor, param) {
    requireRole(actor, [ROLES.ADMIN]);
    const impact = await companyRepository.findDeletionImpact(parseCompanyId(param));
    if (!impact) throw notFound();
    return impact;
}

// C-06 deleteCompany は管理者のみ。権限（403）、ID・本文（404・400）を検証して企業行をロックする。
// 企業なし（404）、名称不一致（400・E-212）、変更番号不一致（409）を確認してから関連データごと削除する。途中で失敗すれば全体を取り消す。
async function deleteCompany(actor, param, body) {
    return withCompanyLog(actor, 'deleteCompany', param, async (entry) => {
        requireRole(actor, [ROLES.ADMIN]);
        const id = parseCompanyId(param);

        const { confirmName, expectedDeletionVersion } = body ?? {};
        const details = [];

        if (typeof confirmName !== 'string' || confirmName === '') {
            details.push({ field: 'confirmName', messageId: 'E-212' });
        }
        if (
            typeof expectedDeletionVersion !== 'string' ||
            !/^\d{1,20}$/.test(expectedDeletionVersion)
        ) {
            details.push({ field: 'expectedDeletionVersion', messageId: 'E-202' });
        }
        if (details.length > 0) throw validationError(details);

        await withTransaction(async (conn) => {
            const company = await companyRepository.findById(id, conn, { forUpdate: true });
            if (!company) throw notFound();
            if (confirmName !== company.nameOfficial) {
                throw validationError([{ field: 'confirmName', messageId: 'E-212' }]);
            }
            if (expectedDeletionVersion !== company.deletionVersion) throw conflict();

            await companyRepository.deleteWithRelations(conn, id);
            await recordOperationLog({ ...entry, result: 'success' }, conn);
        });

        return null;
    });
}

module.exports = {
    listCompanies,
    listCompanyOptions,
    getCompany,
    createCompany,
    updateCompany,
    getDeletionImpact,
    deleteCompany,
};
