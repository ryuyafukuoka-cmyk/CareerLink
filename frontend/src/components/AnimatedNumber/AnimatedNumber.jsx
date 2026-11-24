import { useEffect, useRef, useState } from 'react';

// Whole number that counts up (or down) to its value when the value changes.
// Use for counts: delete impact, search totalCount, summaries. Integers only.
// With "reduce motion" it jumps straight to the value. Screen readers read the final value.
function AnimatedNumber({ value, duration = 600, locale = 'ja-JP', className }) {
    const [display, setDisplay] = useState(value);
    const fromRef = useRef(value);

    useEffect(() => {
        const from = fromRef.current;
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const total = reduce ? 0 : duration;
        const startedAt = performance.now();
        let frame;

        function tick(now) {
            const progress = total === 0 ? 1 : Math.min((now - startedAt) / total, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const next = Math.round(from + (value - from) * eased);
            fromRef.current = next;
            setDisplay(next);
            if (progress < 1) frame = requestAnimationFrame(tick);
        }

        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [value, duration]);

    return (
        <span className={className} style={{ fontVariantNumeric: 'tabular-nums' }}>
            <span aria-hidden="true">{display.toLocaleString(locale)}</span>
            <span className="visually-hidden">{value.toLocaleString(locale)}</span>
        </span>
    );
}

export default AnimatedNumber;
