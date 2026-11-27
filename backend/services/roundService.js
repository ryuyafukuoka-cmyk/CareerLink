// 応募回のサービス（F-004-04）。RD-01〜RD-06 に対応する。
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

// 学生本人・指導員・管理者が閲覧できる応募回を取得する。
// 学生には存在しない応募回と他人の応募回のどちらも403を返し、他人の応募回の有無を推測できないようにする。
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

// RD-01 createApplicationRound。学生は自分の応募回、管理者は任意の学生の応募回を作成できる。指導員は作成不可。
// 本文（400）、権限・所有者（403）、学生の存在（404）、企業ロック（404）、30秒制限（429）の順に確認して登録する。
// 初期段階は応募日にかかわらず considering。
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
        // ロック順は企業行、次に操作者の users 行（DB設計）。
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

// RD-02 listApplicationRounds。学生は自分の応募回のみ、指導員と管理者は任意の学生の応募回を取得できる。
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

// RD-03。応募回の詳細を取得する。
async function getApplicationRound(actor, param) {
    return loadForView(actor, param);
}

// RD-04 updateApplicationRound。更新できるのは学生本人と管理者。指導員は閲覧のみ。
// 応募日を空欄にできるのは considering の間だけで、自動補完はしない。そこから別の段階に進めるには、応募回の面接質問すべてにカテゴリが必要。
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
        // 企業行、応募回の行の順にロックし、ロック取得後に読み直した値と入力を組み合わせる。
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

// RD-05 listRoundRecords。応募回の下書きを取得できるのは学生本人と管理者のみ。
async function listRoundRecords(actor, param) {
    const round = await loadForView(actor, param);
    const canSeeDrafts = actor.role === ROLES.ADMIN || isOwnerStudent(actor, round);
    return roundRepository.listRecords(Number(round.applicationRoundId), canSeeDrafts);
}

// RD-06 listRoundHistory。履歴には編集者と日時だけを含める。閲覧者は学生本人・指導員・管理者に限られるため、編集者名を表示できる。
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
