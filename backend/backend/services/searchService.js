// Search services (F-005-01). S-01 and S-03. Any signed-in role may search; only completed
// records are searched, so drafts and selection info can never appear in a result.
const { parseSearchQuery } = require('../common/searchValidation');
const searchRepository = require('../repositories/searchRepository');

// S-01 searchActivityRecords: query = req.query (all values are strings).
async function searchActivityRecords(query) {
    const filter = parseSearchQuery(query);
    const { items, totalCount } = await searchRepository.search(filter);
    return { items, totalCount, page: filter.page, pageSize: filter.pageSize };
}

// S-03 listAvailableGraduationYears
async function listAvailableGraduationYears() {
    return searchRepository.listGraduationYears();
}

module.exports = { searchActivityRecords, listAvailableGraduationYears };
