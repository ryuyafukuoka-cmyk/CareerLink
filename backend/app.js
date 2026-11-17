// Builds the Express app. It is used by both server.js (local) and lambda.js (AWS), so the only
// thing that differs between them is the injected `authenticate` middleware.
const express = require('express');
const { AppError } = require('./common/errors');
const { errorHandler } = require('./common/response');
const { authHandler } = require('./handlers/authHandler');

function createApp({ authenticate }) {
    const app = express();
    app.use(express.json());

    // Public (the API Gateway route for it has no JWT authorizer).
    app.get('/api/health', (req, res) => {
        res.json({ data: { status: 'ok' } });
    });

    const api = express.Router();
    api.use(authenticate); // sets req.claims, or 401
    api.use(authHandler()); // login: before loadActor, it creates the user on first login
    // Next steps add `api.use(loadActor)` and then the users / companies / ... handlers here.
    app.use('/api', api);

    app.use((req, res, next) => next(new AppError('NOT_FOUND')));
    app.use(errorHandler);
    return app;
}

module.exports = { createApp };
