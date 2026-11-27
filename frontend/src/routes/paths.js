// Route patterns. Build real URLs with generatePath from react-router, for example:
// generatePath(PATHS.recordDetail, { recordId: 12 })
export const PATHS = Object.freeze({
    // SC-00
    login: '/login',
    accessDenied: '/access-denied',
    firstRegistration: '/first-registration',
    // SC-01
    home: '/',
    // SC-02
    records: '/records',
    recordNew: '/records/new',
    recordDetail: '/records/:recordId',
    recordEdit: '/records/:recordId/edit',
    rounds: '/rounds',
    roundNew: '/rounds/new',
    roundDetail: '/rounds/:roundId',
    // SC-03
    search: '/search',
    searchResults: '/search/results',
    searchRecordDetail: '/search/records/:recordId',
    // SC-04
    companies: '/companies',
    companyDetail: '/companies/:companyId',
    // SC-06
    adminUsers: '/admin/users',
    adminUserDetail: '/admin/users/:userId',
    adminUserGraduationYear: '/admin/users/:userId/graduation-year',
    adminUserRole: '/admin/users/:userId/role',
    adminOperations: '/admin/operations',
    adminLogs: '/admin/logs',
    adminDraftCleanup: '/admin/draft-cleanup',
});
