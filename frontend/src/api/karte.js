// Company karte APIs (F-005-03): K-01 to K-03. Completed records only.
import { api } from './client.js';

// K-01 GET /api/companies/{companyId}/karte -> { company, years: [{ graduationYear, records: [...] }] }
// years are newest first. record: { recordId, conductedOn, activityTypes, posterName: string | null }
// filter: { graduationYear?, activityType? } (one activity type)
export function getCompanyKarte(companyId, { graduationYear, activityType } = {}) {
    return api.get(`/companies/${companyId}/karte`, { query: { graduationYear, activityType } });
}

// K-02 GET /api/companies/{companyId}/interview-info
// -> [{ recordId, graduationYear, conductedOn, category, content, followUps: string[] }] (no answers)
export function listCompanyInterviewInfo(companyId, { graduationYear, activityType } = {}) {
    return api.get(`/companies/${companyId}/interview-info`, {
        query: { graduationYear, activityType },
    });
}

// K-03 GET /api/companies/{companyId}/exam-info
// -> [{ recordId, graduationYear, conductedOn, nameFormat, content, preparation: string | null }]
export function listCompanyExamInfo(companyId, { graduationYear, activityType } = {}) {
    return api.get(`/companies/${companyId}/exam-info`, {
        query: { graduationYear, activityType },
    });
}
