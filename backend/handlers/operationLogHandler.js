const express = require('express');
const { ok } = require('../common/response');
const service = require('../services/operationLogService');

function operationLogHandler() {
    const router = express.Router();
    router.get('/operation-logs', async (req, res) => {
        ok(res, await service.listOperationLogs(req.actor, req.query));
    });
    router.get('/operation-logs/:logId', async (req, res) => {
        ok(res, await service.getOperationLog(req.actor, req.params.logId));
    });
    return router;
}

module.exports = { operationLogHandler };
