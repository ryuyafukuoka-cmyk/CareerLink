// 活動記録の操作（R-01〜R-09）と詳細取得（S-02）。
const express = require('express');
const { ok, fail } = require('../helpers');
const { parseId } = require('../../common/validation');
const {
    checkRecordCreateIds,
    checkRecordImmutableIds,
    loadRecordContentParser,
} = require('../../common/recordValidation');

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

    // 下書きは所有者と管理者だけが閲覧できる。完了済み記録は全利用者が閲覧できる。
    const assertCanView = (actor, record) => {
        if (record.status === 'draft' && !isOwner(actor, record) && !isAdmin(actor)) {
            fail(403, 'FORBIDDEN');
        }
    };
    // 下書きの編集は所有者・管理者、完了済み記録の編集は所有者・指導員・管理者に許可する。
    const assertCanEdit = (actor, record) => {
        if (isOwner(actor, record) || isAdmin(actor)) return;
        if (record.status === 'completed' && actor.role === 'instructor') return;
        fail(403, 'FORBIDDEN');
    };
    // 削除は所有者・管理者のみ。指導員には許可しない。
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
    // 下書きを更新日時の降順で先に並べ、続いて完了済み記録を実施日の降順で並べる。
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

    // R-05・R-06・R-07 の共通処理。
    function saveContent(actor, record, input, mode, parseRecordContent, operationType) {
        checkRecordImmutableIds(record, input);
        const content = parseRecordContent(input, mode, roundOf(record)?.stage);
        Object.assign(record, content);
        record.lastEditedByUserId = actor.userId;
        addHistory(record.recordId, actor.userId);
        store.touchCompany(record.companyId);
        store.addLog({
            operatorUserId: actor.userId,
            operationType,
            targetType: 'record',
            targetId: record.recordId,
        });
    }

    // R-01 POST /api/activity-records。本文は ActivityRecordInput と mode。
    router.post('/activity-records', async (req, res) => {
        const parseRecordContent = await loadRecordContentParser();
        const actor = req.actor;
        const body = req.body ?? {};
        if (body.mode !== 'draft' && body.mode !== 'complete') {
            validationError([{ field: 'mode', messageId: 'E-202' }]);
        }

        if (actor.role === 'instructor') fail(403, 'FORBIDDEN');

        // 学生は自分の記録のみ作成できる。管理者の代理登録では、実在する学生を所有者に指定する。
        let ownerUserId = actor.userId;
        if (actor.role === 'student') {
            if (body.ownerUserId !== undefined && body.ownerUserId !== actor.userId) {
                fail(403, 'FORBIDDEN');
            }
        } else {
            if (typeof body.ownerUserId !== 'string' || !body.ownerUserId) {
                validationError([{ field: 'ownerUserId', messageId: 'E-201' }]);
            }
            const owner =
                parseId(body.ownerUserId) === null ? null : store.getUser(body.ownerUserId);
            if (!owner || owner.role !== 'student') fail(404, 'NOT_FOUND');
            ownerUserId = owner.userId;
        }

        checkRecordCreateIds(body);
        const company = store.getCompany(body.companyId) ?? fail(404, 'NOT_FOUND');
        const round =
            store.rounds.find((r) => r.applicationRoundId === body.applicationRoundId) ??
            fail(404, 'NOT_FOUND');
        if (round.studentUserId !== ownerUserId || round.companyId !== company.companyId) {
            fail(403, 'FORBIDDEN');
        }

        const content = parseRecordContent(body, body.mode, round.stage);

        store.assertCooldown(actor.userId, 'record'); // 応募回とは別に作成間隔を制限する（429）。

        const record = {
            recordId: store.nextId(store.records, 'recordId'),
            companyId: company.companyId,
            applicationRoundId: round.applicationRoundId,
            ownerUserId,
            createdByUserId: actor.userId,
            lastEditedByUserId: actor.userId,
            ...content,
            status: body.mode === 'complete' ? 'completed' : 'draft',
        };
        store.records.push(record);
        addHistory(record.recordId, actor.userId);
        store.touchCompany(company.companyId);
        store.markCreated(actor.userId, 'record');
        store.addLog({
            operatorUserId: actor.userId,
            operationType: 'createActivityRecord',
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
    router.put('/activity-records/:id/draft', async (req, res) => {
        const parseRecordContent = await loadRecordContentParser();
        const record = findOr404(req.params.id);
        assertCanEdit(req.actor, record);
        if (record.status !== 'draft') fail(409, 'CONFLICT');
        saveContent(req.actor, record, req.body ?? {}, 'draft', parseRecordContent, 'saveDraft');
        ok(res, record);
    });

    // R-06 POST /api/activity-records/:id/complete
    router.post('/activity-records/:id/complete', async (req, res) => {
        const parseRecordContent = await loadRecordContentParser();
        const record = findOr404(req.params.id);
        assertCanEdit(req.actor, record);
        if (record.status !== 'draft') fail(409, 'CONFLICT');
        saveContent(
            req.actor,
            record,
            req.body ?? {},
            'complete',
            parseRecordContent,
            'completeActivityRecord',
        );
        record.status = 'completed';
        ok(res, record);
    });

    // R-07 PUT /api/activity-records/:id。完了済み記録だけを更新し、記録状態は維持する。
    router.put('/activity-records/:id', async (req, res) => {
        const parseRecordContent = await loadRecordContentParser();
        const record = findOr404(req.params.id);
        assertCanEdit(req.actor, record);
        if (record.status !== 'completed') fail(409, 'CONFLICT');
        saveContent(
            req.actor,
            record,
            req.body ?? {},
            'complete',
            parseRecordContent,
            'updateActivityRecord',
        );
        ok(res, record);
    });

    // R-08 GET /api/activity-records/:id/delete-confirm
    router.get('/activity-records/:id/delete-confirm', (req, res) => {
        const record = findOr404(req.params.id);
        assertCanDelete(req.actor, record);
        const { recordId, companyName, activityTypes, conductedOn } = summary(record);
        ok(res, { recordId, companyName, activityTypes, conductedOn });
    });

    // R-09 DELETE /api/activity-records/:id。記録を物理削除し、企業・ユーザー・応募回は残す。
    router.delete('/activity-records/:id', (req, res) => {
        const actor = req.actor;
        const record = findOr404(req.params.id);
        assertCanDelete(actor, record);
        store.records = store.records.filter((r) => r.recordId !== record.recordId);
        store.recordHistory = store.recordHistory.filter((h) => h.recordId !== record.recordId);
        store.touchCompany(record.companyId);
        store.addLog({
            operatorUserId: actor.userId,
            operationType: 'deleteActivityRecord',
            targetType: 'record',
            targetId: record.recordId,
        });
        ok(res, null);
    });

    // S-02 GET /api/activity-records/:id。所有者・指導員・管理者以外には氏名を null で返す。
    router.get('/activity-records/:id', (req, res) => {
        const actor = req.actor;
        const record = findOr404(req.params.id);
        assertCanView(actor, record);

        const canSeeNames = isOwner(actor, record) || actor.role !== 'student';
        const nameOf = (userId) =>
            canSeeNames ? (store.getUser(userId)?.displayName ?? null) : null;
        const edits = history(record.recordId).sort((a, b) => a.editedAt.localeCompare(b.editedAt));
        const company = store.getCompany(record.companyId);

        // status と ownerUserId はボタンの表示やラベルの切り替えに使う追加項目（API設計書には未記載）。
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
