import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ROLES } from '@shared/definitions';
import { login as loginRequest, getMe } from '@/api/auth.js';
import { configureApiClient } from '@/api/client.js';
import { AuthContext } from './AuthContext.js';
import {
    USE_MOCK_AUTH,
    clearStoredMockUserKey,
    getStoredMockUserKey,
    setStoredMockUserKey,
} from './mockAuth.js';

// Holds the current user for the whole app.
//
// Now: mock login only (VITE_USE_MOCK_AUTH=true). The mock user key is sent as X-Mock-User.
// Week 6 (12/14): real Cognito login (startLogin / handleAuthCallback / loadLoginUser / logout)
// replaces the mock branches. The context value stays the same.
export function AuthProvider({ children }) {
    // Mock login survives a reload through sessionStorage.
    const [initialMockKey] = useState(() => (USE_MOCK_AUTH ? getStoredMockUserKey() : null));
    const mockKeyRef = useRef(initialMockKey);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(Boolean(initialMockKey));

    // Forget the user. Also used for 401: RequireLogin then sends the person to the login screen.
    const clearState = useCallback(() => {
        mockKeyRef.current = null;
        clearStoredMockUserKey();
        setUser(null);
    }, []);

    // Tell the API client how to authenticate and what to do on 401.
    useEffect(() => {
        configureApiClient({
            getAuthHeaders: () =>
                USE_MOCK_AUTH && mockKeyRef.current ? { 'X-Mock-User': mockKeyRef.current } : {},
            onUnauthorized: clearState,
        });
    }, [clearState]);

    // Restore the user after a reload.
    useEffect(() => {
        if (!initialMockKey) return undefined;
        let cancelled = false;
        getMe()
            .then((me) => {
                if (!cancelled) setUser(me);
            })
            .catch(() => {
                if (!cancelled) clearState();
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [initialMockKey, clearState]);

    // Mock login. Throws ApiError when refused (e.g. reason NOT_ELIGIBLE / ACCOUNT_INACTIVE).
    const login = useCallback(
        async (mockUserKey) => {
            if (!USE_MOCK_AUTH) {
                throw new Error('Real login is added in Week 6 (startLogin).');
            }
            mockKeyRef.current = mockUserKey;
            setStoredMockUserKey(mockUserKey);
            try {
                const result = await loginRequest();
                setUser(result.user);
                return result;
            } catch (error) {
                clearState();
                throw error;
            }
        },
        [clearState],
    );

    // Real logout will also call the Cognito logout endpoint (Week 6). Local state is always cleared.
    const logout = useCallback(() => {
        clearState();
    }, [clearState]);

    const value = useMemo(
        () => ({
            user,
            role: user?.role ?? null,
            loading,
            // First-login student who has not set a graduation year yet (SC-00-03).
            needsGraduationYear: user?.role === ROLES.STUDENT && user.graduationYear === null,
            login,
            logout,
            updateUser: setUser,
        }),
        [user, loading, login, logout],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
