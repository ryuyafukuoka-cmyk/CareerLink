// 活動記録の操作（F-004-01〜F-004-03、R-01〜R-09）と詳細取得（F-005-02、S-02）を扱う。
const { ROLES } = require('../common/constants');
const { forbidden, notFound, conflict, validationError } = require('../common/errors');
const { parseId } = require('../common/validation');
const { toDbDate } = require('../common/dateUtil');
const {
    checkRecordCreateIds,
    checkRecordImmutableIds,
    loadRecordContentParser,
} = require('../common/recordValidation');
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
// 下書きの編集と記録の削除は所有者・管理者のみ。完了済み記録は指導員も編集できる。
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

// R-01 createActivityRecord。mode（400）、権限（403）、所有者（403・404）、企業ロック（404）、応募回（404・403）、内容（400）、30秒制限（429）の順に確認して保存する。
// RD-04 と同じく企業行を最初にロックするため、カテゴリ検証から登録までの間に応募回の選考段階は変わらない。
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

    checkRecordCreateIds(input);
    const companyId = Number(input.companyId);
    const roundId = Number(input.applicationRoundId);
    const parseRecordContent = await loadRecordContentParser();

    return withTransaction(async (conn) => {
        if (!(await companyRepository.lockById(conn, companyId))) throw notFound();
        const round = await roundRepository.findById(roundId, conn);
        if (!round) throw notFound();
        if (round.studentUserId !== ownerUserId || round.companyId !== String(companyId)) {
            throw forbidden(); // 他人の応募回、または別の企業に属する応募回。
        }

        const content = parseRecordContent(input, mode, round.stage);
        await assertCreationCooldown(conn, actor, 'activityRecord');

        const status = mode === 'complete' ? 'completed' : 'draft';
        const id = await recordRepository.insertActivity(
            conn,
            { roundId, dbDate: content.conductedOn && toDbDate(content.conductedOn), status },
            Number(actor.userId),
        );
        // 所有者は応募回から取得済み。created_by には実際の操作者を記録する。
        await recordRepository.replaceContent(conn, id, content);
        await companyRepository.bumpDeletionVersion(conn, companyId);
        await markCreationSucceeded(conn, actor, 'activityRecord');
        await recordOperationLog({ ...entry, targetId: id, result: 'success' }, conn);

        const record = await recordRepository.findById(id, conn);
        return toActivityRecord(record, await recordRepository.loadContent(id, conn));
    });
}

// R-02 listOwnActivityRecords。自分の下書きを更新日時の降順で先に並べ、その後に完了済み記録を実施日の降順で並べる。
async function listOwnActivityRecords(actor) {
    return recordRepository.listSummaries({ ownerId: Number(actor.userId) });
}

// R-03 listDrafts。学生は自分の下書きのみ、管理者は任意の学生の下書きを取得できる。
// 管理者が userId を省略すると全学生が対象となる。指導員には許可しない。
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

// R-04 getRecordForEdit。下書きは所有者と管理者が編集用に取得でき、完了済み記録は指導員も取得できる。
async function getRecordForEdit(actor, param) {
    const { id, record } = await loadRecord(param);
    const allowed =
        record.status === 'draft'
            ? isOwnerOrAdmin(actor, record)
            : isOwnerOrAdmin(actor, record) || actor.role === ROLES.INSTRUCTOR;
    if (!allowed) throw forbidden();
    return toActivityRecord(record, await recordRepository.loadContent(id));
}

// 下書き保存（R-05）、完了（R-06）、完了済み記録の編集（R-07）の共通処理。
// 存在（404）、権限・所有者（403）、状態（409）、変更不可の項目と入力内容（400）の順に確認する。企業・応募回・所有者の変更は400で拒否する。
async function saveExisting(actor, param, body, options) {
    const id = parseId(param);
    const entry = {
        operatorUserId: actor.userId,
        operationType: options.operationType,
        targetType: 'record',
        // operation_logs.target_id の型は INT UNSIGNED。
        targetId: id !== null && id <= 0xffffffff ? id : null,
    };
    try {
        return await updateExistingRecord(actor, param, body, options, entry);
    } catch (error) {
        try {
            await recordOperationLog({ ...entry, result: 'failure' });
        } catch {
            console.error('Failed to save activity record edit failure log');
        }
        throw error;
    }
}

