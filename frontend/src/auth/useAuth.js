import { useContext } from 'react';
import { AuthContext } from './AuthContext.js';

/**
 * Current auth state.
 * @returns {{
 *   user: object | null,
 *   role: 'student' | 'instructor' | 'admin' | null,
 *   loading: boolean,
 *   needsGraduationYear: boolean,
 *   login: (mockUserKey: string) => Promise<{ user: object, isFirstLogin: boolean }>,
 *   logout: () => void,
 *   updateUser: (user: object) => void,
 * }}
 */
export function useAuth() {
    const value = useContext(AuthContext);
    if (!value) throw new Error('useAuth must be used inside <AuthProvider>.');
    return value;
}
