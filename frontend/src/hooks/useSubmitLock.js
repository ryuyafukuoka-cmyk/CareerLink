import { useCallback, useRef, useState } from 'react';

/**
 * Blocks double sends. While a task is running, run() ignores further calls.
 * `submitting` is for the UI (pass it to Button `loading`); the ref blocks even two clicks in the same frame.
 *
 *   const { submitting, run } = useSubmitLock();
 *   run(async () => { await createSomething(); });
 */
export function useSubmitLock() {
    const busyRef = useRef(false);
    const [submitting, setSubmitting] = useState(false);

    const run = useCallback(async (task) => {
        if (busyRef.current) return undefined;
        busyRef.current = true;
        setSubmitting(true);
        try {
            return await task();
        } finally {
            busyRef.current = false;
            setSubmitting(false);
        }
    }, []);

    return { submitting, run };
}
