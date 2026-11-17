const repository = require('../repositories/operationLogRepository');
const { requireRole } = require('../authorization/guards');
const { ROLES } = require('../common/constants');
const { isRealDate, toDbDate } = require('../common/dateUtil');
const { validationError, notFound } = require('../common/errors');
const { parseId } = require('../common/validation');

const allowed = [ROLES.INSTRUCTOR, ROLES.ADMIN];
function invalid(field, messageId = 'E-202') {
    throw validationError([{ field, messageId }]);
}

async function listOperationLogs(actor, query) {
    requireRole(actor, allowed);
    const { from, to, operatorUserId, operationType, targetType } = query;
    const page = query.page === undefined ? 1 : parseId(query.page);
    if (!page || !Number.isSafeInteger((page - 1) * 10)) invalid('page');
    if (from !== undefined && !isRealDate(from)) invalid('from');
    if (to !== undefined && !isRealDate(to)) invalid('to');
    if (from && to && from > to) invalid('to', 'E-208');
    if (operatorUserId !== undefined && !parseId(operatorUserId)) invalid('operatorUserId');
    if (
        operationType !== undefined &&
        (typeof operationType !== 'string' || !operationType.trim() || operationType.length > 50)
    ) {
        invalid('operationType');
    }
    if (targetType !== undefined && !repository.targetTables.has(targetType)) invalid('targetType');
    return repository.list(
        {
            start: from && toDbDate(from) + ' 00:00:00',
            end: to && toDbDate(to) + ' 23:59:59',
            operatorId: operatorUserId,
            operationType,
            table: repository.targetTables.get(targetType),
        },
        page,
    );
}

async function getOperationLog(actor, logId) {
    requireRole(actor, allowed);
    const id = parseId(logId);
    if (!id) throw notFound();
    const log = await repository.find(id);
    if (!log) throw notFound();
    return log;
}

module.exports = { listOperationLogs, getOperationLog };
