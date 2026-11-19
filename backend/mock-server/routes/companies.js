// C-01 to C-07: company list / create / detail / update / deletion impact / delete / options.
const express = require('express');
const { ok, fail, requireRole } = require('../helpers');
const { validateCompanyInput, isRegionId, parsePage } = require('../validators');

const PAGE_SIZE = 10;

function validationError(details) {
    fail(400, 'VALIDATION_ERROR', undefined, undefined, details);
}

function companiesRoutes(store) {
    const router = express.Router();

    const findOr404 = (companyId) => store.getCompany(companyId) ?? fail(404, 'NOT_FOUND');

    // C-01 GET /api/companies?keyword=&prefectures=1,2&page=1
    router.get('/companies', (req, res) => {
        const page = parsePage(req.query.page);
        if (page === null) validationError([{ field: 'page', messageId: 'E-202' }]);

        const keyword = String(req.query.keyword ?? '')
            .trim()
            .toLowerCase();
        const regionIds = String(req.query.prefectures ?? '')
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean);
        if (!regionIds.every(isRegionId)) {
            validationError([{ field: 'prefectures', messageId: 'E-202' }]);
        }

        // Keyword AND regions. Regions are OR and matched directly against the stored region IDs.
        const matched = store.companies.filter((c) => {
            const byKeyword =
                !keyword ||
                c.nameOfficial.toLowerCase().includes(keyword) ||
                c.nameKatakana.toLowerCase().includes(keyword);
            const byRegion =
                regionIds.length === 0 || c.prefectures.some((p) => regionIds.includes(p));
            return byKeyword && byRegion;
        });

        // Newest first (update time).
        matched.sort(
            (a, b) =>
                store.getCompanyMeta(b.companyId).updatedAt -
                store.getCompanyMeta(a.companyId).updatedAt,
        );

        const start = (page - 1) * PAGE_SIZE;
        ok(res, {
            items: matched.slice(start, start + PAGE_SIZE),
            totalCount: matched.length,
            page,
            pageSize: PAGE_SIZE,
        });
    });

    // C-07 GET /api/company-options?keyword=
    router.get('/company-options', (req, res) => {
        const keyword = String(req.query.keyword ?? '')
            .trim()
            .toLowerCase();
        const options = store.companies
            .filter(
                (c) =>
                    !keyword ||
                    c.nameOfficial.toLowerCase().includes(keyword) ||
                    c.nameKatakana.toLowerCase().includes(keyword),
            )
            .sort((a, b) => a.nameKatakana.localeCompare(b.nameKatakana, 'ja'))
            .map(({ companyId, nameOfficial }) => ({ companyId, nameOfficial }));
        ok(res, options);
    });

    // C-02 POST /api/companies  body: CompanyInput
    router.post('/companies', (req, res) => {
        const { details, value } = validateCompanyInput(req.body);
        if (details.length > 0) validationError(details);

        const company = { companyId: store.nextId(store.companies, 'companyId'), ...value };
        store.addCompany(company);
        store.addLog({
            operatorUserId: req.actor.userId,
            operationType: 'createCompany',
            targetType: 'company',
            targetId: company.companyId,
        });
        ok(res, company, 201);
    });

    // C-03 GET /api/companies/:companyId
    router.get('/companies/:companyId', (req, res) => {
        ok(res, findOr404(req.params.companyId));
    });

    // C-04 PUT /api/companies/:companyId  body: CompanyInput
    router.put('/companies/:companyId', (req, res) => {
        const company = findOr404(req.params.companyId);
        const { details, value } = validateCompanyInput(req.body);
        if (details.length > 0) validationError(details);

        Object.assign(company, value);
        store.touchCompany(company.companyId);
        store.addLog({
            operatorUserId: req.actor.userId,
            operationType: 'updateCompany',
            targetType: 'company',
            targetId: company.companyId,
        });
        ok(res, company);
    });

    // C-05 GET /api/companies/:companyId/deletion-impact  (admin only)
    router.get('/companies/:companyId/deletion-impact', (req, res) => {
        requireRole(req.actor, 'admin');
        const company = findOr404(req.params.companyId);
        ok(res, {
            activityRecordCount: store.records.filter((r) => r.companyId === company.companyId)
                .length,
            applicationRoundCount: store.rounds.filter((r) => r.companyId === company.companyId)
                .length,
            deletionVersion: String(store.getCompanyMeta(company.companyId).deletionVersion),
        });
    });

    // C-06 DELETE /api/companies/:companyId  body: { confirmName, expectedDeletionVersion }
    router.delete('/companies/:companyId', (req, res) => {
        requireRole(req.actor, 'admin');
        const company = findOr404(req.params.companyId);
        const { confirmName, expectedDeletionVersion } = req.body ?? {};

        if (confirmName !== company.nameOfficial) {
            validationError([{ field: 'confirmName', messageId: 'E-212' }]);
        }
        const currentVersion = String(store.getCompanyMeta(company.companyId).deletionVersion);
        if (String(expectedDeletionVersion) !== currentVersion) {
            // Something changed since the impact was shown: do not delete, ask to re-confirm.
            fail(409, 'CONFLICT');
        }

        store.removeCompany(company.companyId);
        store.addLog({
            operatorUserId: req.actor.userId,
            operationType: 'deleteCompany',
            targetType: 'company',
            targetId: company.companyId,
        });
        ok(res, null);
    });

    return router;
}

module.exports = { companiesRoutes };
