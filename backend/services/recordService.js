// Activity record services (F-004-01 to F-004-03) and the record detail (F-005-02, S-02).
// R-01 to R-09 and S-02.
const { ROLES } = require('../common/constants');
const { forbidden, notFound, conflict, validationError } = require('../common/errors');
const { parseId } = require('../common/validation');
const { parseRecordContent } = require('../common/recordValidation');
const { canViewPosterName } = require('../common/visibility');
const { requireRole } = require('../authorization/guards');
const { withTransaction } = require('../db/pool');
const recordRepository = require('../repositories/recordRepository');
const { recordOperationLog } = require('../repositories/operationLogRepository');
const roundRepository = require('../repositories/roundRepository');
const companyRepository = require('../repositories/companyRepository');
const userRepository = require('../repositories/userRepository');
const { assertCreationCooldown, markCreationSucceeded } = require('./creationCooldown');

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isOwner = (actor, record) => actor.userId === record.ownerUserId;
// Drafts (and deleting): the owner and admins. Completed edits: also instructors.
const isOwnerOrAdmin = (actor, record) => isOwner(actor, record) || actor.role === ROLES.ADMIN;

function toActivityRecord(record, content) {
    return {
        recordId: record.recordId,
        companyId: record.companyId,
        applicationRoundId: record.applicationRoundId,
        ownerUserId: record.ownerUserId,
        createdByUserId: record.createdByUserId,
        lastEditedByUserId: record.lastEditedByUserId,
        conductedOn: record.conductedOn,
        activityTypes: content.activityTypes,
        sections: content.sections,
        status: record.status,
    };
}

async function loadRecord(param) {
    const id = parseId(param);
    if (id === null) throw notFound();
    const record = await recordRepository.findById(id);
    if (!record) throw notFound();
    return { id, record };
}

// R-01 createActivityRecord. Order: mode (400) -> role (403) -> owner (403/404) -> company lock
// (404) -> round (404/403) -> content (400) -> 30-second limit (429) -> save.
// The company row is locked first (same order as RD-04), so the round's stage cannot change
// between the category check and the insert.
async function createActivityRecord(actor, body) {
    const entry = {
        operatorUserId: actor.userId,
        operationType: 'createActivityRecord',
        targetType: 'record',
    };

    try {
        return await saveActivityRecord(actor, body, entry);
    } catch (error) {
        try {
            await recordOperationLog({ ...entry, targetId: null, result: 'failure' });
        } catch {
            console.error('Failed to save R-01 failure log');
        }
        throw error;
    }
}

async function saveActivityRecord(actor, body, entry) {
    const input = isObject(body) ? body : {};
    const mode = input.mode;
    if (mode !== 'draft' && mode !== 'complete') {
        throw validationError([{ field: 'mode', messageId: 'E-202' }]);
    }

    requireRole(actor, [ROLES.STUDENT, ROLES.ADMIN]);
    let ownerUserId;
    if (actor.role === ROLES.STUDENT) {
        if (input.ownerUserId !== undefined && input.ownerUserId !== actor.userId) {
            throw forbidden();
        }
        ownerUserId = actor.userId;
    } else {
        if (typeof input.ownerUserId !== 'string' || !input.ownerUserId) {
            throw validationError([{ field: 'ownerUserId', messageId: 'E-201' }]);
        }
        const ownerId = parseId(input.ownerUserId);
        const owner = ownerId === null ? null : await userRepository.findById(ownerId);
        if (!owner || owner.role !== ROLES.STUDENT) throw notFound();
        ownerUserId = owner.userId;
    }

    const companyId = typeof input.companyId === 'string' ? parseId(input.companyId) : null;
    const roundId =
        typeof input.applicationRoundId === 'string' ? parseId(input.applicationRoundId) : null;
    const idErrors = [];
    if (companyId === null) idErrors.push({ field: 'companyId', messageId: 'E-201' });
    if (roundId === null) idErrors.push({ field: 'applicationRoundId', messageId: 'E-214' });
    if (idErrors.length > 0) throw validationError(idErrors);

    return withTransaction(async (conn) => {
        if (!(await companyRepository.lockById(conn, companyId))) throw notFound();
        const round = await roundRepository.findById(roundId, conn);
        if (!round) throw notFound();
        if (round.studentUserId !== ownerUserId || round.companyId !== String(companyId)) {
            throw forbidden(); // someone else's round, or a round of another company
        }

        const content = parseRecordContent(input, mode, round.stage);
        await assertCreationCooldown(conn, actor, 'activityRecord');

        const status = mode === 'complete' ? 'completed' : 'draft';
        const id = await recordRepository.insertActivity(
            conn,
            { roundId, dbDate: content.dbDate, status },
            Number(actor.userId),
        );
        // Set before this point: the owner comes from the round; created_by = the operator.
        await recordRepository.replaceContent(conn, id, content);
        await companyRepository.bumpDeletionVersion(conn, companyId);
        await markCreationSucceeded(conn, actor, 'activityRecord');
        await recordOperationLog({ ...entry, targetId: id, result: 'success' }, conn);

        const record = await recordRepository.findById(id, conn);
        return toActivityRecord(record, await recordRepository.loadContent(id, conn));
    });
}

