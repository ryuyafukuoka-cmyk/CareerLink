import { useCallback, useEffect, useState } from 'react';

/**
 * Countdown for 429 RATE_LIMITED. start(error.retryAfter) begins counting down;
 * secondsLeft is 0 when sending is allowed again. Show it with getMessage('E-009', { seconds }).
 */
export function useRetryAfter() {
    const [secondsLeft, setSecondsLeft] = useState(0);

    useEffect(() => {
        if (secondsLeft <= 0) return undefined;
        const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
        return () => clearTimeout(timer);
    }, [secondsLeft]);

    const start = useCallback((seconds) => setSecondsLeft(Math.max(0, Math.ceil(seconds))), []);
    const clear = useCallback(() => setSecondsLeft(0), []);

    return { secondsLeft, start, clear };
}
