// C-01 GET /api/companies, C-02 POST /api/companies, C-03 GET /api/companies/:companyId,
// C-04 PUT /api/companies/:companyId, C-05 GET .../deletion-impact, C-06 DELETE /api/companies/:companyId,
// C-07 GET /api/company-options. Only receives the request and shapes the response.
const express = require('express');
const { ok } = require('../common/response');
const companyService = require('../services/companyService');

function companyHandler() {
    const router = express.Router();

    // C-01 query: keyword?, prefectures? (comma separated), page?
    router.get('/companies', async (req, res) => {
        ok(res, await companyService.listCompanies(req.query));
    });

    // C-07 query: keyword?
    router.get('/company-options', async (req, res) => {
        ok(res, await companyService.listCompanyOptions(req.query));
    });

    // C-02 body: CompanyInput
    router.post('/companies', async (req, res) => {
        ok(res, await companyService.createCompany(req.actor, req.body), 201);
    });

    // C-05 (admin only)
    router.get('/companies/:companyId/deletion-impact', async (req, res) => {
        ok(res, await companyService.getDeletionImpact(req.actor, req.params.companyId));
    });

    // C-03
    router.get('/companies/:companyId', async (req, res) => {
        ok(res, await companyService.getCompany(req.params.companyId));
    });

    // C-04 body: CompanyInput
    router.put('/companies/:companyId', async (req, res) => {
        ok(res, await companyService.updateCompany(req.actor, req.params.companyId, req.body));
    });

    // C-06 body: { confirmName, expectedDeletionVersion } (admin only)
    router.delete('/companies/:companyId', async (req, res) => {
        ok(res, await companyService.deleteCompany(req.actor, req.params.companyId, req.body));
    });

    return router;
}

module.exports = { companyHandler };
