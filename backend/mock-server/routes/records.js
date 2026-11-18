// R-01 to R-09 (activity records) and S-02 (record detail).
const express = require('express');
const { ok, fail } = require('../helpers');
const { validateRecordInput, pickSections } = require('../recordValidation');

function validationError(details) {
    fail(400, 'VALIDATION_ERROR', undefined, undefined, details);
}

function recordsRoutes(store) {
    const router = express.Router();

    const findOr404 = (id) =>
        store.records.find((r) => r.recordId === id) ?? fail(404, 'NOT_FOUND');
    const roundOf = (record) =>
        store.rounds.find((r) => r.applicationRoundId === record.applicationRoundId);
    const isOwner = (actor, record) => actor.userId === record.ownerUserId;
    const isAdmin = (actor) => actor.role === 'admin';

    // Drafts: owner and admin only. Completed records: everyone.
    const assertCanView = (actor, record) => {
        if (record.status === 'draft' && !isOwner(actor, record) && !isAdmin(actor)) {
            fail(403, 'FORBIDDEN');
        }
    };
    // Edit: drafts by owner/admin, completed by owner/instructor/admin.
    const assertCanEdit = (actor, record) => {
        if (isOwner(actor, record) || isAdmin(actor)) return;
        if (record.status === 'completed' && actor.role === 'instructor') return;
        fail(403, 'FORBIDDEN');
    };
    // Delete: owner and admin only (never instructors).
    const assertCanDelete = (actor, record) => {
        if (!isOwner(actor, record) && !isAdmin(actor)) fail(403, 'FORBIDDEN');
    };

    const history = (recordId) => store.recordHistory.filter((h) => h.recordId === recordId);
    const lastEdited = (recordId) =>
        history(recordId)
            .map((h) => h.editedAt)
            .sort()
            .pop() ?? null;
    const addHistory = (recordId, editorUserId) =>
        store.recordHistory.push({ recordId, editorUserId, editedAt: new Date().toISOString() });

    const summary = (r) => ({
        recordId: r.recordId,
        companyName: store.getCompany(r.companyId)?.nameOfficial ?? '',
        activityTypes: r.activityTypes,
        conductedOn: r.conductedOn ?? null,
        updatedAt: lastEdited(r.recordId),
        status: r.status,
    });
    // Drafts first (updatedAt desc), then completed records (conductedOn desc).
    const summaries = (items) => {
        const drafts = items
            .filter((r) => r.status === 'draft')
            .map(summary)
            .sort((a, b) => String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? '')));
        const completed = items
            .filter((r) => r.status === 'completed')
            .map(summary)
            .sort((a, b) => String(b.conductedOn ?? '').localeCompare(String(a.conductedOn ?? '')));
        return [...drafts, ...completed];
    };

    // Company, round and owner cannot change after the first save (all roles).
    const assertUnchanged = (record, input) => {
        const details = [];
        if (input.companyId !== record.companyId)
            details.push({ field: 'companyId', messageId: 'E-202' });
        if (input.applicationRoundId !== record.applicationRoundId) {
            details.push({ field: 'applicationRoundId', messageId: 'E-202' });
        }
        if (input.ownerUserId !== undefined && input.ownerUserId !== record.ownerUserId) {
            details.push({ field: 'ownerUserId', messageId: 'E-202' });
        }
        if (details.length > 0) validationError(details);
    };

    // Shared by R-05, R-06 and R-07.
    function saveContent(actor, record, input, mode) {
        assertUnchanged(record, input);
        const details = validateRecordInput(input, mode, roundOf(record));
        if (details.length > 0) validationError(details);
        record.conductedOn = input.conductedOn ?? null;
        record.activityTypes = input.activityTypes;
        record.sections = pickSections(input.sections, input.activityTypes);
        record.lastEditedByUserId = actor.userId;
        addHistory(record.recordId, actor.userId);
        store.touchCompany(record.companyId);
        store.addLog({
            operatorUserId: actor.userId,
            operationType: 'updateRecord',
            targetType: 'record',
            targetId: record.recordId,
        });
    }

    // R-01 POST /api/activity-records  body: ActivityRecordInput + mode
    router.post('/activity-records', (req, res) => {
        const actor = req.actor;
        const body = req.body ?? {};
        if (actor.role === 'instructor') fail(403, 'FORBIDDEN');
        if (body.mode !== 'draft' && body.mode !== 'complete') {
            validationError([{ field: 'mode', messageId: 'E-202' }]);
        }

        // Owner: students only themselves; admins must name an existing student.
        let ownerUserId = actor.userId;
        if (actor.role === 'student') {
            if (body.ownerUserId !== undefined && body.ownerUserId !== actor.userId) {
                fail(403, 'FORBIDDEN');
            }
        } else {
            if (!body.ownerUserId) validationError([{ field: 'ownerUserId', messageId: 'E-201' }]);
            const owner = store.getUser(body.ownerUserId);
            if (!owner || owner.role !== 'student') fail(404, 'NOT_FOUND');
            ownerUserId = owner.userId;
        }

        if (!body.companyId) validationError([{ field: 'companyId', messageId: 'E-201' }]);
        const company = store.getCompany(body.companyId) ?? fail(404, 'NOT_FOUND');
        if (!body.applicationRoundId) {
            validationError([{ field: 'applicationRoundId', messageId: 'E-214' }]);
        }
        const round =
            store.rounds.find((r) => r.applicationRoundId === body.applicationRoundId) ??
            fail(404, 'NOT_FOUND');
        if (round.studentUserId !== ownerUserId || round.companyId !== company.companyId) {
            fail(403, 'FORBIDDEN');
        }

        const details = validateRecordInput(body, body.mode, round);
        if (details.length > 0) validationError(details);

        store.assertCooldown(actor.userId, 'record'); // 429, separate from rounds

        const record = {
            recordId: store.nextId(store.records, 'recordId'),
            companyId: company.companyId,
            applicationRoundId: round.applicationRoundId,
            ownerUserId,
            createdByUserId: actor.userId,
            lastEditedByUserId: actor.userId,
            conductedOn: body.conductedOn ?? null,
            activityTypes: body.activityTypes,
            status: body.mode === 'complete' ? 'completed' : 'draft',
            sections: pickSections(body.sections, body.activityTypes),
        };
        store.records.push(record);
        addHistory(record.recordId, actor.userId);
        store.touchCompany(company.companyId);
        store.markCreated(actor.userId, 'record');
        store.addLog({
            operatorUserId: actor.userId,
            operationType: 'createRecord',
            targetType: 'record',
            targetId: record.recordId,
        });
        ok(res, record, 201);
    });

    // R-02 GET /api/activity-records/mine
    router.get('/activity-records/mine', (req, res) => {
        ok(res, summaries(store.records.filter((r) => r.ownerUserId === req.actor.userId)));
    });

    // R-03 GET /api/activity-records/drafts?userId=
    router.get('/activity-records/drafts', (req, res) => {
        const actor = req.actor;
        const { userId } = req.query;
        if (actor.role === 'instructor') fail(403, 'FORBIDDEN');
        if (actor.role === 'student' && userId !== undefined && userId !== actor.userId) {
            fail(403, 'FORBIDDEN');
        }
        const target = actor.role === 'student' ? actor.userId : userId;
        const drafts = store.records.filter(
            (r) => r.status === 'draft' && (!target || r.ownerUserId === target),
        );
        ok(res, summaries(drafts));
    });

    // R-04 GET /api/activity-records/:id/edit
    router.get('/activity-records/:id/edit', (req, res) => {
        const record = findOr404(req.params.id);
        assertCanEdit(req.actor, record);
        ok(res, record);
    });

    // R-05 PUT /api/activity-records/:id/draft
    router.put('/activity-records/:id/draft', (req, res) => {
        const record = findOr404(req.params.id);
        assertCanEdit(req.actor, record);
        if (record.status !== 'draft') fail(409, 'CONFLICT');
        saveContent(req.actor, record, req.body ?? {}, 'draft');
        ok(res, record);
    });

    // R-06 POST /api/activity-records/:id/complete
    router.post('/activity-records/:id/complete', (req, res) => {
        const record = findOr404(req.params.id);
        assertCanEdit(req.actor, record);
        if (record.status !== 'draft') fail(409, 'CONFLICT');
        saveContent(req.actor, record, req.body ?? {}, 'complete');
        record.status = 'completed';
        ok(res, record);
    });

    // R-07 PUT /api/activity-records/:id (completed records only; the status never changes)
    router.put('/activity-records/:id', (req, res) => {
        const record = findOr404(req.params.id);
        assertCanEdit(req.actor, record);
        if (record.status !== 'completed') fail(409, 'CONFLICT');
        saveContent(req.actor, record, req.body ?? {}, 'complete');
        ok(res, record);
    });

    // R-08 GET /api/activity-records/:id/delete-confirm
    router.get('/activity-records/:id/delete-confirm', (req, res) => {
        const record = findOr404(req.params.id);
        assertCanDelete(req.actor, record);
        const { recordId, companyName, activityTypes, conductedOn } = summary(record);
        ok(res, { recordId, companyName, activityTypes, conductedOn });
    });

    // R-09 DELETE /api/activity-records/:id (physical delete; company, users and the round stay)
    router.delete('/activity-records/:id', (req, res) => {
        const actor = req.actor;
        const record = findOr404(req.params.id);
        assertCanDelete(actor, record);
        store.records = store.records.filter((r) => r.recordId !== record.recordId);
        store.recordHistory = store.recordHistory.filter((h) => h.recordId !== record.recordId);
        store.touchCompany(record.companyId);
        store.addLog({
            operatorUserId: actor.userId,
            operationType: 'deleteRecord',
            targetType: 'record',
            targetId: record.recordId,
        });
        ok(res, null);
    });

    // S-02 GET /api/activity-records/:id. Names are null unless the viewer is the owner, an instructor or an admin.
    router.get('/activity-records/:id', (req, res) => {
        const actor = req.actor;
        const record = findOr404(req.params.id);
        assertCanView(actor, record);

        const canSeeNames = isOwner(actor, record) || actor.role !== 'student';
        const nameOf = (userId) =>
            canSeeNames ? (store.getUser(userId)?.displayName ?? null) : null;
        const edits = history(record.recordId).sort((a, b) => a.editedAt.localeCompare(b.editedAt));
        const company = store.getCompany(record.companyId);

        // status and ownerUserId are extra fields (not in the API spec yet): the screen needs them for buttons and labels.
        ok(res, {
            recordId: record.recordId,
            status: record.status,
            ownerUserId: record.ownerUserId,
            company: { companyId: company?.companyId, nameOfficial: company?.nameOfficial },
            activityTypes: record.activityTypes,
            graduationYear: store.getUser(record.ownerUserId)?.graduationYear ?? null,
            conductedOn: record.conductedOn ?? null,
            createdAt: edits[0]?.editedAt ?? null,
            lastUpdatedAt: edits.at(-1)?.editedAt ?? null,
            posterName: nameOf(record.ownerUserId),
            lastEditorName: nameOf(record.lastEditedByUserId),
            sections: record.sections,
            history: [...edits].reverse().map((h) => ({
                editorName: nameOf(h.editorUserId),
                editedAt: h.editedAt,
            })),
        });
    });

    return router;
}

module.exports = { recordsRoutes };
