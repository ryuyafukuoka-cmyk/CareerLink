// Record search APIs (F-005-01): S-01 and S-03. Record detail (S-02) is in records.js.
import { api } from './client.js';

// S-01 GET /api/activity-records -> { items: RecordSearchItem[], totalCount, page, pageSize }
// params: companyName?, graduationYear?, activityTypes? (string[]), conductedFrom?, conductedTo?
//         (YYYY/MM/DD), keyword?, matchMode? ('partial' | 'exact'), prefectures? (region IDs), page?
// Completed records only, newest first, 10 per page. Empty values are left out of the request.
export function searchActivityRecords(params = {}) {
    return api.get('/activity-records', { query: params });
}

// S-03 GET /api/graduation-years -> number[] (years that have completed records, newest first)
export function listGraduationYears() {
    return api.get('/graduation-years');
}
