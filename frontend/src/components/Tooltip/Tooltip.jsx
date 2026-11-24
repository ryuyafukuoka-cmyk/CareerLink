import { useEffect, useId, useRef, useState } from 'react';
import { usePresence } from '@/hooks/usePresence.js';
import { classNames } from '@/utils/classNames.js';
import './Tooltip.css';

// Short hint shown when hovering or focusing the trigger.
// content: one short sentence (for example "企業・応募回は変更できません").
// children: the trigger. Disabled inputs and buttons do not take focus, so set `focusable`
//   to make the wrapper itself reachable by keyboard.
// For longer or richer info use HoverCard instead.
function Tooltip({
    content,
    placement = 'top',
    delay = 250,
    focusable = false,
    children,
    className,
}) {
    const tipId = useId();
    const timerRef = useRef(null);
    const [open, setOpen] = useState(false);
    const { mounted, state } = usePresence(open, 140);

    // Never leave a timer running after unmount.
    useEffect(() => () => clearTimeout(timerRef.current), []);

    function schedule(nextOpen, wait) {
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setOpen(nextOpen), wait);
    }

    if (!content) return children;

    return (
        <span
            className={classNames('tooltip', className)}
            tabIndex={focusable ? 0 : undefined}
            aria-describedby={open ? tipId : undefined}
            onMouseEnter={() => schedule(true, delay)}
            onMouseLeave={() => schedule(false, 0)}
            onFocus={() => schedule(true, 0)}
            onBlur={() => schedule(false, 0)}
            onKeyDown={(event) => {
                if (event.key === 'Escape' && open) {
                    event.stopPropagation();
                    clearTimeout(timerRef.current);
                    setOpen(false);
                }
            }}
        >
            {children}
            {mounted && (
                <span
                    id={tipId}
                    data-state={state}
                    role="tooltip"
                    className={classNames('tooltip__bubble', `tooltip__bubble--${placement}`)}
                >
                    {content}
                </span>
            )}
        </span>
    );
}

export default Tooltip;
