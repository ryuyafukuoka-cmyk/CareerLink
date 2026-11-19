// Application round services (F-004-04). RD-01 to RD-06.
const { ROLES, STAGES, STAGE_VALUES, STAGE_ID_BY_VALUE } = require('../common/constants');
const { forbidden, notFound, validationError } = require('../common/errors');
const { isRealDate, toDbDate } = require('../common/dateUtil');
const { parseId } = require('../common/validation');
const { requireRole } = require('../authorization/guards');
const { withTransaction } = require('../db/pool');
const { recordOperationLog } = require('../repositories/operationLogRepository');
const roundRepository = require('../repositories/roundRepository');
const companyRepository = require('../repositories/companyRepository');
const userRepository = require('../repositories/userRepository');
const { assertCreationCooldown, markCreationSucceeded } = require('./creationCooldown');

const MAX_NOTE_LENGTH = 10000;

const isOwnerStudent = (actor, round) =>
    actor.role === ROLES.STUDENT && round.studentUserId === actor.userId;

// Loads a round the actor may VIEW: its student, instructors, admins.
// A student never learns whether somebody else's round exists: missing and foreign are both 403.
async function loadForView(actor, param) {
    const id = parseId(param);
    if (id === null) throw notFound();
    const round = await roundRepository.findById(id);
    if (!round) throw actor.role === ROLES.STUDENT ? forbidden() : notFound();
    if (actor.role === ROLES.STUDENT && !isOwnerStudent(actor, round)) throw forbidden();
    return round;
}

async function logRoundFailure(entry) {
    try {
        await recordOperationLog({ ...entry, result: 'failure' });
    } catch {
        console.error('Failed to save application round failure log:', entry.operationType);
    }
}

// RD-01 createApplicationRound: a student for themself, an admin for any student, never an
// instructor. Order: body (400) -> role/owner (403) -> student (404) -> company lock (404) ->
// 30-second limit (429) -> insert. The stage starts at "considering"; nothing is inferred from
// the date.
async function createApplicationRound(actor, body) {
    const entry = {
        operatorUserId: actor.userId,
        operationType: 'createApplicationRound',
        targetType: 'round',
        targetId: null,
    };

    try {
        return await insertApplicationRound(actor, body, entry);
    } catch (error) {
        await logRoundFailure(entry);
        throw error;
    }
}

async function insertApplicationRound(actor, body, entry) {
    const input = body !== null && typeof body === 'object' ? body : {};
    const details = [];
    const studentId = typeof input.studentUserId === 'string' ? parseId(input.studentUserId) : null;
    if (studentId === null) details.push({ field: 'studentUserId', messageId: 'E-201' });
    const companyId = typeof input.companyId === 'string' ? parseId(input.companyId) : null;
    if (companyId === null) details.push({ field: 'companyId', messageId: 'E-201' });
    const rawDate = input.applicationDate ?? null;
    if (rawDate !== null && !isRealDate(rawDate)) {
        details.push({ field: 'applicationDate', messageId: 'E-207' });
    }
    if (details.length > 0) throw validationError(details);

    requireRole(actor, [ROLES.STUDENT, ROLES.ADMIN]);
    if (actor.role === ROLES.STUDENT && input.studentUserId !== actor.userId) throw forbidden();
    const student = await userRepository.findById(studentId);
    if (!student || student.role !== ROLES.STUDENT) throw notFound();

    return withTransaction(async (conn) => {
        // Lock order (DB設計): company row, then the operator's users row.
        if (!(await companyRepository.lockById(conn, companyId))) throw notFound();
        await assertCreationCooldown(conn, actor, 'round');

        const id = await roundRepository.insert(
            conn,
            { ownerId: studentId, companyId, dbDate: rawDate === null ? null : toDbDate(rawDate) },
            Number(actor.userId),
        );
        await roundRepository.insertHistory(conn, id, Number(actor.userId));
        await companyRepository.bumpDeletionVersion(conn, companyId);
        await markCreationSucceeded(conn, actor, 'round');
        await recordOperationLog({ ...entry, targetId: id, result: 'success' }, conn);
        return roundRepository.findById(id, conn);
    });
}

// RD-02 listApplicationRounds: a student only their own; instructors / admins anyone's.
async function listApplicationRounds(actor, query = {}) {
    const details = [];
    const single = (v) => (v === undefined || typeof v === 'string' ? v : null);
    const rawStudent = single(query.studentUserId);
    const rawCompany = single(query.companyId);

    const filter = {};
    if (rawStudent !== undefined) {
        const id = rawStudent === null ? null : parseId(rawStudent);
        if (id === null) details.push({ field: 'studentUserId', messageId: 'E-202' });
        else filter.studentId = id;
    }
    if (rawCompany !== undefined) {
        const id = rawCompany === null ? null : parseId(rawCompany);
        if (id === null) details.push({ field: 'companyId', messageId: 'E-202' });
        else filter.companyId = id;
    }

    if (actor.role === ROLES.STUDENT) {
        if (rawStudent !== undefined && rawStudent !== actor.userId) throw forbidden();
        filter.studentId = Number(actor.userId);
    }
    if (details.length > 0) throw validationError(details);
    return roundRepository.list(filter);
}

