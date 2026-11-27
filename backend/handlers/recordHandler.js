// 活動記録の作成・更新・削除（R-01〜R-09）と詳細取得（S-02）。検索（S-01）は検索APIで扱う。
// mine と drafts が記録IDとして解釈されないよう、固定パスを :recordId より先に登録する。
// R-01 POST /api/activity-records、R-02 GET .../mine、R-03 GET .../drafts
// R-04 GET .../:id/edit、R-05 PUT .../:id/draft、R-06 POST .../:id/complete
// R-07 PUT .../:id、R-08 GET .../:id/delete-confirm、R-09 DELETE .../:id
// S-02 GET .../:id
const express = require('express');
const { ok } = require('../common/response');
const recordService = require('../services/recordService');

function recordHandler() {
    const router = express.Router();

    // R-01 の本文は ActivityRecordInput と mode（draft または complete）。回数制限時は429 RATE_LIMITED と Retry-After を返す。
    router.post('/activity-records', async (req, res) => {
        ok(res, await recordService.createActivityRecord(req.actor, req.body), 201);
    });

    // R-02
    router.get('/activity-records/mine', async (req, res) => {
        ok(res, await recordService.listOwnActivityRecords(req.actor));
    });

    // R-03 の任意の条件は userId。
    router.get('/activity-records/drafts', async (req, res) => {
        ok(res, await recordService.listDrafts(req.actor, req.query));
    });

    // R-04
    router.get('/activity-records/:recordId/edit', async (req, res) => {
        ok(res, await recordService.getRecordForEdit(req.actor, req.params.recordId));
    });

    // R-05 のリクエスト本文は ActivityRecordInput。
    router.put('/activity-records/:recordId/draft', async (req, res) => {
        ok(res, await recordService.saveDraft(req.actor, req.params.recordId, req.body));
    });

    // R-06 のリクエスト本文は ActivityRecordInput。
    router.post('/activity-records/:recordId/complete', async (req, res) => {
        ok(
            res,
            await recordService.completeActivityRecord(req.actor, req.params.recordId, req.body),
        );
    });

    // R-08
    router.get('/activity-records/:recordId/delete-confirm', async (req, res) => {
        ok(res, await recordService.getDeleteConfirmInfo(req.actor, req.params.recordId));
    });

    // S-02
    router.get('/activity-records/:recordId', async (req, res) => {
        ok(res, await recordService.getRecordDetail(req.actor, req.params.recordId));
    });

    // R-07 のリクエスト本文は ActivityRecordInput。
    router.put('/activity-records/:recordId', async (req, res) => {
        ok(res, await recordService.updateActivityRecord(req.actor, req.params.recordId, req.body));
    });

    // R-09
    router.delete('/activity-records/:recordId', async (req, res) => {
        ok(res, await recordService.deleteActivityRecord(req.actor, req.params.recordId));
    });

    return router;
}

module.exports = { recordHandler };
