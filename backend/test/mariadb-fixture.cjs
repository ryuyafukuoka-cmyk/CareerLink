const { randomUUID } = require('node:crypto');
const { readFile } = require('node:fs/promises');
const path = require('node:path');
const mysql = require('mysql2/promise');
const { startApi } = require('./http.cjs');

// 明示したテスト用の接続設定で新しいスキーマを作成する。既存のDB名を入力として受け取らない。
async function startFixture() {
    const {
        TEST_DB_HOST = '127.0.0.1',
        TEST_DB_PORT = '33307',
        TEST_DB_USER,
        TEST_DB_PASSWORD,
    } = process.env;
    if (!TEST_DB_USER || TEST_DB_PASSWORD === undefined) {
        throw new Error(
            'Set TEST_DB_USER and TEST_DB_PASSWORD as described in backend/バックエンドメモ.md',
        );
    }
    const name = 'careerlink_test_' + randomUUID().replaceAll('-', '');
    const admin = await mysql.createConnection({
        host: TEST_DB_HOST,
        port: Number(TEST_DB_PORT),
        user: TEST_DB_USER,
        password: TEST_DB_PASSWORD,
        charset: 'utf8mb4',
        multipleStatements: true,
        connectTimeout: 5000,
    });
    let created = false;
    let pool;
    let api;
    async function close() {
        try {
            try {
                if (api) await api.close();
            } finally {
                if (pool) await pool.end();
            }
        } finally {
            try {
                if (created) await admin.query('DROP DATABASE ??', [name]);
            } finally {
                await admin.end();
            }
        }
    }
    try {
        await admin.query('CREATE DATABASE ?? CHARACTER SET utf8mb4', [name]);
        created = true;
        await admin.query('USE ??', [name]);
        await admin.query(await readFile(path.join(__dirname, 'fixtures', 'schema.sql'), 'utf8'));
        Object.assign(process.env, {
            NODE_ENV: 'test',
            DB_HOST: TEST_DB_HOST,
            DB_PORT: TEST_DB_PORT,
            DB_NAME: name,
            DB_USER: TEST_DB_USER,
            DB_PASSWORD: TEST_DB_PASSWORD,
            AD_STUDENT_GROUP: 'student',
            AD_INSTRUCTOR_GROUP: 'instructor',
            DB_CONNECTION_LIMIT: '2',
        });
        // アプリはモジュールの初回読み込み時にDB接続設定を読み取る。
        pool = require('../db/pool').getPool();
        const { createApp } = require('../app');
        const { devAuthenticate } = require('../authorization/devAuthenticate');
        api = await startApi(createApp({ authenticate: devAuthenticate }));
        return { request: api.request, pool, close };
    } catch (error) {
        await close();
        throw error;
    }
}

module.exports = { startFixture };
