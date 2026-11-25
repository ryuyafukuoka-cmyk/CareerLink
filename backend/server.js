// npm run dev:back で使うローカル開発用の入口。開発用ヘッダーでログインする。
// デプロイ先の Lambda では lambda.js を使う。
const { createApp } = require('./app');
const { devAuthenticate } = require('./authorization/devAuthenticate');

const PORT = process.env.PORT || 3000;

createApp({ authenticate: devAuthenticate }).listen(PORT, () => {
    console.log(`CareerLink backend listening on http://localhost:${PORT}`);
});
