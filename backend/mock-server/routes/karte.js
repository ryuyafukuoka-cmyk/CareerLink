// K-01 company karte, K-02 interview info, K-03 exam info. Completed records only.
const express = require('express');
const { ok, fail } = require('../helpers');

const ACTIVITY_TYPES = ['interview', 'exam', 'briefing', 'other'];

function karteRoutes(store) {
    const router = express.Router();

    // Validates companyId (404) and the filter (400), then returns the company's completed records, newest year first.
    function load(req) {
        const company = store.getCompany(req.params.companyId) ?? fail(404, 'NOT_FOUND');
        const { graduationYear, activityType } = req.query;
        const details = [];
        let year;
        if (graduationYear !== undefined && graduationYear !== '') {
            year = Number(graduationYear);
            if (!/^\d{4}$/.test(String(graduationYear)) || year < 2000 || year > 2100) {
                details.push({ field: 'graduationYear', messageId: 'E-209' });
            }
        }
        if (
            activityType !== undefined &&
            activityType !== '' &&
            !ACTIVITY_TYPES.includes(activityType)
        ) {
            details.push({ field: 'activityType', messageId: 'E-202' });
        }
        if (details.length > 0) fail(400, 'VALIDATION_ERROR', undefined, undefined, details);

        const records = store.records
            .filter((r) => r.status === 'completed' && r.companyId === company.companyId)
            .map((r) => ({ record: r, owner: store.getUser(r.ownerUserId) }))
            .filter(({ owner }) => owner && Number.isInteger(owner.graduationYear))
            .filter(({ owner }) => year === undefined || owner.graduationYear === year)
            .filter(({ record }) => !activityType || record.activityTypes.includes(activityType))
            .sort(
                (a, b) =>
                    b.owner.graduationYear - a.owner.graduationYear ||
                    String(b.record.conductedOn ?? '').localeCompare(
                        String(a.record.conductedOn ?? ''),
                    ) ||
                    Number(b.record.recordId) - Number(a.record.recordId),
            );
        return { company, records };
    }

    // K-01 GET /api/companies/:companyId/karte?graduationYear=&activityType=
    router.get('/companies/:companyId/karte', (req, res) => {
        const actor = req.actor;
        const { company, records } = load(req);
        const years = [];
        for (const { record, owner } of records) {
            let group = years.at(-1);
            if (!group || group.graduationYear !== owner.graduationYear) {
                group = { graduationYear: owner.graduationYear, records: [] };
                years.push(group);
            }
            // Poster name: the person themself, instructors and admins only.
            const canSeeName = actor.userId === owner.userId || actor.role !== 'student';
            group.records.push({
                recordId: record.recordId,
                conductedOn: record.conductedOn,
                activityTypes: record.activityTypes,
                posterName: canSeeName ? owner.displayName : null,
            });
        }
        ok(res, { company, years });
    });

    // K-02 GET /api/companies/:companyId/interview-info: questions and follow-ups, never answers.
    router.get('/companies/:companyId/interview-info', (req, res) => {
        const items = [];
        for (const { record, owner } of load(req).records) {
            for (const q of record.sections?.interview?.questions ?? []) {
                if (!q.content) continue;
                items.push({
                    recordId: record.recordId,
                    graduationYear: owner.graduationYear,
                    conductedOn: record.conductedOn,
                    category: q.category ?? null,
                    content: q.content,
                    followUps: q.followUps ?? [],
                });
            }
        }
        ok(res, items);
    });

    // K-03 GET /api/companies/:companyId/exam-info
    router.get('/companies/:companyId/exam-info', (req, res) => {
        const items = [];
        for (const { record, owner } of load(req).records) {
            const exam = record.sections?.exam;
            if (!exam) continue;
            items.push({
                recordId: record.recordId,
                graduationYear: owner.graduationYear,
                conductedOn: record.conductedOn,
                nameFormat: exam.nameFormat,
                content: exam.content,
                preparation: exam.preparation || null,
            });
        }
        ok(res, items);
    });

    return router;
}

module.exports = { karteRoutes };
