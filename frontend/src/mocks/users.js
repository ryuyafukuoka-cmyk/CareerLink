// Throwaway mock data (deleted on 12/20). Shapes follow the API spec type `User`.
export const users = [
    // Students
    {
        userId: '1',
        displayName: '山田 太郎',
        role: 'student',
        graduationYear: 2027,
        status: 'active',
    },
    {
        userId: '2',
        displayName: '佐藤 花子',
        role: 'student',
        graduationYear: 2027,
        status: 'active',
    },
    {
        userId: '3',
        displayName: '鈴木 一郎',
        role: 'student',
        graduationYear: 2028,
        status: 'active',
    },
    // Graduated student: inactive, but past records are kept
    {
        userId: '4',
        displayName: '高橋 健',
        role: 'student',
        graduationYear: 2026,
        status: 'inactive',
    },
    // Instructors
    {
        userId: '5',
        displayName: '宮本 指導員',
        role: 'instructor',
        graduationYear: null,
        status: 'active',
    },
    {
        userId: '6',
        displayName: '中村 指導員',
        role: 'instructor',
        graduationYear: null,
        status: 'active',
    },
    // Admin
    {
        userId: '7',
        displayName: '管理者 太郎',
        role: 'admin',
        graduationYear: null,
        status: 'active',
    },
];
