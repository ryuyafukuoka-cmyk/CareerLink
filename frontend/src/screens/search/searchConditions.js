// Search conditions (SC-03-01 / SC-03-02). The searched conditions live in the URL query, so the
// result page, the detail page "back" link and the "change conditions" link all keep them.
import { MATCH_MODES } from '@shared/definitions';
import { isRealDate } from '@/utils/date.js';

export const EMPTY_CONDITIONS = Object.freeze({
    companyName: '',
    graduationYear: '',
    activityTypes: [],
    conductedFrom: '',
    conductedTo: '',
    regions: [],
    keyword: '',
    matchMode: MATCH_MODES.PARTIAL,
});

const splitList = (text) => (text ? text.split(',').filter(Boolean) : []);

// URLSearchParams -> form values.
export function conditionsFromParams(params) {
    return {
        companyName: params.get('companyName') ?? '',
        graduationYear: params.get('graduationYear') ?? '',
        activityTypes: splitList(params.get('activityTypes')),
        conductedFrom: params.get('conductedFrom') ?? '',
        conductedTo: params.get('conductedTo') ?? '',
        regions: splitList(params.get('prefectures')),
        keyword: params.get('keyword') ?? '',
        matchMode: params.get('matchMode') === MATCH_MODES.EXACT ? MATCH_MODES.EXACT : 'partial',
    };
}

// Form values -> plain object of the conditions that are set (this is also the S-01 query).
export function paramsFromConditions(values) {
    const params = {};
    if (values.companyName.trim()) params.companyName = values.companyName.trim();
    if (values.graduationYear) params.graduationYear = values.graduationYear;
    if (values.activityTypes.length > 0) params.activityTypes = values.activityTypes.join(',');
    if (values.conductedFrom.trim()) params.conductedFrom = values.conductedFrom.trim();
    if (values.conductedTo.trim()) params.conductedTo = values.conductedTo.trim();
    if (values.regions.length > 0) params.prefectures = values.regions.join(',');
    if (values.keyword.trim()) {
        params.keyword = values.keyword.trim();
        // The match mode only matters with a keyword.
        if (values.matchMode === MATCH_MODES.EXACT) params.matchMode = MATCH_MODES.EXACT;
    }
    return params;
}

// Client check before searching. Returns { field: messageId }; empty when valid.
// (The API checks again.) Dates are optional, must be real, and the start must not be after the end.
export function validateConditions(values) {
    const errors = {};
    const from = values.conductedFrom.trim();
    const to = values.conductedTo.trim();
    if (from && !isRealDate(from)) errors.conductedFrom = 'E-207';
    if (to && !isRealDate(to)) errors.conductedTo = 'E-207';
    // Real dates in YYYY/MM/DD compare correctly as strings.
    if (from && to && !errors.conductedFrom && !errors.conductedTo && from > to) {
        errors.conductedFrom = 'E-208';
    }
    return errors;
}
