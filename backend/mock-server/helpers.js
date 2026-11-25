// 12月20日に削除予定のモックサーバー用。レスポンスを本体APIと同じ形式に整える。

const { AppError } = require('../common/errors');
const { errorHandler: apiErrorHandler } = require('../common/response');

const DEFAULT_MESSAGES = {
    VALIDATION_ERROR: '入力内容に誤りがあります。内容を確認してください。',
    UNAUTHORIZED: 'ログインの有効期限が切れました。もう一度ログインしてください。',
    FORBIDDEN: 'この操作を行う権限がありません。',
    NOT_FOUND: '対象のデータが見つかりません。',
    CONFLICT: 'この操作は現在の状態では行えません。画面を更新してもう一度お試しください。',
    RATE_LIMITED: '連続登録を避けるため、しばらくしてからもう一度お試しください。',
    INTERNAL_ERROR: 'エラーが発生しました。しばらくしてからもう一度お試しください。',
};

class HttpError extends Error {
    constructor(status, code, message, reason, details, headers) {
        super(message);
        this.status = status;
        this.code = code;
        this.reason = reason;
        this.details = details;
        this.headers = headers;
    }
}

// 成功時は { data } を返す。既定は200、新規作成時は201を指定する。
function ok(res, data, status = 200) {
    res.status(status).json({ data });
}

// 失敗時は例外を投げ、errorHandler が { error: { code, message, reason?, details? } } に整える。
function fail(status, code, message, reason, details, headers) {
    throw new HttpError(status, code, message ?? DEFAULT_MESSAGES[code], reason, details, headers);
}

// Express がエラー処理として識別できるよう、引数は4つにする。
function errorHandler(err, req, res, next) {
    if (err instanceof HttpError) {
        const error = { code: err.code, message: err.message };
        if (err.reason) error.reason = err.reason;
        if (err.details) error.details = err.details;
        if (err.headers) res.set(err.headers);
        return res.status(err.status).json({ error });
    }
    if (
        err instanceof AppError ||
        err.type === 'entity.parse.failed' ||
        err.type === 'entity.too.large'
    ) {
        return apiErrorHandler(err, req, res, next);
    }
    console.error(err);
    return res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: DEFAULT_MESSAGES.INTERNAL_ERROR },
    });
}

// 操作者の権限が許可リストに含まれなければ FORBIDDEN を投げる。
function requireRole(actor, ...roles) {
    if (!roles.includes(actor.role)) fail(403, 'FORBIDDEN');
}

module.exports = { HttpError, ok, fail, errorHandler, requireRole };
