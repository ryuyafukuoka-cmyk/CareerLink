// フロントエンドのモックデータをメモリに読み込む。サーバーを再起動すると初期状態に戻る。

const { fail } = require('./helpers');

// 応募回（RD-01）と活動記録（R-01）の作成間隔は30秒。テスト時は MOCK_COOLDOWN_MS で短縮できる。
const COOLDOWN_MS = Number(process.env.MOCK_COOLDOWN_MS ?? 30000);

const BASE_TIME = Date.parse('2026-07-01T00:00:00+09:00');

function maxId(items, key) {
    return items.reduce((max, item) => Math.max(max, Number(item[key])), 0);
}

function createStore(data) {
    const store = {
        users: structuredClone(data.users),
        companies: structuredClone(data.companies),
        rounds: structuredClone(data.rounds),
        records: structuredClone(data.records),
        recordHistory: structuredClone(data.recordHistory),
        roundHistory: structuredClone(data.roundHistory),
        operationLogs: structuredClone(data.operationLogs),
    };

    // 企業ごとに、削除確認用の変更番号（C-05・C-06）と並べ替え用の更新日時を内部で保持する。
    const companyMeta = new Map(
        store.companies.map((c, i) => [
            c.companyId,
            { deletionVersion: 0, updatedAt: BASE_TIME + i * 3600000 },
        ]),
    );

    store.getUser = (userId) => store.users.find((u) => u.userId === userId) ?? null;
    store.getCompany = (companyId) =>
        store.companies.find((c) => c.companyId === companyId) ?? null;
    store.getCompanyMeta = (companyId) => companyMeta.get(companyId);

    store.nextId = (items, key) => String(maxId(items, key) + 1);

    // 企業本体・応募回・活動記録を変更するたびに削除確認用の番号を進める。
    // 古い番号による削除要求は409で拒否する。
    store.touchCompany = (companyId) => {
        const meta = companyMeta.get(companyId);
        if (!meta) return;
        meta.deletionVersion += 1;
        meta.updatedAt = Date.now();
    };

    store.addCompany = (company) => {
        store.companies.push(company);
        companyMeta.set(company.companyId, { deletionVersion: 0, updatedAt: Date.now() });
    };

    // 企業と関連データをまとめて物理削除する（F-006 の企業削除に対応）。
    store.removeCompany = (companyId) => {
        const roundIds = new Set(
            store.rounds.filter((r) => r.companyId === companyId).map((r) => r.applicationRoundId),
        );
        const recordIds = new Set(
            store.records.filter((r) => r.companyId === companyId).map((r) => r.recordId),
        );
        store.records = store.records.filter((r) => !recordIds.has(r.recordId));
        store.recordHistory = store.recordHistory.filter((h) => !recordIds.has(h.recordId));
        store.rounds = store.rounds.filter((r) => !roundIds.has(r.applicationRoundId));
        store.roundHistory = store.roundHistory.filter((h) => !roundIds.has(h.applicationRoundId));
        store.companies = store.companies.filter((c) => c.companyId !== companyId);
        companyMeta.delete(companyId);
    };

    // 30秒制限は操作者ごとに、応募回（round・RD-01）と活動記録（record・R-01）を分けて管理する。
    // 作成成功時だけ時間を記録するため、保存後に markCreated を呼ぶ。
    const lastCreated = new Map();
    store.assertCooldown = (userId, kind) => {
        const last = lastCreated.get(`${userId}|${kind}`);
        const remaining = last === undefined ? 0 : COOLDOWN_MS - (Date.now() - last);
        if (remaining > 0) {
            const seconds = Math.ceil(remaining / 1000);
            fail(429, 'RATE_LIMITED', undefined, undefined, undefined, {
                'Retry-After': String(seconds),
            });
        }
    };
    store.markCreated = (userId, kind) => lastCreated.set(`${userId}|${kind}`, Date.now());

    // 応募回の履歴には編集者と日時のみを記録する。氏名はモックデータの形式で保持する。
    store.addRoundHistory = (applicationRoundId, editorUserId) => {
        store.roundHistory.push({
            applicationRoundId,
            editorUserId,
            editorName: store.getUser(editorUserId)?.displayName ?? '',
            editedAt: new Date().toISOString(),
        });
    };

    // 操作履歴は新しい順。活動記録の本文は含めない。
    store.addLog = ({
        operatorUserId,
        operationType,
        targetType,
        targetId,
        result = 'success',
    }) => {
        store.operationLogs.unshift({
            logId: store.nextId(store.operationLogs, 'logId'),
            operatorUserId,
            operatorName: store.getUser(operatorUserId)?.displayName ?? '',
            operatedAt: new Date().toISOString(),
            operationType,
            targetType,
            targetId,
            result,
        });
    };

    return store;
}

module.exports = { createStore };
