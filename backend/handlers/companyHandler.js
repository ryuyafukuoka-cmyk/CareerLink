// 企業API（C-01〜C-07）。リクエストを受け取り、サービスの結果をAPIレスポンスに整える。
// C-01 GET /api/companies、C-02 POST /api/companies、C-03 GET /api/companies/:companyId
// C-04 PUT /api/companies/:companyId、C-05 GET .../deletion-impact、C-06 DELETE /api/companies/:companyId
// C-07 GET /api/company-options
const express = require('express');
const { ok } = require('../common/response');
const companyService = require('../services/companyService');

function companyHandler() {
    const router = express.Router();

    // C-01 の任意の条件は keyword、prefectures（カンマ区切り）、page。
    router.get('/companies', async (req, res) => {
        ok(res, await companyService.listCompanies(req.query));
    });

    // C-07 の任意の条件は keyword。
    router.get('/company-options', async (req, res) => {
        ok(res, await companyService.listCompanyOptions(req.query));
    });

    // C-02 のリクエスト本文は CompanyInput。
    router.post('/companies', async (req, res) => {
        ok(res, await companyService.createCompany(req.actor, req.body), 201);
    });

    // C-05 は管理者のみ。
    router.get('/companies/:companyId/deletion-impact', async (req, res) => {
        ok(res, await companyService.getDeletionImpact(req.actor, req.params.companyId));
    });

    // C-03
    router.get('/companies/:companyId', async (req, res) => {
        ok(res, await companyService.getCompany(req.params.companyId));
    });

    // C-04 のリクエスト本文は CompanyInput。
    router.put('/companies/:companyId', async (req, res) => {
        ok(res, await companyService.updateCompany(req.actor, req.params.companyId, req.body));
    });

    // C-06 は管理者のみ。本文に confirmName と expectedDeletionVersion を指定する。
    router.delete('/companies/:companyId', async (req, res) => {
        ok(res, await companyService.deleteCompany(req.actor, req.params.companyId, req.body));
    });

    return router;
}

module.exports = { companyHandler };
