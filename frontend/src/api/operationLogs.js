// Operation log APIs (F-007-03). Instructors and admins only.
import { api } from './client.js';

// L-01 GET /api/operation-logs -> { items, totalCount, page, pageSize } (newest first, 10 per page)
// filter: { from?, to?, operatorUserId?, operationType?, targetType?, page? }  (dates: YYYY/MM/DD)
export function listOperationLogs(filter = {}) {
    return api.get('/operation-logs', { query: filter });
}

// L-02 GET /api/operation-logs/{logId} -> OperationLog
export function getOperationLog(logId) {
    return api.get(`/operation-logs/${logId}`);
}
