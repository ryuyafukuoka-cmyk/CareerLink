// S-01 GET /api/activity-records (search), S-03 GET /api/graduation-years.
// S-02 (detail) is in recordHandler. `GET /activity-records` does not clash with `/mine`, `/drafts`
// or `/:recordId`, which all have more path segments or fixed names.
const express = require('express');
const { ok } = require('../common/response');
const searchService = require('../services/searchService');

function searchHandler() {
    const router = express.Router();

    // S-01 query: companyName?, graduationYear?, activityTypes? (comma separated), conductedFrom?,
    // conductedTo?, keyword?, matchMode? ('partial' | 'exact'), prefectures? (comma separated), page?
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
