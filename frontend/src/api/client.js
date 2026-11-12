// Base API client. Screens and hooks call this (through the per-feature files in api/), never fetch directly.
//
// - Adds the auth headers from the provider registered with configureApiClient()
// - Unwraps { data } on success
// - Turns { error } (and network / gateway failures) into a typed ApiError
// - 401 calls the global unauthorized handler, 429 reads Retry-After

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '');

// API error code -> message ID in messages/. Field-level errors use `details` instead.
const MESSAGE_ID_BY_CODE = {
    VALIDATION_ERROR: 'E-001',
    UNAUTHORIZED: 'E-002',
    FORBIDDEN: 'E-003',
    NOT_FOUND: 'E-004',
    CONFLICT: 'E-005',
    INTERNAL_ERROR: 'E-006',
    RATE_LIMITED: 'E-009',
    // Client-side codes
    NETWORK_ERROR: 'E-007',
    GATEWAY_THROTTLED: 'E-007',
    UNKNOWN_ERROR: 'E-006',
};

export class ApiError extends Error {
    /**
     * @param {object} p
     * @param {number} p.status HTTP status (0 for network errors)
     * @param {string} p.code API code (VALIDATION_ERROR, ...) or a client code (NETWORK_ERROR, ...)
     * @param {string} [p.message]
     * @param {string} [p.reason] e.g. NOT_ELIGIBLE / ACCOUNT_INACTIVE (login 403 only)
     * @param {{ field: string, messageId: string }[]} [p.details] field errors (VALIDATION_ERROR)
     * @param {number} [p.retryAfter] seconds to wait (429)
     */
    constructor({ status, code, message, reason, details, retryAfter }) {
        super(message ?? code);
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
        this.reason = reason;
        this.details = details;
        this.retryAfter = retryAfter;
    }

    // Message ID to show for this error (see messages/).
    get messageId() {
        return MESSAGE_ID_BY_CODE[this.code] ?? 'E-006';
    }

    // { fieldName: messageId } for forms. Empty object when there are no field errors.
    get fieldErrors() {
        return Object.fromEntries((this.details ?? []).map((d) => [d.field, d.messageId]));
    }
}

let getAuthHeaders = () => ({});
let onUnauthorized = () => {};

/**
 * Register how requests are authenticated and what happens on 401.
 * @param {object} options
 * @param {() => Record<string, string>} [options.getAuthHeaders] e.g. () => ({ Authorization: 'Bearer ...' })
 * @param {(error: ApiError) => void} [options.onUnauthorized]
 */
export function configureApiClient(options = {}) {
    if (options.getAuthHeaders) getAuthHeaders = options.getAuthHeaders;
    if (options.onUnauthorized) onUnauthorized = options.onUnauthorized;
}

// Arrays become comma-separated values; empty values are omitted. "/" is URL-encoded by URLSearchParams.
function buildUrl(path, query) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query ?? {})) {
        if (value === undefined || value === null || value === '') continue;
        if (Array.isArray(value)) {
            if (value.length > 0) params.set(key, value.join(','));
        } else {
            params.set(key, String(value));
        }
    }
    const queryString = params.toString();
    return `${BASE_URL}${path}${queryString ? `?${queryString}` : ''}`;
}

async function readJson(response) {
    try {
        return await response.json();
    } catch {
        return null; // empty or non-JSON body (e.g. API Gateway responses)
    }
}

function parseRetryAfter(value) {
    const seconds = Number.parseInt(value ?? '', 10);
    return Number.isFinite(seconds) && seconds >= 0 ? seconds : undefined;
}

async function request(method, path, { query, body, signal } = {}) {
    const headers = { Accept: 'application/json', ...getAuthHeaders() };
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    let response;
    try {
        response = await fetch(buildUrl(path, query), {
            method,
            headers,
            body: body === undefined ? undefined : JSON.stringify(body),
            signal,
        });
    } catch (cause) {
        if (cause?.name === 'AbortError') throw cause;
        throw new ApiError({ status: 0, code: 'NETWORK_ERROR' });
    }

    const payload = await readJson(response);
    if (response.ok) return payload?.data ?? null;

    const { status } = response;
    const envelope = payload?.error;
    let error;
    if (envelope) {
        error = new ApiError({
            status,
            code: envelope.code,
            message: envelope.message,
            reason: envelope.reason,
            details: envelope.details,
            retryAfter: parseRetryAfter(response.headers.get('Retry-After')),
        });
    } else if (status === 429) {
        // API Gateway throttling has a different body: show it as a communication limit.
        error = new ApiError({
            status,
            code: 'GATEWAY_THROTTLED',
            retryAfter: parseRetryAfter(response.headers.get('Retry-After')),
        });
    } else {
        error = new ApiError({ status, code: status >= 500 ? 'INTERNAL_ERROR' : 'UNKNOWN_ERROR' });
    }

    if (status === 401) onUnauthorized(error);
    throw error;
}

export const api = {
    get: (path, options) => request('GET', path, options),
    post: (path, body, options) => request('POST', path, { ...options, body }),
    put: (path, body, options) => request('PUT', path, { ...options, body }),
    patch: (path, body, options) => request('PATCH', path, { ...options, body }),
    delete: (path, body, options) => request('DELETE', path, { ...options, body }),
};
