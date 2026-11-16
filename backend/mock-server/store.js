// In-memory store loaded from the frontend mock data. Resets on every server restart.

const { fail } = require('./helpers');

// 30-second limit for new rounds (RD-01) and new records (R-01). MOCK_COOLDOWN_MS can shorten it for testing.
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

    // Hidden per-company fields: change-detection version (for C-05/C-06) and update time (for ordering).
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

    // Call on EVERY change to a company or its related data (company, rounds, records).
    // Bumps the deletion version so a stale delete confirmation is rejected with 409.
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

    // Physically deletes a company and all related data (mirrors F-006 company deletion).
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

    // 30-second limit: per operator and per kind ('round' = RD-01, 'record' = R-01, separate slots).
    // Only a successful creation starts the clock (call markCreated after saving).
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

    // Round history: editor and time only (names are stored as in the mock data).
    store.addRoundHistory = (applicationRoundId, editorUserId) => {
        store.roundHistory.push({
            applicationRoundId,
            editorUserId,
            editorName: store.getUser(editorUserId)?.displayName ?? '',
            editedAt: new Date().toISOString(),
        });
    };

    // Operation log (newest first). Never stores record bodies.
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
