// R-01 POST /api/activity-records, R-02 GET .../mine, R-03 GET .../drafts, R-04 GET .../:id/edit,
// R-05 PUT .../:id/draft, R-06 POST .../:id/complete, R-07 PUT .../:id,
// R-08 GET .../:id/delete-confirm, R-09 DELETE .../:id, S-02 GET .../:id.
// `mine` and `drafts` must stay before `:recordId`. S-01 (search) is added with the search API.
const express = require('express');
const { ok } = require('../common/response');
const recordService = require('../services/recordService');

function recordHandler() {
    const router = express.Router();

    // R-01 body: ActivityRecordInput + mode ('draft' | 'complete'). 429 RATE_LIMITED + Retry-After.
    router.post('/activity-records', async (req, res) => {
        ok(res, await recordService.createActivityRecord(req.actor, req.body), 201);
    });

    // R-02
    router.get('/activity-records/mine', async (req, res) => {
        ok(res, await recordService.listOwnActivityRecords(req.actor));
    });

    // R-03 query: userId?
    router.get('/activity-records/drafts', async (req, res) => {
        ok(res, await recordService.listDrafts(req.actor, req.query));
    });

    // R-04
    router.get('/activity-records/:recordId/edit', async (req, res) => {
        ok(res, await recordService.getRecordForEdit(req.actor, req.params.recordId));
    });

    // R-05 body: ActivityRecordInput
    router.put('/activity-records/:recordId/draft', async (req, res) => {
        ok(res, await recordService.saveDraft(req.actor, req.params.recordId, req.body));
    });

    // R-06 body: ActivityRecordInput
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

    // R-07 body: ActivityRecordInput
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
