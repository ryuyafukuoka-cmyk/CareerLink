// RD-01 to RD-06: application rounds (create / list / detail / update / records of a round / history).
const express = require('express');
const { ok, fail } = require('../helpers');
const { isRealDate } = require('../validators');

const STAGES = ['considering', 'inProgress', 'declined', 'rejected', 'offered'];

function validationError(details) {
    fail(400, 'VALIDATION_ERROR', undefined, undefined, details);
}

function roundsRoutes(store) {
    const router = express.Router();

    const findOr404 = (id) =>
        store.rounds.find((r) => r.applicationRoundId === id) ?? fail(404, 'NOT_FOUND');

    // View: the owner student, instructors and admins. Other students get 403.
    const assertCanView = (actor, round) => {
        if (actor.role === 'student' && round.studentUserId !== actor.userId)
            fail(403, 'FORBIDDEN');
    };

    // Change: the owner student and admins. Instructors and other students get 403.
    const assertCanChange = (actor, round) => {
        if (actor.role === 'admin') return;
        if (actor.role === 'student' && round.studentUserId === actor.userId) return;
        fail(403, 'FORBIDDEN');
    };

    // RD-01 POST /api/application-rounds  body: { studentUserId, companyId, applicationDate? }
    router.post('/application-rounds', (req, res) => {
        const actor = req.actor;
        const body = req.body ?? {};
        const details = [];

        if (typeof body.studentUserId !== 'string' || !body.studentUserId) {
            details.push({ field: 'studentUserId', messageId: 'E-201' });
        }
        if (typeof body.companyId !== 'string' || !body.companyId) {
            details.push({ field: 'companyId', messageId: 'E-201' });
        }
        const rawDate = body.applicationDate ?? null;
        if (rawDate !== null && !isRealDate(rawDate)) {
            details.push({ field: 'applicationDate', messageId: 'E-207' });
        }
        if (details.length > 0) validationError(details);

        // Students: only for themselves. Instructors: never. Admin: any existing student.
        if (actor.role === 'instructor') fail(403, 'FORBIDDEN');
        if (actor.role === 'student' && body.studentUserId !== actor.userId) fail(403, 'FORBIDDEN');
        const student = store.getUser(body.studentUserId);
        if (!student || student.role !== 'student') fail(404, 'NOT_FOUND');
        const company = store.getCompany(body.companyId) ?? fail(404, 'NOT_FOUND');

        // 30-second limit per operator, separate from R-01. Admin proxy creation counts for the admin.
        store.assertCooldown(actor.userId, 'round');

        const round = {
            applicationRoundId: store.nextId(store.rounds, 'applicationRoundId'),
            studentUserId: student.userId,
            companyId: company.companyId,
            applicationDate: rawDate,
            stage: 'considering',
            statusNote: '',
        };
        store.rounds.push(round);
        store.addRoundHistory(round.applicationRoundId, actor.userId);
        store.touchCompany(company.companyId);
        store.markCreated(actor.userId, 'round');
        store.addLog({
            operatorUserId: actor.userId,
            operationType: 'createRound',
            targetType: 'round',
            targetId: round.applicationRoundId,
        });
        ok(res, round, 201);
    });

    // RD-02 GET /api/application-rounds?studentUserId=&companyId=
    router.get('/application-rounds', (req, res) => {
        const actor = req.actor;
        let { studentUserId } = req.query;
        const { companyId } = req.query;

        if (actor.role === 'student') {
            if (studentUserId !== undefined && studentUserId !== actor.userId)
                fail(403, 'FORBIDDEN');
            studentUserId = actor.userId;
        }

        const items = store.rounds
            .filter((r) => !studentUserId || r.studentUserId === studentUserId)
            .filter((r) => !companyId || r.companyId === companyId)
            .sort((a, b) => Number(b.applicationRoundId) - Number(a.applicationRoundId));
        ok(res, items);
    });

    // RD-03 GET /api/application-rounds/:id
    router.get('/application-rounds/:id', (req, res) => {
        const round = findOr404(req.params.id);
        assertCanView(req.actor, round);
        ok(res, round);
    });

    // RD-04 PATCH /api/application-rounds/:id  body: { stage?, statusNote?, applicationDate? } (1 or more)
    router.patch('/application-rounds/:id', (req, res) => {
        const actor = req.actor;
        const round = findOr404(req.params.id);
        assertCanChange(actor, round);

        const body = req.body ?? {};
        const has = (key) => Object.prototype.hasOwnProperty.call(body, key);
        if (!has('stage') && !has('statusNote') && !has('applicationDate')) {
            validationError([{ field: 'stage', messageId: 'E-211' }]);
        }

        const details = [];
        if (has('stage') && !STAGES.includes(body.stage)) {
            details.push({ field: 'stage', messageId: 'E-211' });
        }
        if (has('statusNote') && typeof body.statusNote !== 'string') {
            details.push({ field: 'statusNote', messageId: 'E-202' });
        }
        if (
            has('applicationDate') &&
            body.applicationDate !== null &&
            !isRealDate(body.applicationDate)
        ) {
            details.push({ field: 'applicationDate', messageId: 'E-207' });
        }
        if (details.length > 0) validationError(details);

        const nextStage = has('stage') ? body.stage : round.stage;
        const nextDate = has('applicationDate') ? body.applicationDate : round.applicationDate;

        // The date may be empty only while the stage is "considering". Nothing is filled in automatically.
        if (nextStage !== 'considering' && !nextDate) {
            validationError([{ field: 'applicationDate', messageId: 'E-215' }]);
        }
        // Leaving "considering" requires a category on every interview question of this round.
        if (nextStage !== 'considering') {
            const missing = store.records.some(
                (r) =>
                    r.applicationRoundId === round.applicationRoundId &&
                    r.sections?.interview?.questions?.some((q) => !q.category),
            );
            if (missing) validationError([{ field: 'stage', messageId: 'E-216' }]);
        }

        round.stage = nextStage;
        round.applicationDate = nextDate;
        if (has('statusNote')) round.statusNote = body.statusNote;
        store.addRoundHistory(round.applicationRoundId, actor.userId);
        store.touchCompany(round.companyId);
        store.addLog({
            operatorUserId: actor.userId,
            operationType: 'updateRound',
            targetType: 'round',
            targetId: round.applicationRoundId,
        });
        ok(res, round);
    });

    // RD-05 GET /api/application-rounds/:id/records  (drafts only for the owner and admins)
    router.get('/application-rounds/:id/records', (req, res) => {
        const actor = req.actor;
        const round = findOr404(req.params.id);
        assertCanView(actor, round);

        const canSeeDrafts = actor.role === 'admin' || actor.userId === round.studentUserId;
        const companyName = store.getCompany(round.companyId)?.nameOfficial ?? '';
        const lastEdited = (recordId) =>
            store.recordHistory
                .filter((h) => h.recordId === recordId)
                .map((h) => h.editedAt)
                .sort()
                .pop() ?? null;

        const items = store.records
            .filter((r) => r.applicationRoundId === round.applicationRoundId)
            .filter((r) => r.status === 'completed' || canSeeDrafts)
            .map((r) => ({
                recordId: r.recordId,
                companyName,
                activityTypes: r.activityTypes,
                conductedOn: r.conductedOn ?? null,
                updatedAt: lastEdited(r.recordId),
                status: r.status,
            }))
            .sort((a, b) => String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? '')));
        ok(res, items);
    });

    // RD-06 GET /api/application-rounds/:id/history  (editor and time only, newest first)
    router.get('/application-rounds/:id/history', (req, res) => {
        const round = findOr404(req.params.id);
        assertCanView(req.actor, round);
        const items = store.roundHistory
            .filter((h) => h.applicationRoundId === round.applicationRoundId)
            .map(({ editorUserId, editorName, editedAt }) => ({
                editorUserId,
                editorName,
                editedAt,
            }))
            .sort((a, b) => b.editedAt.localeCompare(a.editedAt));
        ok(res, items);
    });

    return router;
}

module.exports = { roundsRoutes };
