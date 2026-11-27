const assert = require('node:assert/strict');
const { once } = require('node:events');

async function startApi(app) {
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const base = 'http://127.0.0.1:' + server.address().port + '/api';

    async function request(method, path, { headers, body, status = 200 } = {}) {
        const response = await fetch(base + path, {
            method,
            headers:
                body === undefined ? headers : { 'Content-Type': 'application/json', ...headers },
            body: body === undefined ? undefined : JSON.stringify(body),
        });
        const payload = await response.json();
        assert.equal(
            response.status,
            status,
            method + ' ' + path + ': ' + JSON.stringify(payload.error),
        );
        if (status >= 400) assert.ok(payload.error.code);
        else assert.ok(Object.hasOwn(payload, 'data'));
        return payload;
    }

    function close() {
        return new Promise((resolve, reject) =>
            server.close((error) => (error ? reject(error) : resolve())),
        );
    }

    return { request, close };
}

module.exports = { startApi };
