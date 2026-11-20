import { useEffect, useRef } from 'react';

// Call handler when a pointer press lands outside the element held by ref.
// enabled: attach the listener only while a popup is open.
export function useClickOutside(ref, handler, enabled = true) {
    // Keep the latest handler without re-attaching the listener.
    const handlerRef = useRef(handler);
    useEffect(() => {
        handlerRef.current = handler;
    });

    useEffect(() => {
        if (!enabled) return undefined;
        function handlePointerDown(event) {
            if (ref.current && !ref.current.contains(event.target)) handlerRef.current(event);
        }
        document.addEventListener('pointerdown', handlePointerDown);
        return () => document.removeEventListener('pointerdown', handlePointerDown);
    }, [ref, enabled]);
}
