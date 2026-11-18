// Response envelope helpers and the Express error middleware.
const { AppError, DEFAULT_MESSAGES } = require('./errors');

// Success: { data }. Defaults to 200; pass 201 for creation.
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

// Express error middleware (must keep 4 arguments).
// `message` never contains stack traces, SQL, connection info or tokens (共通仕様 §3).
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
    if (err.type === 'entity.too.large') {
        return sendError(
            res,
            400,
            'VALIDATION_ERROR',
            '入力内容が多すぎます。文章を短くしてからもう一度保存してください。',
        );
    }
    // Unexpected: log the detail server-side only (CloudWatch Logs), never return it.
    console.error('Unexpected error:', err);
    return sendError(res, 500, 'INTERNAL_ERROR', DEFAULT_MESSAGES.INTERNAL_ERROR);
}

module.exports = { ok, errorHandler };
