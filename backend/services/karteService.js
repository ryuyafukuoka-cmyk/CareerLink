// 企業別カルテ（F-005-03、K-01〜K-03）は完了済みの活動記録のみを扱う。
// 投稿者名は本人・指導員・管理者だけに表示する（canViewPosterName）。
const { parseKarteQuery } = require('../common/searchValidation');
const { canViewPosterName } = require('../common/visibility');
const karteRepository = require('../repositories/karteRepository');
const companyService = require('./companyService');

// 企業の存在を確認し（なければ404）、絞り込み条件を解析する。
async function prepare(companyIdParam, query) {
    const company = await companyService.getCompany(companyIdParam);
    return { company, companyId: Number(company.companyId), filter: parseKarteQuery(query) };
}

// K-01 getCompanyKarte。企業の活動記録を卒業年度ごとにまとめ、新しい年度から返す。
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

// K-02 listCompanyInterviewInfo。質問と深掘り質問を返す。回答は含めない。
async function listCompanyInterviewInfo(companyIdParam, query) {
    const { companyId, filter } = await prepare(companyIdParam, query);
    return karteRepository.listInterviewInfo(companyId, filter);
}

// K-03。企業の試験情報を一覧で取得する。
async function listCompanyExamInfo(companyIdParam, query) {
    const { companyId, filter } = await prepare(companyIdParam, query);
    return karteRepository.listExamInfo(companyId, filter);
}

module.exports = { getCompanyKarte, listCompanyInterviewInfo, listCompanyExamInfo };
