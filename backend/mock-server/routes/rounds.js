// 応募回API（RD-01〜RD-06）。作成、一覧、詳細、更新、応募回に属する活動記録、変更履歴を扱う。
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

    // 応募回を閲覧できるのは学生本人・指導員・管理者。他の学生には403を返す。
    const assertCanView = (actor, round) => {
        if (actor.role === 'student' && round.studentUserId !== actor.userId)
            fail(403, 'FORBIDDEN');
    };

    // 応募回を変更できるのは学生本人と管理者。指導員と他の学生には403を返す。
    const assertCanChange = (actor, round) => {
        if (actor.role === 'admin') return;
        if (actor.role === 'student' && round.studentUserId === actor.userId) return;
        fail(403, 'FORBIDDEN');
    };

    // RD-01 POST /api/application-rounds。本文は { studentUserId, companyId, applicationDate? }。
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

        // 学生は自分の応募回のみ作成できる。指導員は作成不可。管理者は既存の学生を指定して代理登録できる。
        if (actor.role === 'instructor') fail(403, 'FORBIDDEN');
        if (actor.role === 'student' && body.studentUserId !== actor.userId) fail(403, 'FORBIDDEN');
        const student = store.getUser(body.studentUserId);
        if (!student || student.role !== 'student') fail(404, 'NOT_FOUND');
        const company = store.getCompany(body.companyId) ?? fail(404, 'NOT_FOUND');

        // 操作者単位で30秒の作成間隔を設ける。活動記録（R-01）とは別に数え、代理登録は管理者自身の操作として数える。
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
            operationType: 'createApplicationRound',
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

    // RD-04 PATCH /api/application-rounds/:id。本文に stage、statusNote、applicationDate のうち1項目以上を指定する。
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

        // 応募日を空欄にできるのは considering の間だけ。日付は自動補完しない。
        if (nextStage !== 'considering' && !nextDate) {
            validationError([{ field: 'applicationDate', messageId: 'E-215' }]);
        }
        // considering から別の選考段階に進めるには、この応募回の面接質問すべてにカテゴリが必要。
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
            operationType: 'updateApplicationRound',
            targetType: 'round',
            targetId: round.applicationRoundId,
        });
        ok(res, round);
    });

    // RD-05 GET /api/application-rounds/:id/records。下書きは所有者と管理者だけに返す。
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

    // RD-06 GET /api/application-rounds/:id/history。編集者と日時だけを、新しい順に返す。
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
