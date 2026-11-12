// Operation logs. Shape follows `OperationLog`. Never contains record bodies.
// targetType: record | round | company | user.
import { users } from './users.js';

const nameOf = (userId) => users.find((u) => u.userId === userId)?.displayName ?? '';

// [operatorUserId, operatedAt, operationType, targetType, targetId, result]
const rows = [
    ['7', '2026-10-30T10:05:00+09:00', 'setStatus', 'user', '4', 'success'],
    ['7', '2026-10-29T16:40:00+09:00', 'changeRole', 'user', '6', 'failure'],
    ['2', '2026-10-20T16:50:00+09:00', 'createRecord', 'record', '8', 'failure'],
    ['7', '2026-10-20T16:50:00+09:00', 'createRecord', 'record', '8', 'success'],
    ['3', '2026-10-28T19:10:00+09:00', 'createRecord', 'record', '9', 'success'],
    ['3', '2026-10-28T10:00:00+09:00', 'createRound', 'round', '8', 'success'],
    ['1', '2026-10-15T18:30:00+09:00', 'createRecord', 'record', '3', 'success'],
    ['2', '2026-10-05T20:00:00+09:00', 'createRecord', 'record', '7', 'success'],
    ['1', '2026-10-02T21:00:00+09:00', 'createRecord', 'record', '2', 'success'],
    ['2', '2026-10-01T09:20:00+09:00', 'createRound', 'round', '7', 'success'],
    ['2', '2026-09-30T17:20:00+09:00', 'createRecord', 'record', '6', 'success'],
    ['1', '2026-09-20T18:00:00+09:00', 'createRound', 'round', '2', 'success'],
    ['7', '2026-09-10T10:15:00+09:00', 'updateRound', 'round', '4', 'success'],
    ['2', '2026-08-30T21:00:00+09:00', 'updateRound', 'round', '5', 'success'],
    ['5', '2026-08-25T13:05:00+09:00', 'updateRecord', 'record', '4', 'success'],
    ['1', '2026-08-20T22:10:00+09:00', 'createRecord', 'record', '4', 'success'],
    ['1', '2026-08-05T20:00:00+09:00', 'createRound', 'round', '4', 'success'],
    ['2', '2026-07-28T19:45:00+09:00', 'createRecord', 'record', '5', 'success'],
    ['5', '2026-07-10T11:00:00+09:00', 'updateCompany', 'company', '1', 'success'],
    ['6', '2026-07-01T14:30:00+09:00', 'createCompany', 'company', '13', 'success'],
    ['1', '2026-06-24T20:15:00+09:00', 'createRecord', 'record', '1', 'success'],
    ['7', '2026-06-01T09:00:00+09:00', 'deleteRecord', 'record', '99', 'success'],
    ['7', '2026-05-20T15:00:00+09:00', 'deleteCompany', 'company', '98', 'success'],
];

// Newest first, like the real API.
export const operationLogs = rows
    .map(([operatorUserId, operatedAt, operationType, targetType, targetId, result], i) => ({
        logId: String(i + 1),
        operatorUserId,
        operatorName: nameOf(operatorUserId),
        operatedAt,
        operationType,
        targetType,
        targetId,
        result,
    }))
    .sort((a, b) => b.operatedAt.localeCompare(a.operatedAt));
