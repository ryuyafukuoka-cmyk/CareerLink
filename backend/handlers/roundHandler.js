// RD-01 POST /api/application-rounds, RD-02 GET /api/application-rounds,
// RD-03 GET .../:applicationRoundId, RD-04 PATCH .../:applicationRoundId,
// RD-05 GET .../:applicationRoundId/records, RD-06 GET .../:applicationRoundId/history.
const express = require('express');
const { ok } = require('../common/response');
const roundService = require('../services/roundService');

function roundHandler() {
    const router = express.Router();

    // RD-01 body: { studentUserId, companyId, applicationDate? }. 429 RATE_LIMITED + Retry-After.
    router.post('/application-rounds', async (req, res) => {
        ok(res, await roundService.createApplicationRound(req.actor, req.body), 201);
    });

    // RD-02 query: studentUserId?, companyId?
    router.get('/application-rounds', async (req, res) => {
        ok(res, await roundService.listApplicationRounds(req.actor, req.query));
    });

    // RD-05, RD-06 before RD-03 only for readability (the paths do not overlap).
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

    // RD-04 body: { stage?, statusNote?, applicationDate? } (1 or more)
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