async function updateExistingRecord(actor, param, body, options, entry) {
    const { from, mode, allowInstructor, withHistory } = options;
    const { id, record: first } = await loadRecord(param);
    const allowed =
        isOwnerOrAdmin(actor, first) || (allowInstructor && actor.role === ROLES.INSTRUCTOR);
    if (!allowed) throw forbidden();
    if (first.status !== from) throw conflict();

    const input = isObject(body) ? body : {};
    checkRecordImmutableIds(first, input);
    const parseRecordContent = await loadRecordContentParser();

    return withTransaction(async (conn) => {
        // 企業行を先にロックしてから、活動記録とその応募回をロックする。
        if (!(await companyRepository.lockById(conn, Number(first.companyId)))) throw notFound();
        const record = await recordRepository.findById(id, conn, { forUpdate: true });
        if (!record) throw notFound();
        if (record.status !== from) throw conflict(); // ロックの取得を待つ間に記録が変更された場合。

        const round = await roundRepository.findById(Number(record.applicationRoundId), conn);
        const content = parseRecordContent(input, mode, round.stage);

        await recordRepository.updateActivity(
            conn,
            id,
            {
                dbDate: content.conductedOn && toDbDate(content.conductedOn),
                status: mode === 'complete' ? 'completed' : 'draft',
            },
            Number(actor.userId),
        );
        await recordRepository.replaceContent(conn, id, content);
        if (withHistory) await recordRepository.insertHistory(conn, id, Number(actor.userId));
        await companyRepository.bumpDeletionVersion(conn, Number(record.companyId));

        const saved = await recordRepository.findById(id, conn);
        await recordOperationLog({ ...entry, result: 'success' }, conn);
        return toActivityRecord(saved, await recordRepository.loadContent(id, conn));
    });
}

// R-05 saveDraft。下書き状態のまま保存する。すでに完了済みなら409を返す。
const saveDraft = (actor, param, body) =>
    saveExisting(actor, param, body, {
        operationType: 'saveDraft',
        from: 'draft',
        mode: 'draft',
        allowInstructor: false,
        withHistory: false,
    });

// R-06 completeActivityRecord。下書きを完了済みにする。入力不備（400）なら下書きのまま、すでに完了済みなら409を返す。
const completeActivityRecord = (actor, param, body) =>
    saveExisting(actor, param, body, {
        operationType: 'completeActivityRecord',
        from: 'draft',
        mode: 'complete',
        allowInstructor: false,
        withHistory: false,
    });

// R-07 updateActivityRecord。完了済み記録は完了状態のまま編集し、下書きなら409を返す。
// 指導員も編集できる。履歴には編集者と日時だけを追加する。
const updateActivityRecord = (actor, param, body) =>
    saveExisting(actor, param, body, {
        operationType: 'updateActivityRecord',
        from: 'completed',
        mode: 'complete',
        allowInstructor: true,
        withHistory: true,
    });

// R-08 getDeleteConfirmInfo。下書き・完了済みともに、削除確認情報を取得できるのは所有者と管理者のみ。
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

// R-09 deleteActivityRecord。活動記録とその配下のデータを1トランザクションで物理削除する。
// 企業マスタ・ユーザー・応募回は残す。
async function deleteActivityRecord(actor, param) {
    const requestedId = parseId(param);
    const entry = {
        operatorUserId: actor.userId,
        operationType: 'deleteActivityRecord',
        targetType: 'record',
        // operation_logs.target_id の型は INT UNSIGNED。
        targetId: requestedId !== null && requestedId <= 0xffffffff ? requestedId : null,
    };

    try {
        const { id, record: first } = await loadRecord(param);
        if (!isOwnerOrAdmin(actor, first)) throw forbidden();

        await withTransaction(async (conn) => {
            if (!(await companyRepository.lockById(conn, Number(first.companyId)))) {
                throw notFound();
            }
            const record = await recordRepository.findById(id, conn, { forUpdate: true });
            if (!record) throw notFound();

            await recordRepository.deleteWithChildren(conn, id);
            await companyRepository.bumpDeletionVersion(conn, Number(record.companyId));
            await recordOperationLog({ ...entry, result: 'success' }, conn);
        });
        return null;
    } catch (error) {
        try {
            await recordOperationLog({ ...entry, result: 'failure' });
        } catch {
            console.error('Failed to save activity record deletion failure log');
        }
        throw error;
    }
}

// S-02 getRecordDetail。下書きは所有者・管理者だけに許可し、それ以外は403。完了済み記録は全利用者が閲覧できる。
// 他の学生には投稿者名・編集者名を null で返す。選考段階・備考は含めない。
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
