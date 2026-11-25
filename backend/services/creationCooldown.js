// 同じ操作者による同種の新規登録は30秒間隔とする（機能詳細設計の共通仕様）。応募回は round（RD-01）、活動記録は activityRecord（R-01）。
// 管理者の代理登録では、対象の学生ではなく操作した管理者の登録時刻を使う。
const { AppError, forbidden } = require('../common/errors');
const cooldownRepository = require('../repositories/cooldownRepository');

const COOLDOWN_MICROS = 30 * 1000 * 1000;

// 作成と同じトランザクション（conn）内で、企業行をロックしてから呼ぶ。企業行 → 操作者の users 行の順でロックする。
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

// 新しい行を挿入した直後に、同じトランザクション内で呼ぶ。
async function markCreationSucceeded(conn, actor, kind) {
    await cooldownRepository.markCreated(conn, Number(actor.userId), kind);
}

module.exports = { assertCreationCooldown, markCreationSucceeded };
