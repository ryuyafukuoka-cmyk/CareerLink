const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createApp } = require('../app');
const { unauthorized } = require('../common/errors');
const { startApi } = require('./http.cjs');

test('record HTTP body limit accepts 512 KiB and rejects one extra byte with 400', async (t) => {
    // Stop at authentication after the real JSON middleware, without opening a DB connection.
    const api = await startApi(
        createApp({ authenticate: (req, res, next) => next(unauthorized()) }),
    );
    t.after(api.close);
    const body = { text: '' };
    body.text = 'x'.repeat(512 * 1024 - Buffer.byteLength(JSON.stringify(body)));
    await api.request('POST', '/activity-records', { body, status: 401 });
    body.text += 'x';
    const { error } = await api.request('POST', '/activity-records', { body, status: 400 });
    assert.equal(error.code, 'VALIDATION_ERROR');
});

test('interview follow-ups fit exactly in a TEXT column and reject one extra UTF-8 byte', async () => {
    const { validateRecordContent } = await import('../common/recordInput.mjs');
    const followUps = ['追'.repeat(20000), '問'.repeat(1800), '改行\nあり', ''];
    followUps[3] = 'a'.repeat(65535 - Buffer.byteLength(JSON.stringify(followUps)));
    const question = { category: 'その他', content: '質問', followUps };
    const input = {
        activityTypes: ['interview'],
        sections: { interview: { questions: [question] } },
    };
    const validate = () => validateRecordContent(input, 'draft', 'considering').details;
    assert.deepEqual(validate(), []);
    followUps[3] += 'a';
    assert.deepEqual(validate(), [
        { field: 'sections.interview.questions[0].followUps', messageId: 'E-202' },
    ]);
});

test('mock operation-log API finds old and new round names and keeps record events separate', async (t) => {
    const { createApp: createMock } = require('../mock-server/app');
    const { createStore } = require('../mock-server/store');
    const store = createStore({
        users: [{ userId: '1', role: 'instructor', status: 'active' }],
        companies: [],
        rounds: [],
        records: [],
        recordHistory: [],
        roundHistory: [],
        operationLogs: [],
    });
    for (const [type, targetType] of [
        ['createRound', 'round'],
        ['createApplicationRound', 'round'],
        ['saveDraft', 'record'],
    ]) {
        store.addLog({ operatorUserId: '1', operationType: type, targetType, targetId: '1' });
    }
    const api = await startApi(createMock(store));
    t.after(api.close);
    const headers = { 'X-Mock-User': '1' };
    for (const name of ['createRound', 'createApplicationRound']) {
        const { data } = await api.request(
            'GET',
            '/operation-logs?targetType=round&operationType=' + name,
            { headers },
        );
        assert.equal(data.totalCount, 2);
        assert.deepEqual(data.items.map((log) => log.operationType).sort(), [
            'createApplicationRound',
            'createRound',
        ]);
    }
});

test('Lambda health is public and a protected route requires authorizer claims', async () => {
    const { handler } = require('../lambda');
    async function get(path) {
        return handler(
            {
                version: '2.0',
                routeKey: '$default',
                rawPath: path,
                rawQueryString: '',
                headers: { host: 'test.local' },
                requestContext: {
                    domainName: 'test.local',
                    requestId: 'test-request',
                    stage: '$default',
                    http: { method: 'GET', path, protocol: 'HTTP/1.1', sourceIp: '127.0.0.1' },
                },
                isBase64Encoded: false,
            },
            {},
        );
    }
    const health = await get('/api/health');
    assert.equal(health.statusCode, 200);
    assert.equal(JSON.parse(health.body).data.status, 'ok');
    const protectedRoute = await get('/api/users/me');
    assert.equal(protectedRoute.statusCode, 401);
    assert.equal(JSON.parse(protectedRoute.body).error.code, 'UNAUTHORIZED');
});
