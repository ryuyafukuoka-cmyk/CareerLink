import { useEffect, useState } from 'react';
import { getUser } from '@/api/users.js';

// Loads the user a SC-06-02 / 05 / 06 screen is about (U-04).
// Returns { user, error, loading, reload, setUser }. setUser stores the saved user returned by an update.
export function useTargetUser(userId) {
    const [reloadCount, setReloadCount] = useState(0);
    const [result, setResult] = useState({ key: null, user: null, error: null });
    const requestKey = `${userId}|${reloadCount}`;

    useEffect(() => {
        let cancelled = false;
        getUser(userId)
            .then((user) => !cancelled && setResult({ key: requestKey, user, error: null }))
            .catch((error) => !cancelled && setResult({ key: requestKey, user: null, error }));
        return () => {
            cancelled = true;
        };
    }, [userId, requestKey]);

    const loading = result.key !== requestKey;
    return {
        user: loading ? null : result.user,
        error: loading ? null : result.error,
        loading,
        reload: () => setReloadCount((n) => n + 1),
        setUser: (user) => setResult((current) => ({ ...current, user })),
    };
}