// R-02 listOwnActivityRecords: drafts (updated desc) first, then completed (date desc).
async function listOwnActivityRecords(actor) {
    return recordRepository.listSummaries({ ownerId: Number(actor.userId) });
}

// R-03 listDrafts: a student only their own, an admin anyone's (all students when userId is
// omitted), never an instructor.
async function listDrafts(actor, query = {}) {
    requireRole(actor, [ROLES.STUDENT, ROLES.ADMIN]);
    const raw = query.userId;
    if (raw !== undefined && typeof raw !== 'string') {
        throw validationError([{ field: 'userId', messageId: 'E-202' }]);
    }
    if (actor.role === ROLES.STUDENT) {
        if (raw !== undefined && raw !== actor.userId) throw forbidden();
        return recordRepository.listSummaries({
            ownerId: Number(actor.userId),
            status: 'draft',
        });
    }
    let ownerId;
    if (raw !== undefined) {
        ownerId = parseId(raw);
        if (ownerId === null) throw validationError([{ field: 'userId', messageId: 'E-202' }]);
    }
    return recordRepository.listSummaries({ ownerId, status: 'draft' });
}

// R-04 getRecordForEdit: a draft for its owner / admins, a completed record also for instructors.
async function getRecordForEdit(actor, param) {
    const { id, record } = await loadRecord(param);
    const allowed =
        record.status === 'draft'
            ? isOwnerOrAdmin(actor, record)
            : isOwnerOrAdmin(actor, record) || actor.role === ROLES.INSTRUCTOR;
    if (!allowed) throw forbidden();
    return toActivityRecord(record, await recordRepository.loadContent(id));
}

// Shared by R-05 (save draft), R-06 (complete) and R-07 (edit a completed record).
// Order: 404 -> role/owner (403) -> state (409) -> immutable fields and content (400).
// company, round and owner can never change (400 when a different value is sent).
async function saveExisting(actor, param, body, { from, mode, allowInstructor, withHistory }) {
    const { id, record: first } = await loadRecord(param);
    const allowed =
        isOwnerOrAdmin(actor, first) || (allowInstructor && actor.role === ROLES.INSTRUCTOR);
    if (!allowed) throw forbidden();
    if (first.status !== from) throw conflict();

    const input = isObject(body) ? body : {};
    const immutable = [];
    if (input.companyId !== undefined && input.companyId !== first.companyId) {
        immutable.push({ field: 'companyId', messageId: 'E-202' });
    }
    if (
        input.applicationRoundId !== undefined &&
        input.applicationRoundId !== first.applicationRoundId
    ) {
        immutable.push({ field: 'applicationRoundId', messageId: 'E-202' });
    }
    if (input.ownerUserId !== undefined && input.ownerUserId !== first.ownerUserId) {
        immutable.push({ field: 'ownerUserId', messageId: 'E-202' });
    }
    if (immutable.length > 0) throw validationError(immutable);

    return withTransaction(async (conn) => {
        // Lock order: company row, then the record (and its round).
        if (!(await companyRepository.lockById(conn, Number(first.companyId)))) throw notFound();
        const record = await recordRepository.findById(id, conn, { forUpdate: true });
        if (!record) throw notFound();
        if (record.status !== from) throw conflict(); // changed while we waited for the lock

        const round = await roundRepository.findById(Number(record.applicationRoundId), conn);
        const content = parseRecordContent(input, mode, round.stage);

        await recordRepository.updateActivity(
            conn,
            id,
            { dbDate: content.dbDate, status: mode === 'complete' ? 'completed' : 'draft' },
            Number(actor.userId),
        );
        await recordRepository.replaceContent(conn, id, content);
        if (withHistory) await recordRepository.insertHistory(conn, id, Number(actor.userId));
        await companyRepository.bumpDeletionVersion(conn, Number(record.companyId));

        const saved = await recordRepository.findById(id, conn);
        return toActivityRecord(saved, await recordRepository.loadContent(id, conn));
    });
}

