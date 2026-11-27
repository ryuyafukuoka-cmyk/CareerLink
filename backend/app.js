// ローカルの server.js と AWS の lambda.js が共用する Express アプリを構築する。
// 実行環境に応じて authenticate ミドルウェアを渡す。
const express = require('express');
const { bodyLimitBytes } = require('./common/recordInputRules.json');
const { AppError } = require('./common/errors');
const { errorHandler } = require('./common/response');
const { loadActor } = require('./authorization/loadActor');
const { authHandler } = require('./handlers/authHandler');
const { userHandler } = require('./handlers/userHandler');
const { companyHandler } = require('./handlers/companyHandler');
const { roundHandler } = require('./handlers/roundHandler');
const { recordHandler } = require('./handlers/recordHandler');
const { searchHandler } = require('./handlers/searchHandler');
const { karteHandler } = require('./handlers/karteHandler');
const { operationLogHandler } = require('./handlers/operationLogHandler');

function createApp({ authenticate }) {
    const app = express();

    // 活動記録は複数のセクションに長文を含められるため、専用の本文サイズ上限を使う。
    app.use('/api/activity-records', express.json({ limit: bodyLimitBytes }));
    app.use(express.json());

    // ヘルスチェックは公開する。API Gateway でもこのルートには JWT 認証を設定しない。
    app.get('/api/health', (req, res) => {
        res.json({ data: { status: 'ok' } });
    });

    const api = express.Router();
    api.use(authenticate); // 認証に成功したら req.claims を設定し、失敗したら 401 を返す。
    api.use(authHandler()); // 初回ログインでユーザーを作成できるよう、loadActor より先に処理する。
    api.use(loadActor); // RDS のユーザー情報から req.actor と req.user を設定する。無効なユーザーには 403 を返す。
    api.use(userHandler()); // U-01〜U-07
    api.use(companyHandler()); // C-01〜C-07
    api.use(roundHandler()); // RD-01〜RD-06
    api.use(recordHandler()); // R-01〜R-09、S-02
    api.use(searchHandler()); // S-01、S-03
    api.use(karteHandler()); // K-01〜K-03
    api.use(operationLogHandler()); // L-01、L-02
    app.use('/api', api);

    app.use((req, res, next) => next(new AppError('NOT_FOUND')));
    app.use(errorHandler);
    return app;
}

module.exports = { createApp };
