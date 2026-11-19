// U-03 to U-07. (U-01 / U-02 live in routes/auth.js.)
const express = require('express');
const { ok, fail, requireRole } = require('../helpers');
const { isValidGraduationYear } = require('../validators');

const ROLES = ['student', 'instructor', 'admin'];
const STATUSES = ['active', 'inactive'];

const bad = (field, messageId = 'E-202') =>
    fail(400, 'VALIDATION_ERROR', undefined, undefined, [{ field, messageId }]);

function usersRoutes(store) {
    const router = express.Router();
    const findOr404 = (userId) => store.getUser(userId) ?? fail(404, 'NOT_FOUND');

    // U-03 GET /api/users?role=&status=&graduationYear=  (instructors and admins only)
    router.get('/users', (req, res) => {
        requireRole(req.actor, 'instructor', 'admin');
        const { role, status, graduationYear } = req.query;
        const items = store.users
            .filter((u) => !role || u.role === role)
            .filter((u) => !status || u.status === status)
            .filter((u) => !graduationYear || String(u.graduationYear) === String(graduationYear));
        ok(res, items);
    });

    // U-04 GET /api/users/:userId  (the person themself, instructors, admins)
    router.get('/users/:userId', (req, res) => {
        const { actor } = req;
        if (actor.userId !== req.params.userId) requireRole(actor, 'instructor', 'admin');
        ok(res, findOr404(req.params.userId));
    });

    // U-05 PATCH /api/users/:userId/graduation-year  body: { year }  (instructors and admins; students only)
    router.patch('/users/:userId/graduation-year', (req, res) => {
        requireRole(req.actor, 'instructor', 'admin');
        const user = findOr404(req.params.userId);
        if (user.role !== 'student') fail(404, 'NOT_FOUND');
        if (!isValidGraduationYear(req.body?.year)) bad('year', 'E-209');
        user.graduationYear = req.body.year;
        ok(res, user);
    });

    // U-06 PATCH /api/users/:userId/role  body: { role }  (admin only, never yourself, never the last admin)
    router.patch('/users/:userId/role', (req, res) => {
        requireRole(req.actor, 'admin');
        const role = req.body?.role;
        if (!ROLES.includes(role)) bad('role');
        if (req.params.userId === req.actor.userId) fail(403, 'FORBIDDEN');
        const user = findOr404(req.params.userId);
        const activeAdmins = store.users.filter((u) => u.role === 'admin' && u.status === 'active');
        const leavesNoAdmin =
            user.role === 'admin' &&
            role !== 'admin' &&
            user.status === 'active' &&
            activeAdmins.length <= 1;
        if (leavesNoAdmin) fail(409, 'CONFLICT');
        user.role = role;
        store.addLog({
            operatorUserId: req.actor.userId,
            operationType: 'changeRole',
            targetType: 'user',
            targetId: user.userId,
        });
        ok(res, user);
    });

    // U-07 PATCH /api/users/:userId/status  body: { status }  (instructors and admins; students only; not yourself)
    router.patch('/users/:userId/status', (req, res) => {
        requireRole(req.actor, 'instructor', 'admin');
        const status = req.body?.status;
        if (!STATUSES.includes(status)) bad('status');
        if (req.params.userId === req.actor.userId) fail(403, 'FORBIDDEN');
        const user = findOr404(req.params.userId);
        if (user.role !== 'student') fail(403, 'FORBIDDEN');
        user.status = status;
        store.addLog({
            operatorUserId: req.actor.userId,
            operationType: 'setStatus',
            targetType: 'user',
            targetId: user.userId,
        });
        ok(res, user);
    });

    return router;
}

module.exports = { usersRoutes };
