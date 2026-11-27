// 企業別カルテ（K-01）、面接情報（K-02）、試験情報（K-03）は、いずれも graduationYear と activityType で絞り込める。
// K-01 GET /api/companies/:companyId/karte、K-02 GET .../interview-info、K-03 GET .../exam-info
const express = require('express');
const { ok } = require('../common/response');
const karteService = require('../services/karteService');

function karteHandler() {
    const router = express.Router();

    router.get('/companies/:companyId/karte', async (req, res) => {
        ok(res, await karteService.getCompanyKarte(req.actor, req.params.companyId, req.query));
    });

    router.get('/companies/:companyId/interview-info', async (req, res) => {
        ok(res, await karteService.listCompanyInterviewInfo(req.params.companyId, req.query));
    });

    router.get('/companies/:companyId/exam-info', async (req, res) => {
        ok(res, await karteService.listCompanyExamInfo(req.params.companyId, req.query));
    });

    return router;
}

module.exports = { karteHandler };
