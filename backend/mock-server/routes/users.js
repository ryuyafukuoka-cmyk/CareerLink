// ユーザー管理（U-03〜U-07）。U-01・U-02 は routes/auth.js で扱う。
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

    // U-03 GET /api/users?role=&status=&graduationYear=（指導員・管理者のみ）。
    router.get('/users', (req, res) => {
        requireRole(req.actor, 'instructor', 'admin');
        const { role, status, graduationYear } = req.query;
        const items = store.users
            .filter((u) => !role || u.role === role)
            .filter((u) => !status || u.status === status)
            .filter((u) => !graduationYear || String(u.graduationYear) === String(graduationYear));
        ok(res, items);
    });

    // U-04 GET /api/users/:userId（本人・指導員・管理者のみ）。
    router.get('/users/:userId', (req, res) => {
        const { actor } = req;
        if (actor.userId !== req.params.userId) requireRole(actor, 'instructor', 'admin');
        ok(res, findOr404(req.params.userId));
    });

    // U-05 PATCH /api/users/:userId/graduation-year。本文は { year }。指導員・管理者が学生の卒業年度を変更する。
    router.patch('/users/:userId/graduation-year', (req, res) => {
        requireRole(req.actor, 'instructor', 'admin');
        const user = findOr404(req.params.userId);
        if (user.role !== 'student') fail(404, 'NOT_FOUND');
        if (!isValidGraduationYear(req.body?.year)) bad('year', 'E-209');
        user.graduationYear = req.body.year;
        ok(res, user);
    });

    // U-06 PATCH /api/users/:userId/role。本文は { role }。管理者のみ。自分自身の変更や、管理者が0人になる変更は禁止。
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

    // U-07 PATCH /api/users/:userId/status。本文は { status }。指導員・管理者が学生の利用状態を変更する。自分自身は変更できない。
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
