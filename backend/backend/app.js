// Builds the Express app. It is used by both server.js (local) and lambda.js (AWS), so the only
// thing that differs between them is the injected `authenticate` middleware.
const express = require('express');
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
    api.use(loadActor); // from here on: req.actor / req.user come from RDS (inactive -> 403)
    api.use(userHandler()); // U-01 to U-07
    api.use(companyHandler()); // C-01 to C-07
    api.use(roundHandler()); // RD-01 to RD-06
    api.use(recordHandler()); // R-01 to R-09, S-02
    api.use(searchHandler()); // S-01, S-03
    api.use(karteHandler()); // K-01 to K-03
    // Next step adds the logs (L) handler here.
    app.use('/api', api);

    app.use((req, res, next) => next(new AppError('NOT_FOUND')));
    app.use(errorHandler);
    return app;
}

module.exports = { createApp };