// R-05 saveDraft: draft stays draft (409 when already completed).
const saveDraft = (actor, param, body) =>
    saveExisting(actor, param, body, {
        from: 'draft',
        mode: 'draft',
        allowInstructor: false,
        withHistory: false,
    });

// R-06 completeActivityRecord: draft -> completed (400 keeps it a draft; 409 when completed).
const completeActivityRecord = (actor, param, body) =>
    saveExisting(actor, param, body, {
        from: 'draft',
        mode: 'complete',
        allowInstructor: false,
        withHistory: false,
    });

// R-07 updateActivityRecord: edit a completed record, status stays completed (409 for a draft).
// Instructors may edit; the edit is added to the history (editor and time only).
const updateActivityRecord = (actor, param, body) =>
    saveExisting(actor, param, body, {
        from: 'completed',
        mode: 'complete',
        allowInstructor: true,
        withHistory: true,
    });

// R-08 getDeleteConfirmInfo: the owner and admins only (draft or completed).
async function getDeleteConfirmInfo(actor, param) {
    const { id, record } = await loadRecord(param);
    if (!isOwnerOrAdmin(actor, record)) throw forbidden();
    const extras = await recordRepository.findDetailExtras(id);
    const { activityTypes } = await recordRepository.loadContent(id);
    return {
        recordId: record.recordId,
        companyName: extras.company.nameOfficial,
        activityTypes,
        conductedOn: record.conductedOn,
    };
}

// R-09 deleteActivityRecord: physical delete of the record and everything under it, in one
// transaction. Company master, users and the round stay.
async function deleteActivityRecord(actor, param) {
    const { id, record: first } = await loadRecord(param);
    if (!isOwnerOrAdmin(actor, first)) throw forbidden();

    await withTransaction(async (conn) => {
        if (!(await companyRepository.lockById(conn, Number(first.companyId)))) throw notFound();
        const record = await recordRepository.findById(id, conn, { forUpdate: true });
        if (!record) throw notFound();
        await recordRepository.deleteWithChildren(conn, id);
        await companyRepository.bumpDeletionVersion(conn, Number(record.companyId));
    });
    return null;
}

// S-02 getRecordDetail: a draft only for its owner / admins (403), completed for everyone.
// Poster / editor names are null for other students. Selection stage / notes are never included.
async function getRecordDetail(actor, param) {
    const { id, record } = await loadRecord(param);
    if (record.status === 'draft' && !isOwnerOrAdmin(actor, record)) throw forbidden();

    const [content, extras] = await Promise.all([
        recordRepository.loadContent(id),
        recordRepository.findDetailExtras(id),
    ]);
    const showNames = canViewPosterName(actor, record.ownerUserId);
    return {
        recordId: record.recordId,
        company: extras.company,
        activityTypes: content.activityTypes,
        graduationYear: extras.graduationYear,
        conductedOn: record.conductedOn,
        createdAt: record.createdAt,
        lastUpdatedAt: record.updatedAt,
        posterName: showNames ? extras.ownerName : null,
        lastEditorName: showNames ? extras.lastEditorName : null,
        sections: content.sections,
        history: extras.history.map((h) => ({
            editorName: showNames ? h.editorName : null,
            editedAt: h.editedAt,
        })),
    };
}

module.exports = {
    createActivityRecord,
    listOwnActivityRecords,
    listDrafts,
    getRecordForEdit,
    saveDraft,
    completeActivityRecord,
    updateActivityRecord,
    getDeleteConfirmInfo,
    deleteActivityRecord,
    getRecordDetail,
};
