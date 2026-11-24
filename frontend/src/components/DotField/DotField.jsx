import { useEffect, useRef } from 'react';
import './DotField.css';

// Dot grid background. Dots near the mouse light up and a thin crosshair follows it.
// Put it as the first child of a `position: relative` container; it fills the container
// and ignores clicks. Decoration only (hidden from screen readers). Use on the login screen.
function DotField() {
    const ref = useRef(null);

    useEffect(() => {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const element = ref.current;
        if (reduce || !element) return undefined;

        let frame = 0;
        function onMove(event) {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => {
                const rect = element.getBoundingClientRect();
                element.style.setProperty('--x', `${event.clientX - rect.left}px`);
                element.style.setProperty('--y', `${event.clientY - rect.top}px`);
            });
        }

        window.addEventListener('pointermove', onMove);
        return () => {
            window.removeEventListener('pointermove', onMove);
            cancelAnimationFrame(frame);
        };
    }, []);

    return <div ref={ref} className="dot-field" aria-hidden="true" />;
}

export default DotField;
