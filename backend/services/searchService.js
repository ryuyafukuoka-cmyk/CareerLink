// 活動記録検索（F-005-01、S-01・S-03）はログイン済みの全権限で利用できる。
// 対象は完了済み記録のみ。下書きや選考情報は検索結果に含めない。
const { parseSearchQuery } = require('../common/searchValidation');
const searchRepository = require('../repositories/searchRepository');

// S-01 searchActivityRecords。req.query の検索条件を受け取る（各値は文字列）。
async function searchActivityRecords(query) {
    const filter = parseSearchQuery(query);
    const { items, totalCount } = await searchRepository.search(filter);
    return { items, totalCount, page: filter.page, pageSize: filter.pageSize };
}

// S-03。完了済み記録がある卒業年度を取得する。
async function listAvailableGraduationYears() {
    return searchRepository.listGraduationYears();
}

module.exports = { searchActivityRecords, listAvailableGraduationYears };
