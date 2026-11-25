// 活動記録検索（S-01）と卒業年度一覧（S-03）。対象は完了済み記録のみ。下書きや選考情報は含めない。
const express = require('express');
const { ok, fail } = require('../helpers');
const { isRealDate, parsePage } = require('../validators');
const { containsWord } = require('../../common/wordMatch');

const PAGE_SIZE = 10;
const ACTIVITY_TYPES = ['interview', 'exam', 'briefing', 'other'];

const list = (raw) =>
    String(raw ?? '')
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);

// キーワード検索の対象は質問文、回答、試験内容、各種別の感想。
function searchableTexts(record) {
    const s = record.sections ?? {};
    const texts = [];
    for (const q of s.interview?.questions ?? []) texts.push(q.content, q.answer);
    texts.push(s.interview?.impression);
    texts.push(s.exam?.content, s.exam?.impression);
    texts.push(s.briefing?.impression);
    texts.push(s.other?.impressionAdvice);
    return texts.filter((t) => typeof t === 'string' && t !== '');
}

// S-01 のクエリを解析する。項目ごとのエラーを { field, messageId } の形式でまとめて返す。
function parseQuery(query) {
    const details = [];
    const page = parsePage(query.page);
    if (page === null) details.push({ field: 'page', messageId: 'E-202' });

    let graduationYear;
    if (query.graduationYear !== undefined && query.graduationYear !== '') {
        const y = Number(query.graduationYear);
        if (!/^\d{4}$/.test(String(query.graduationYear)) || y < 2000 || y > 2100) {
            details.push({ field: 'graduationYear', messageId: 'E-209' });
        } else graduationYear = y;
    }

    const activityTypes = list(query.activityTypes);
    if (!activityTypes.every((t) => ACTIVITY_TYPES.includes(t))) {
        details.push({ field: 'activityTypes', messageId: 'E-202' });
    }

    const dates = {};
    for (const key of ['conductedFrom', 'conductedTo']) {
        const raw = query[key];
        if (raw === undefined || raw === '') continue;
        if (!isRealDate(raw)) details.push({ field: key, messageId: 'E-207' });
        else dates[key] = raw;
    }
    if (dates.conductedFrom && dates.conductedTo && dates.conductedFrom > dates.conductedTo) {
        details.push({ field: 'conductedFrom', messageId: 'E-208' });
    }

    const tokens = String(query.keyword ?? '')
        .split(/[\s\u3000]+/u)
        .filter(Boolean);
    const matchMode = query.matchMode ?? 'partial';
    if (!['partial', 'exact'].includes(matchMode)) {
        details.push({ field: 'matchMode', messageId: 'E-202' });
    }

    const regionIds = list(query.prefectures);
    if (!regionIds.every((v) => /^\d{1,2}$/.test(v) && Number(v) >= 1 && Number(v) <= 55)) {
        details.push({ field: 'prefectures', messageId: 'E-202' });
    }

    if (details.length > 0) fail(400, 'VALIDATION_ERROR', undefined, undefined, details);
    return {
        page,
        companyName: String(query.companyName ?? '')
            .trim()
            .toLowerCase(),
        graduationYear,
        activityTypes,
        ...dates,
        tokens,
        exact: matchMode === 'exact',
        regionIds,
    };
}

function searchRoutes(store) {
    const router = express.Router();

    // S-01 GET /api/activity-records?companyName=&graduationYear=&activityTypes=&conductedFrom=&conductedTo=&keyword=&matchMode=&prefectures=&page=
    router.get('/activity-records', (req, res) => {
        const f = parseQuery(req.query);

        const items = store.records
            .filter((r) => r.status === 'completed')
            .filter((r) => {
                const company = store.getCompany(r.companyId);
                const owner = store.getUser(r.ownerUserId);
                if (!company || !owner) return false;
                if (
                    f.companyName &&
                    !company.nameOfficial.toLowerCase().includes(f.companyName) &&
                    !company.nameKatakana.toLowerCase().includes(f.companyName)
                ) {
                    return false;
                }
                if (f.graduationYear !== undefined && owner.graduationYear !== f.graduationYear) {
                    return false;
                }
                // 同じ条件内の値は OR、異なる条件同士は AND で組み合わせる。
                if (
                    f.activityTypes.length > 0 &&
                    !r.activityTypes.some((t) => f.activityTypes.includes(t))
                ) {
                    return false;
                }
                if (f.conductedFrom && (r.conductedOn ?? '') < f.conductedFrom) return false;
                if (f.conductedTo && (r.conductedOn ?? '') > f.conductedTo) return false;
                if (
                    f.regionIds.length > 0 &&
                    !company.prefectures.some((p) => f.regionIds.includes(p))
                ) {
                    return false;
                }
                if (f.tokens.length > 0) {
                    const texts = searchableTexts(r);
                    // 検索語はすべて一致する必要があり、各語はいずれかの項目で一致すればよい。大文字・小文字は区別しない。
                    const hit = (token) =>
                        texts.some((t) =>
                            f.exact
                                ? containsWord(t, token)
                                : t.toLowerCase().includes(token.toLowerCase()),
                        );
                    if (!f.tokens.every(hit)) return false;
                }
                return true;
            })
            .sort(
                (a, b) =>
                    String(b.conductedOn ?? '').localeCompare(String(a.conductedOn ?? '')) ||
                    Number(b.recordId) - Number(a.recordId),
            )
            // 一覧には要約だけを返し、氏名、本文の抜粋、選考情報は含めない。
            .map((r) => ({
                recordId: r.recordId,
                companyId: r.companyId,
                companyName: store.getCompany(r.companyId).nameOfficial,
                activityTypes: r.activityTypes,
                conductedOn: r.conductedOn,
                graduationYear: store.getUser(r.ownerUserId).graduationYear,
            }));

        const start = (f.page - 1) * PAGE_SIZE;
        ok(res, {
            items: items.slice(start, start + PAGE_SIZE),
            totalCount: items.length,
            page: f.page,
            pageSize: PAGE_SIZE,
        });
    });

    // S-03 GET /api/graduation-years。完了済み記録がある卒業年度を新しい順に返す。
    router.get('/graduation-years', (req, res) => {
        const years = new Set(
            store.records
                .filter((r) => r.status === 'completed')
                .map((r) => store.getUser(r.ownerUserId)?.graduationYear)
                .filter((y) => Number.isInteger(y)),
        );
        ok(
            res,
            [...years].sort((a, b) => b - a),
        );
    });

    return router;
}

module.exports = { searchRoutes };
