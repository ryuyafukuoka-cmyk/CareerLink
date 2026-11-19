// User APIs (F-001). A-01 and U-01 are in api/auth.js.
import { api } from './client.js';

// U-02 POST /api/users/me/graduation-year  body: { year } -> User
// Students only, and only while no year is set (409 CONFLICT afterwards).
export function registerGraduationYear(year) {
    return api.post('/users/me/graduation-year', { year });
}

// U-03 GET /api/users -> User[] (instructors and admins only)
// filter: { role?, status?, graduationYear? }
export function listUsers(filter = {}) {
    return api.get('/users', { query: filter });
}

// U-04 GET /api/users/{userId} -> User (the person themself, instructors and admins)
export function getUser(userId) {
    return api.get(`/users/${userId}`);
}

// U-05 PATCH /api/users/{userId}/graduation-year  body: { year } -> User
// Instructors and admins. 404 when the target is not a student.
export function updateGraduationYear(userId, year) {
    return api.patch(`/users/${userId}/graduation-year`, { year });
}

// U-06 PATCH /api/users/{userId}/role  body: { role } -> User (admin only)
// 403 for your own account. 409 when the change would leave no admin.
export function changeUserRole(userId, role) {
    return api.patch(`/users/${userId}/role`, { role });
}

// U-07 PATCH /api/users/{userId}/status  body: { status } -> User
// Instructors and admins. Students only, never your own account. Records are kept.
export function setUserStatus(userId, status) {
    return api.patch(`/users/${userId}/status`, { status });
}
