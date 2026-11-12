// Roles and account status (API values -> display labels).

export const ROLES = Object.freeze({
    STUDENT: 'student',
    INSTRUCTOR: 'instructor',
    ADMIN: 'admin',
});

export const ROLE_LABELS = Object.freeze({
    student: '学生',
    instructor: '指導員',
    admin: '管理者',
});

export const USER_STATUSES = Object.freeze({
    ACTIVE: 'active',
    INACTIVE: 'inactive',
});

export const USER_STATUS_LABELS = Object.freeze({
    active: '有効',
    inactive: '無効',
});
