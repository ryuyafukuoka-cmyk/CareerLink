import { useEffect, useId, useRef, useState } from 'react';
import { classNames } from '@/utils/classNames.js';
import { usePresence } from '@/hooks/usePresence.js';
import '@/styles/popover.css';
import './HoverCard.css';

// Extra info card shown when hovering or focusing the trigger.
// children: the trigger (use a link or button so keyboard users can focus it).
// content: the card body. Supplementary only: never put the only copy of important info or actions here.
function HoverCard({
    content,
    openDelay = 300,
    closeDelay = 150,
    align = 'start',
    children,
    className,
}) {
    const cardId = useId();
    const wrapperRef = useRef(null);
    const timerRef = useRef(null);
    const [open, setOpen] = useState(false);
    const { mounted, state } = usePresence(open);

    // Never leave a timer running after unmount.
    useEffect(() => () => clearTimeout(timerRef.current), []);

    function schedule(nextOpen, delay) {
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setOpen(nextOpen), delay);
    }

    return (
        <span
            ref={wrapperRef}
            className={classNames('hover-card', className)}
            onMouseEnter={() => schedule(true, openDelay)}
            onMouseLeave={() => schedule(false, closeDelay)}
            onFocus={() => schedule(true, 0)}
            onBlur={(event) => {
                if (!wrapperRef.current.contains(event.relatedTarget)) schedule(false, 0);
            }}
            onKeyDown={(event) => {
                if (event.key === 'Escape' && open) {
                    event.stopPropagation();
                    clearTimeout(timerRef.current);
                    setOpen(false);
                }
            }}
        >
            <span className="hover-card__trigger" aria-describedby={open ? cardId : undefined}>
                {children}
            </span>
            {mounted && (
                <div
                    id={cardId}
                    data-state={state}
                    role="tooltip"
                    className={classNames(
                        'popover',
                        'hover-card__card',
                        `hover-card__card--${align}`,
                    )}
                >
                    {content}
                </div>
            )}
        </span>
    );
}

export default HoverCard;
