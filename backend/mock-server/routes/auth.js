// A-01 login, U-01 me, U-02 first graduation year.
const express = require('express');
const { ok, fail, requireRole } = require('../helpers');
const { isValidGraduationYear } = require('../validators');

function authRoutes() {
    const router = express.Router();

    // A-01 POST /api/auth/login (the actor was already resolved from X-Mock-User)
    router.post('/auth/login', (req, res) => {
        const user = req.actor;
        const isFirstLogin = user.role === 'student' && user.graduationYear === null;
        ok(res, { user, isFirstLogin });
    });

    // U-01 GET /api/users/me
    router.get('/users/me', (req, res) => {
        ok(res, req.actor);
    });

    // U-02 POST /api/users/me/graduation-year  body: { year }
    router.post('/users/me/graduation-year', (req, res) => {
        const actor = req.actor;
        requireRole(actor, 'student');
        const year = req.body?.year;
        if (!isValidGraduationYear(year)) {
            fail(400, 'VALIDATION_ERROR', undefined, undefined, [
                { field: 'year', messageId: 'E-209' },
            ]);
        }
        if (actor.graduationYear !== null) fail(409, 'CONFLICT', undefined);
        actor.graduationYear = year;
        ok(res, actor);
    });

    return router;
}

module.exports = { authRoutes };
