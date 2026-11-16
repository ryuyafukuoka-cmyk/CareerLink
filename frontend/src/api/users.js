// User APIs (F-001). A-01 and U-01 are in api/auth.js.
import { api } from './client.js';

// U-02 POST /api/users/me/graduation-year  body: { year } -> User
// Students only, and only while no year is set (409 CONFLICT afterwards).
export function registerGraduationYear(year) {
    return api.post('/users/me/graduation-year', { year });
}
