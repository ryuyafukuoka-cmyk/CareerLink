// U-03 GET /api/users. The other user endpoints (U-04 to U-07) are added in Week 5.
const express = require('express');
const { ok, requireRole } = require('../helpers');

function usersRoutes(store) {
    const router = express.Router();

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

    return router;
}

module.exports = { usersRoutes };
