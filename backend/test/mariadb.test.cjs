const assert = require('node:assert/strict');
const { before, after, test } = require('node:test');
const { startFixture } = require('./mariadb-fixture.cjs');

let api;
before(async () => {
    api = await startFixture();
});
after(async () => {
    if (api) await api.close();
});

async function login(subject, group = 'student') {
    const headers = { 'X-Dev-Sub': subject, 'X-Dev-Groups': group };
    const { data } = await api.request('POST', '/auth/login', { headers });
    return { headers, id: data.user.userId };
}

test('long draft round-trips through MariaDB and company, round and record writes leave audit entries', async () => {
    const student = await login('long-record');
    const teacher = await login('record-reviewer', 'instructor');
    const { headers } = student;
    const companyBody = {
        nameOfficial: 'テスト株式会社',
        nameKatakana: 'テスト',
        prefectures: ['13'],
        noWebsite: true,
    };
    const { data: company } = await api.request('POST', '/companies', {
        headers,
        body: companyBody,
        status: 201,
    });
    const roundBody = {
        studentUserId: student.id,
        companyId: company.companyId,
        applicationDate: '2026/11/19',
    };
    const { data: round } = await api.request('POST', '/application-rounds', {
        headers,
        body: roundBody,
        status: 201,
    });
    await api.request('POST', '/application-rounds', { headers, body: roundBody, status: 429 });
    const other = {
        activityName: '見学',
        content: '検'.repeat(20000),
        impressionAdvice: '感'.repeat(20000),
    };
    const body = {
        companyId: company.companyId,
        applicationRoundId: round.applicationRoundId,
        activityTypes: ['other'],
        conductedOn: '2026/11/19',
        mode: 'draft',
        sections: { other },
    };
    assert.ok(Buffer.byteLength(JSON.stringify(body)) > 100 * 1024);
    const { data: draft } = await api.request('POST', '/activity-records', {
        headers,
        body,
        status: 201,
    });
    const { data: saved } = await api.request(
        'GET',
        '/activity-records/' + draft.recordId + '/edit',
        { headers },
    );
    for (const [field, value] of Object.entries(other)) {
        assert.ok(saved.sections.other[field] === value, 'Stored value differs: ' + field);
    }
    assert.equal(saved.conductedOn, body.conductedOn);

    for (const [type, target, results] of [
        ['createCompany', company.companyId, ['success']],
        ['createRound', round.applicationRoundId, ['failure', 'success']],
        ['createRecord', draft.recordId, ['success']],
    ]) {
        const { data } = await api.request(
            'GET',
            '/operation-logs?operatorUserId=' + student.id + '&operationType=' + type,
            { headers: teacher.headers },
        );
        assert.deepEqual(data.items.map((log) => log.result).sort(), results);
        assert.equal(data.items.find((log) => log.result === 'success').targetId, target);
    }
});

test('user administration logs success and failure and rolls back when a success log cannot be saved', async (t) => {
    const admin = await login('user-admin', 'instructor');
    const teacher = await login('user-teacher', 'instructor');
    const student = await login('user-student');
    // The first admin is provisioned outside the API.
    await api.pool.query(
        "UPDATE user_roles SET role_id=(SELECT role_id FROM roles WHERE role_name='管理者') WHERE users_id=?",
        [admin.id],
    );
    const user = '/users/' + student.id;
    await api.request('PATCH', user + '/role', {
        headers: admin.headers,
        body: { role: 'instructor' },
    });
    await api.request('PATCH', user + '/status', {
        headers: teacher.headers,
        body: { status: 'inactive' },
        status: 403,
    });
    await api.request('PATCH', user + '/role', {
        headers: admin.headers,
        body: { role: 'student' },
    });
    await api.request('PATCH', user + '/status', {
        headers: teacher.headers,
        body: { status: 'inactive' },
    });

    await api.pool
        .query(`CREATE TRIGGER reject_test_success BEFORE INSERT ON operation_logs FOR EACH ROW
        BEGIN IF NEW.operation_result='success' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='test failure'; END IF; END`);
    try {
        const expectedError = t.mock.method(console, 'error', () => {});
        try {
            const { error } = await api.request('PATCH', user + '/status', {
                headers: teacher.headers,
                body: { status: 'active' },
                status: 500,
            });
            assert.equal(error.code, 'INTERNAL_ERROR');
        } finally {
            expectedError.mock.restore();
        }
    } finally {
        await api.pool.query('DROP TRIGGER reject_test_success');
    }
    const { data: profile } = await api.request('GET', user, { headers: admin.headers });
    assert.equal(profile.status, 'inactive');
    for (const [operator, type, results] of [
        [admin.id, 'changeRole', ['success', 'success']],
        [teacher.id, 'setStatus', ['failure', 'success', 'failure']],
    ]) {
        const { data } = await api.request(
            'GET',
            '/operation-logs?targetType=user&operationType=' + type + '&operatorUserId=' + operator,
            { headers: admin.headers },
        );
        assert.deepEqual(
            data.items.map((log) => [log.targetId, log.result]),
            results.map((result) => [student.id, result]),
        );
    }
});

test('JST date filter includes both ends of the day and finds legacy and current names across pages', async () => {
    const teacher = await login('date-reviewer', 'instructor');
    const midnight = Date.parse('2026-11-20T00:00:00+09:00') / 1000;
    for (const seconds of [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 86399, 86400]) {
        const type = seconds % 2 === 0 ? 'createRound' : 'createApplicationRound';
        await api.pool.query(
            "INSERT INTO operation_logs (users_id,operated_at,operation_type,target_table,target_id,operation_result) VALUES (?,FROM_UNIXTIME(?),?,'applications',?,'success')",
            [teacher.id, midnight + seconds, type, seconds + 2],
        );
    }
    for (const type of ['createRound', 'createApplicationRound']) {
        const url =
            '/operation-logs?from=2026/11/20&to=2026/11/20&targetType=round&operationType=' +
            type +
            '&operatorUserId=' +
            teacher.id;
        const page1 = (await api.request('GET', url, { headers: teacher.headers })).data;
        const page2 = (await api.request('GET', url + '&page=2', { headers: teacher.headers }))
            .data;
        assert.equal(page1.totalCount, 12);
        assert.equal(page1.items.length, 10);
        assert.equal(page2.items.length, 2);
        const rows = [...page1.items, ...page2.items];
        assert.deepEqual(
            rows.map((r) => Number(r.targetId)),
            [86401, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2],
        );
        assert.equal(rows[0].operatedAt, '2026-11-20T23:59:59+09:00');
        assert.equal(rows.at(-1).operatedAt, '2026-11-20T00:00:00+09:00');
    }
});
