// 応募回の作成・一覧・詳細・更新（RD-01〜RD-04）と、応募回ごとの活動記録・履歴の取得（RD-05・RD-06）。
// RD-01 POST /api/application-rounds、RD-02 GET /api/application-rounds、RD-03 GET .../:applicationRoundId
// RD-04 PATCH .../:applicationRoundId、RD-05 GET .../:applicationRoundId/records、RD-06 GET .../:applicationRoundId/history
const express = require('express');
const { ok } = require('../common/response');
const roundService = require('../services/roundService');

function roundHandler() {
    const router = express.Router();

    // RD-01 の本文は studentUserId、companyId と任意の applicationDate。回数制限時は429 RATE_LIMITED と Retry-After を返す。
    router.post('/application-rounds', async (req, res) => {
        ok(res, await roundService.createApplicationRound(req.actor, req.body), 201);
    });

    // RD-02 の任意の条件は studentUserId と companyId。
    router.get('/application-rounds', async (req, res) => {
        ok(res, await roundService.listApplicationRounds(req.actor, req.query));
    });

    // 読みやすいように RD-05・RD-06 を RD-03 より先に置く。これらのパスは重複しない。
    router.get('/application-rounds/:applicationRoundId/records', async (req, res) => {
        ok(res, await roundService.listRoundRecords(req.actor, req.params.applicationRoundId));
    });

    router.get('/application-rounds/:applicationRoundId/history', async (req, res) => {
        ok(res, await roundService.listRoundHistory(req.actor, req.params.applicationRoundId));
    });

    // RD-03
    router.get('/application-rounds/:applicationRoundId', async (req, res) => {
        ok(res, await roundService.getApplicationRound(req.actor, req.params.applicationRoundId));
    });

    // RD-04 は本文の stage、statusNote、applicationDate のうち少なくとも1項目を指定する。
    router.patch('/application-rounds/:applicationRoundId', async (req, res) => {
        ok(
            res,
            await roundService.updateApplicationRound(
                req.actor,
                req.params.applicationRoundId,
                req.body,
            ),
        );
    });

    return router;
}

module.exports = { roundHandler };
