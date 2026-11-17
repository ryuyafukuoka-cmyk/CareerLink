// Company karte services (F-005-03). K-01 to K-03. Completed records only. Poster names are
// shown only to the person themself, instructors and admins (canViewPosterName).
const { parseKarteQuery } = require('../common/searchValidation');
const { canViewPosterName } = require('../common/visibility');
const karteRepository = require('../repositories/karteRepository');
const companyService = require('./companyService');

// Resolves the company (404 when missing) and parses the filter.
async function prepare(companyIdParam, query) {
    const company = await companyService.getCompany(companyIdParam);
    return { company, companyId: Number(company.companyId), filter: parseKarteQuery(query) };
}

// K-01 getCompanyKarte: records grouped by graduation year (newest year first).
async function getCompanyKarte(actor, companyIdParam, query) {
    const { company, companyId, filter } = await prepare(companyIdParam, query);
    const records = await karteRepository.listRecords(companyId, filter);

    const years = [];
    for (const r of records) {
        let group = years[years.length - 1];
        if (!group || group.graduationYear !== r.graduationYear) {
            group = { graduationYear: r.graduationYear, records: [] };
            years.push(group);
        }
        group.records.push({
            recordId: r.recordId,
            conductedOn: r.conductedOn,
            activityTypes: r.activityTypes,
            posterName: canViewPosterName(actor, r.ownerUserId) ? r.ownerName : null,
        });
    }
    return { company, years };
}

// K-02 listCompanyInterviewInfo: questions and follow-ups, never the answers.
async function listCompanyInterviewInfo(companyIdParam, query) {
    const { companyId, filter } = await prepare(companyIdParam, query);
    return karteRepository.listInterviewInfo(companyId, filter);
}

// K-03 listCompanyExamInfo
async function listCompanyExamInfo(companyIdParam, query) {
    const { companyId, filter } = await prepare(companyIdParam, query);
    return karteRepository.listExamInfo(companyId, filter);
}

module.exports = { getCompanyKarte, listCompanyInterviewInfo, listCompanyExamInfo };
