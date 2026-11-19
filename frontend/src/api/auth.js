// Auth and current-user APIs (A-01, U-01).
import { api } from './client.js';

// A-01 POST /api/auth/login -> { user, isFirstLogin }
export function login() {
    return api.post('/auth/login');
}

// U-01 GET /api/users/me -> User
export function getMe() {
    return api.get('/users/me');
}
