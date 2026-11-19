// Company services (F-006). C-01 to C-07.
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

// The repository's locked read also carries deletionVersion; the API `Company` does not.
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

// C-01 listCompanies: any signed-in role. Keyword AND regions (OR), 10 per page.
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

// C-07 listCompanyOptions
async function listCompanyOptions(query = {}) {
    const keyword = typeof query.keyword === 'string' ? query.keyword.trim() : '';
    return companyRepository.listOptions(keyword);
}

// C-03 getCompany
async function getCompany(param) {
    const company = await companyRepository.findById(parseCompanyId(param));
    if (!company) throw notFound();
    return toCompany(company);
}

// C-02 createCompany: every role may register (F-006 権限). Creator = the authenticated actor.
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

// C-04 updateCompany: every role may edit. The row lock + version bump make a pending delete
// confirmation stale (409), so a delete never removes data nobody has seen.
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
// C-05 getDeletionImpact: admin only. Counts and version from one statement.
async function getDeletionImpact(actor, param) {
    requireRole(actor, [ROLES.ADMIN]);
    const impact = await companyRepository.findDeletionImpact(parseCompanyId(param));
    if (!impact) throw notFound();
    return impact;
}

// C-06 deleteCompany: admin only. Order: role (403) -> id/body shape (404/400) -> lock the company
// row -> missing (404) -> name mismatch (400 E-212) -> version mismatch (409) -> delete everything.
// Any failure rolls the whole transaction back.
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
