// Application rounds. Shape follows `ApplicationRound`.
// All 5 stages appear. Student 1 has two rounds for company 1 (re-application).
// applicationDate may be null only when the stage is `considering`.
export const rounds = [
    // Student 1 (山田)
    {
        applicationRoundId: '1',
        studentUserId: '1',
        companyId: '1',
        applicationDate: '2026/06/10',
        stage: 'rejected',
        statusNote: '一次面接後に不採用の連絡。',
    },
    {
        applicationRoundId: '2',
        studentUserId: '1',
        companyId: '1',
        applicationDate: '2026/09/20',
        stage: 'inProgress',
        statusNote: '再応募。二次面接の結果待ち。',
    },
    {
        applicationRoundId: '3',
        studentUserId: '1',
        companyId: '3',
        applicationDate: null,
        stage: 'considering',
        statusNote: '',
    },
    {
        applicationRoundId: '4',
        studentUserId: '1',
        companyId: '5',
        applicationDate: '2026/08/05',
        stage: 'offered',
        statusNote: '最終面接を経て内定。回答期限は月末。',
    },
    // Student 2 (佐藤)
    {
        applicationRoundId: '5',
        studentUserId: '2',
        companyId: '2',
        applicationDate: '2026/07/15',
        stage: 'declined',
        statusNote: '他社内定のため辞退。',
    },
    {
        applicationRoundId: '6',
        studentUserId: '2',
        companyId: '4',
        applicationDate: null,
        stage: 'considering',
        statusNote: '説明会に参加。応募を検討中。',
    },
    {
        applicationRoundId: '7',
        studentUserId: '2',
        companyId: '10',
        applicationDate: '2026/10/01',
        stage: 'inProgress',
        statusNote: '',
    },
    // Student 3 (鈴木)
    {
        applicationRoundId: '8',
        studentUserId: '3',
        companyId: '8',
        applicationDate: null,
        stage: 'considering',
        statusNote: '',
    },
    // Student 4 (高橋, graduated / inactive)
    {
        applicationRoundId: '9',
        studentUserId: '4',
        companyId: '1',
        applicationDate: '2025/07/01',
        stage: 'offered',
        statusNote: '内定を承諾。',
    },
    {
        applicationRoundId: '10',
        studentUserId: '4',
        companyId: '6',
        applicationDate: '2025/06/20',
        stage: 'rejected',
        statusNote: '',
    },
];
