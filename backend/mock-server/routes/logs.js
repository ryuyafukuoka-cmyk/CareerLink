// L-01 operation log list and L-02 single log. Instructors and admins only.
const express = require('express');
const { ok, fail, requireRole } = require('../helpers');
const { isRealDate, parsePage } = require('../validators');

const PAGE_SIZE = 10;
const TARGET_TYPES = ['record', 'round', 'company', 'user'];

const bad = (field, messageId = 'E-202') =>
    fail(400, 'VALIDATION_ERROR', undefined, undefined, [{ field, messageId }]);

function logsRoutes(store) {
    const router = express.Router();

    // L-01 GET /api/operation-logs?from=&to=&operatorUserId=&operationType=&targetType=&page=
    router.get('/operation-logs', async (req, res) => {
        requireRole(req.actor, 'instructor', 'admin');
        const { from, to, operatorUserId, operationType, targetType } = req.query;
        const page = parsePage(req.query.page);
        if (page === null) bad('page');
        if (from !== undefined && !isRealDate(from)) bad('from', 'E-207');
        if (to !== undefined && !isRealDate(to)) bad('to', 'E-207');
        if (from && to && from > to) bad('to', 'E-208');
        if (targetType !== undefined && !TARGET_TYPES.includes(targetType)) bad('targetType');

        // operatedAt is ISO 8601 with +09:00, so its first 10 characters are the JST date.
        const dateOf = (log) => log.operatedAt.slice(0, 10).replaceAll('-', '/');
        const { matchingOperationTypes } = await import('../../common/operationLogTypes.mjs');
        const types = operationType && matchingOperationTypes(operationType);
        const matched = store.operationLogs
            .filter((l) => !from || dateOf(l) >= from)
            .filter((l) => !to || dateOf(l) <= to)
            .filter((l) => !operatorUserId || l.operatorUserId === operatorUserId)
            .filter((l) => !types || types.includes(l.operationType))
            .filter((l) => !targetType || l.targetType === targetType)
            .sort((a, b) => b.operatedAt.localeCompare(a.operatedAt));

        const start = (page - 1) * PAGE_SIZE;
        ok(res, {
            items: matched.slice(start, start + PAGE_SIZE),
            totalCount: matched.length,
            page,
            pageSize: PAGE_SIZE,
        });
    });

    // L-02 GET /api/operation-logs/:logId
    router.get('/operation-logs/:logId', (req, res) => {
        requireRole(req.actor, 'instructor', 'admin');
        ok(
            res,
            store.operationLogs.find((l) => l.logId === req.params.logId) ?? fail(404, 'NOT_FOUND'),
        );
    });

    return router;
}

module.exports = { logsRoutes };
