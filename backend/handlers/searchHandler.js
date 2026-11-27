// S-01 は活動記録検索、S-03 は卒業年度一覧。詳細（S-02）は recordHandler が扱う。
// 検索の /activity-records と、末尾に /mine、/drafts、/:recordId を持つルートは区別できる。
const express = require('express');
const { ok } = require('../common/response');
const searchService = require('../services/searchService');

function searchHandler() {
    const router = express.Router();

    // S-01 の任意の条件は companyName、graduationYear、activityTypes、conductedFrom、conductedTo、keyword、matchMode、prefectures、page。
    // activityTypes と prefectures はカンマ区切り。matchMode は partial または exact。
    router.get('/activity-records', async (req, res) => {
        ok(res, await searchService.searchActivityRecords(req.query));
    });

    // S-03
    router.get('/graduation-years', async (req, res) => {
        ok(res, await searchService.listAvailableGraduationYears());
    });

    return router;
}

module.exports = { searchHandler };
