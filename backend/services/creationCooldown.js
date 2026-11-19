// 30-second limit between two new registrations of the same kind by the same operator
// (機能詳細設計 共通仕様). Used by RD-01 ('round') and, later, R-01 ('activityRecord').
// Admin proxy creation counts for the admin (the operator), not for the target student.
const { AppError, forbidden } = require('../common/errors');
const cooldownRepository = require('../repositories/cooldownRepository');

const COOLDOWN_MICROS = 30 * 1000 * 1000;

// Must run inside the creation transaction (conn), after the company row is locked
// (lock order: company row, then the operator's users row).
async function assertCreationCooldown(conn, actor, kind) {
    const elapsed = await cooldownRepository.lockAndGetElapsedMicros(
        conn,
        Number(actor.userId),
        kind,
    );
    if (elapsed === undefined) throw forbidden();
    if (elapsed !== null && elapsed < COOLDOWN_MICROS) {
        const retryAfter = Math.max(1, Math.ceil((COOLDOWN_MICROS - elapsed) / 1_000_000));
        throw new AppError('RATE_LIMITED', { headers: { 'Retry-After': String(retryAfter) } });
    }
}

// Call in the same transaction, right after the new row is inserted.
async function markCreationSucceeded(conn, actor, kind) {
    await cooldownRepository.markCreated(conn, Number(actor.userId), kind);
}

module.exports = { assertCreationCooldown, markCreationSucceeded };
