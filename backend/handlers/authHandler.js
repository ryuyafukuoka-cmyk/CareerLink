// A-01 POST /api/auth/login。初回はユーザーが未登録の場合があるため、検証済みのクレームだけを使う。
const express = require('express');
const { ok } = require('../common/response');
const authService = require('../services/authService');

function authHandler() {
    const router = express.Router();

    router.post('/auth/login', async (req, res) => {
        const result = await authService.handleLogin(req.claims);
        ok(res, result);
    });

    return router;
}

module.exports = { authHandler };
