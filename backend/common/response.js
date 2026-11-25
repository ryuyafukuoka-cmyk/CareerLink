// APIレスポンスを共通形式に整え、Express のエラーを処理する。
const { AppError, DEFAULT_MESSAGES } = require('./errors');
const { bodyTooLargeMessage } = require('./recordInputRules.json');

// 成功時は { data } を返す。既定は200、新規作成時は201を指定する。
function ok(res, data, status = 200) {
    res.status(status).json({ data });
}

function sendError(res, status, code, message, reason, details, headers) {
    const error = { code, message };
    if (reason) error.reason = reason;
    if (details) error.details = details;
    if (headers) res.set(headers);
    res.status(status).json({ error });
}

// Express がエラー処理として識別できるよう、引数は4つにする。
// message にスタックトレース、SQL、接続情報、トークンを含めない（共通仕様 §3）。
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
    if (err instanceof AppError) {
        return sendError(
            res,
            err.status,
            err.code,
            err.message,
            err.reason,
            err.details,
            err.headers,
        );
    }
    if (err.type === 'entity.parse.failed') {
        return sendError(res, 400, 'VALIDATION_ERROR', DEFAULT_MESSAGES.VALIDATION_ERROR);
    }

    if (err.type === 'entity.too.large') {
        return sendError(res, 400, 'VALIDATION_ERROR', bodyTooLargeMessage);
    }
    // 予期しないエラーの詳細はサーバー側のログ（CloudWatch Logs）だけに記録する。
    console.error('Unexpected error:', err);
    return sendError(res, 500, 'INTERNAL_ERROR', DEFAULT_MESSAGES.INTERNAL_ERROR);
}

module.exports = { ok, errorHandler };
