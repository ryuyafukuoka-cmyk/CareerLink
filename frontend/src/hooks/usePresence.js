import { useEffect, useState } from 'react';

const prefersReducedMotion = () =>
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Keeps a popup in the page while its closing animation plays.
// const { mounted, state } = usePresence(open, 180);
// Render the popup when `mounted` is true and put `data-state={state}` ('open' | 'closed') on it.
// exitMs must be at least as long as the closing animation in popover.css.
// With reduced motion the popup unmounts at once.
export function usePresence(open, exitMs = 180) {
    const [prevOpen, setPrevOpen] = useState(open);
    const [exiting, setExiting] = useState(false);

    // Compare during render (not in an effect), so the popup never disappears for one frame.
    if (open !== prevOpen) {
        setPrevOpen(open);
        setExiting(!open && !prefersReducedMotion());
    }

    useEffect(() => {
        if (!exiting) return undefined;
        const timer = setTimeout(() => setExiting(false), exitMs);
        return () => clearTimeout(timer);
    }, [exiting, exitMs]);

    return { mounted: open || exiting, state: open ? 'open' : 'closed' };
}