// RD-03 getApplicationRound
async function getApplicationRound(actor, param) {
    return loadForView(actor, param);
}

// RD-04 updateApplicationRound: the student of the round and admins only (instructors view only).
// Rules: the date may be empty only at "considering" (nothing is filled in automatically);
// leaving "considering" needs a category on every interview question of the round.
async function updateApplicationRound(actor, param, body) {
    const id = parseId(param);
    const entry = {
        operatorUserId: actor.userId,
        operationType: 'updateApplicationRound',
        targetType: 'round',
        targetId: id !== null && id <= 0xffffffff ? id : null,
    };

    try {
        return await updateExistingRound(actor, id, body, entry);
    } catch (error) {
        await logRoundFailure(entry);
        throw error;
    }
}

async function updateExistingRound(actor, id, body, entry) {
    if (id === null) throw notFound();
    requireRole(actor, [ROLES.STUDENT, ROLES.ADMIN]);
    const first = await roundRepository.findById(id);
    if (!first) throw actor.role === ROLES.STUDENT ? forbidden() : notFound();
    if (actor.role === ROLES.STUDENT && !isOwnerStudent(actor, first)) throw forbidden();

    const input = body !== null && typeof body === 'object' ? body : {};
    const has = (key) => Object.prototype.hasOwnProperty.call(input, key);
    if (!has('stage') && !has('statusNote') && !has('applicationDate')) {
        throw validationError([{ field: 'stage', messageId: 'E-211' }]);
    }
    const details = [];
    if (has('stage') && !STAGE_VALUES.includes(input.stage)) {
        details.push({ field: 'stage', messageId: 'E-211' });
    }
    if (
        has('statusNote') &&
        (typeof input.statusNote !== 'string' || input.statusNote.length > MAX_NOTE_LENGTH)
    ) {
        details.push({ field: 'statusNote', messageId: 'E-202' });
    }
    if (
        has('applicationDate') &&
        input.applicationDate !== null &&
        !isRealDate(input.applicationDate)
    ) {
        details.push({ field: 'applicationDate', messageId: 'E-207' });
    }
    if (details.length > 0) throw validationError(details);

    return withTransaction(async (conn) => {
        // Lock order: company row, then the round row; merge with the freshly locked values.
        if (!(await companyRepository.lockById(conn, Number(first.companyId)))) throw notFound();
        const round = await roundRepository.findById(id, conn, { forUpdate: true });
        if (!round) throw notFound();

        const stage = has('stage') ? input.stage : round.stage;
        const date = has('applicationDate') ? input.applicationDate : round.applicationDate;
        const note = has('statusNote') ? input.statusNote : round.statusNote;

        if (stage !== STAGES.CONSIDERING) {
            if (!date) throw validationError([{ field: 'applicationDate', messageId: 'E-215' }]);
            if (await roundRepository.hasUncategorizedQuestions(id, conn)) {
                throw validationError([{ field: 'stage', messageId: 'E-216' }]);
            }
        }

        await roundRepository.update(
            conn,
            id,
            {
                statusId: STAGE_ID_BY_VALUE[stage],
                statusNote: note,
                dbDate: date ? toDbDate(date) : null,
            },
            Number(actor.userId),
        );
        await roundRepository.insertHistory(conn, id, Number(actor.userId));
        await companyRepository.bumpDeletionVersion(conn, Number(round.companyId));
        await recordOperationLog({ ...entry, result: 'success' }, conn);
        return roundRepository.findById(id, conn);
    });
}

// RD-05 listRoundRecords: drafts only for the round's student and admins.
async function listRoundRecords(actor, param) {
    const round = await loadForView(actor, param);
    const canSeeDrafts = actor.role === ROLES.ADMIN || isOwnerStudent(actor, round);
    return roundRepository.listRecords(Number(round.applicationRoundId), canSeeDrafts);
}

// RD-06 listRoundHistory: editor and time only. Viewers are already limited to the round's
// student, instructors and admins, so editor names may be shown.
async function listRoundHistory(actor, param) {
    const round = await loadForView(actor, param);
    return roundRepository.listHistory(Number(round.applicationRoundId));
}

module.exports = {
    createApplicationRound,
    listApplicationRounds,
    getApplicationRound,
    updateApplicationRound,
    listRoundRecords,
    listRoundHistory,
};
