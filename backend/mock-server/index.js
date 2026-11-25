// 開発用モックAPIは npm run dev:mock で起動する。再起動のたびにデータを初期化する。
// frontend/src/mocks のデータは ES モジュールなので、動的 import() で読み込む。
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { createApp } = require('./app');
const { createStore } = require('./store');

const PORT = process.env.PORT || 3000;
const MOCKS_DIR = path.resolve(__dirname, '../../frontend/src/mocks');

async function loadMock(name) {
    return import(pathToFileURL(path.join(MOCKS_DIR, `${name}.js`)).href);
}

async function main() {
    const [users, companies, rounds, records, history, operationLogs] = await Promise.all([
        loadMock('users'),
        loadMock('companies'),
        loadMock('rounds'),
        loadMock('records'),
        loadMock('history'),
        loadMock('operationLogs'),
    ]);

    const store = createStore({
        users: users.users,
        companies: companies.companies,
        rounds: rounds.rounds,
        records: records.records,
        recordHistory: history.recordHistory,
        roundHistory: history.roundHistory,
        operationLogs: operationLogs.operationLogs,
    });

    createApp(store).listen(PORT, () => {
        console.log(`CareerLink MOCK server listening on http://localhost:${PORT}`);
    });
}

main().catch((err) => {
    console.error('Failed to start mock server:', err);
    process.exit(1);
});
