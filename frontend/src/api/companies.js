// Company APIs (F-006). Other company endpoints (C-02 to C-07) are added with their screens.
import { api } from './client.js';

// C-01 GET /api/companies -> { items: Company[], totalCount, page, pageSize }
// regions: region IDs (prefectures 1-47 and areas 48-55), OR inside, AND with keyword.
export function listCompanies({ keyword, regions, page = 1 } = {}) {
    return api.get('/companies', { query: { keyword, prefectures: regions, page } });
}

// C-03 GET /api/companies/{companyId} -> Company
export function getCompany(companyId) {
    return api.get(`/companies/${companyId}`);
}

// C-02 POST /api/companies -> Company (201)
// input: { nameOfficial, nameKatakana, prefectures, websiteUrl, noWebsite }
export function createCompany(input) {
    return api.post('/companies', input);
}

// C-04 PUT /api/companies/{companyId} -> Company
export function updateCompany(companyId, input) {
    return api.put(`/companies/${companyId}`, input);
}

// C-05 GET /api/companies/{companyId}/deletion-impact (admin only)
// -> { activityRecordCount, applicationRoundCount, deletionVersion }
export function getDeletionImpact(companyId) {
    return api.get(`/companies/${companyId}/deletion-impact`);
}

// C-06 DELETE /api/companies/{companyId} (admin only). 409 when something changed after C-05.
export function deleteCompany(companyId, { confirmName, expectedDeletionVersion }) {
    return api.delete(`/companies/${companyId}`, { confirmName, expectedDeletionVersion });
}

// C-07 GET /api/company-options?keyword= -> [{ companyId, nameOfficial }] (for selects)
export function listCompanyOptions(keyword) {
    return api.get('/company-options', { query: { keyword } });
}
