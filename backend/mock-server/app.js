// Builds the mock Express app. Routes are added per schedule week (rounds, records, search, admin).
const express = require('express');
const { bodyLimitBytes } = require('../common/recordInputRules.json');
const { authenticate } = require('./auth');
const { errorHandler, fail } = require('./helpers');
const { authRoutes } = require('./routes/auth');
const { companiesRoutes } = require('./routes/companies');
const { recordsRoutes } = require('./routes/records');
const { roundsRoutes } = require('./routes/rounds');
const { usersRoutes } = require('./routes/users');

function createApp(store) {
    const app = express();
    app.use('/api/activity-records', express.json({ limit: bodyLimitBytes }));
    app.use(express.json());

    app.get('/api/health', (req, res) => {
        res.json({ data: { status: 'ok', mock: true } });
    });

    const api = express.Router();
    api.use(authenticate(store));
    api.use(authRoutes());
    api.use(companiesRoutes(store));
    api.use(roundsRoutes(store));
    api.use(recordsRoutes(store));
    api.use(usersRoutes(store));
    app.use('/api', api);

    app.use(() => fail(404, 'NOT_FOUND'));
    app.use(errorHandler);
    return app;
}

module.exports = { createApp };
