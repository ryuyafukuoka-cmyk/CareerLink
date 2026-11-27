// 本人情報、卒業年度、一覧・詳細、権限、利用状態を扱うユーザーAPI（U-01〜U-07）。
// me をユーザーIDとして解釈しないよう、/users/me を /users/:userId より先に登録する。
// U-01 GET /api/users/me、U-02 POST /api/users/me/graduation-year、U-03 GET /api/users
// U-04 GET /api/users/:userId、U-05 PATCH .../graduation-year、U-06 PATCH .../role
// U-07 PATCH .../status
const express = require('express');
const { ok } = require('../common/response');
const userService = require('../services/userService');

function userHandler() {
    const router = express.Router();

    // U-01 は loadActor が RDS から取得したユーザー情報を返す。
    router.get('/users/me', (req, res) => {
        ok(res, req.user);
    });

    // U-02 のリクエスト本文は { year }。
    router.post('/users/me/graduation-year', async (req, res) => {
        const user = await userService.registerGraduationYear(req.actor, (req.body ?? {}).year);
        ok(res, user);
    });

    // U-03 の任意の条件は role、status、graduationYear。
    router.get('/users', async (req, res) => {
        ok(res, await userService.listUsers(req.actor, req.query));
    });

    // U-04
    router.get('/users/:userId', async (req, res) => {
        ok(res, await userService.getUserProfile(req.actor, req.params.userId));
    });

    // U-05 のリクエスト本文は { year }。
    router.patch('/users/:userId/graduation-year', async (req, res) => {
        const body = req.body ?? {};
        ok(res, await userService.updateGraduationYear(req.actor, req.params.userId, body.year));
    });

    // U-06 のリクエスト本文は { role }。
    router.patch('/users/:userId/role', async (req, res) => {
        const body = req.body ?? {};
        ok(res, await userService.changeUserRole(req.actor, req.params.userId, body.role));
    });

    // U-07 のリクエスト本文は { status }。
    router.patch('/users/:userId/status', async (req, res) => {
        const body = req.body ?? {};
        ok(res, await userService.setUserStatus(req.actor, req.params.userId, body.status));
    });

    return router;
}

module.exports = { userHandler };
