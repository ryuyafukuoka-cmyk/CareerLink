import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { useLinkMenu } from '@/components/LinkMenu/useLinkMenu.jsx';
import { usePresence } from '@/hooks/usePresence.js';
import { classNames } from '@/utils/classNames.js';
import '@/styles/textLink.css';
import './ExternalLink.css';

const isHttpUrl = (value) => /^https?:\/\/\S+$/i.test(value ?? '');

const HOVER_DELAY_MS = 250;
const SCROLL_PX_PER_SECOND = 100; // how fast a long URL slides
const SCROLL_START_DELAY_MS = 100; // wait before the first slide
const SCROLL_HOLD_MS = 500; // pause at each end
const FADE_PX = 16; // width of the soft edge on both sides while sliding

// Link to another site.
//   Left click        opens the site in a new tab (normal link behavior).
//   Hover / focus     a hint shows the real URL. A URL too long for the hint slides sideways
//                     with soft faded edges.
//   Right click       the browser menu is replaced by ours (see useLinkMenu).
// Ctrl / Cmd / Shift / middle click keep working because the element is still a real <a href>.
// href: http(s) URL. Anything else is shown as plain text (never as a link).
// children: link text (defaults to the URL).
function ExternalLink({ href, children, className }) {
    const tipId = useId();
    const linkRef = useRef(null);
    const viewRef = useRef(null);
    const textRef = useRef(null);
    const hoverTimerRef = useRef(null);

    const [tipOpen, setTipOpen] = useState(false);
    const tip = usePresence(tipOpen, 140);

    function hideTip() {
        clearTimeout(hoverTimerRef.current);
        setTipOpen(false);
    }

    const { onContextMenu, menu } = useLinkMenu({ url: href, linkRef, onOpen: hideTip });

    // Never leave a timer running after unmount.
    useEffect(() => () => clearTimeout(hoverTimerRef.current), []);

    // Hint: if the URL is wider than the hint, slide it back and forth.
    // Written straight to the DOM (no state) so it never causes another render.
    useLayoutEffect(() => {
        const view = viewRef.current;
        const text = textRef.current;
        if (!view || !text) return undefined;
        const overflow = Math.ceil(text.offsetWidth - view.clientWidth);
        if (overflow <= 1) {
            delete view.dataset.scroll;
            return undefined;
        }
        view.dataset.scroll = 'true'; // adds the faded edges and the side padding
        const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        if (reduced || !text.animate) return undefined;

        const shift = overflow + FADE_PX * 2; // the side padding is added once the edges fade
        const travel = (shift / SCROLL_PX_PER_SECOND) * 1000;
        const total = travel * 2 + SCROLL_HOLD_MS * 2;
        // start -> end -> pause -> back -> pause, then it loops.
        const animation = text.animate(
            [
                { transform: 'translateX(0)', offset: 0 },
                { transform: `translateX(-${shift}px)`, offset: travel / total },
                { transform: `translateX(-${shift}px)`, offset: (travel + SCROLL_HOLD_MS) / total },
                { transform: 'translateX(0)', offset: (travel * 2 + SCROLL_HOLD_MS) / total },
                { transform: 'translateX(0)', offset: 1 },
            ],
            { duration: total, iterations: Infinity, delay: SCROLL_START_DELAY_MS },
        );
        return () => animation.cancel();
    }, [tip.mounted, href]);

    if (!isHttpUrl(href)) return <span>{children ?? href}</span>;

    function showTip(wait) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = setTimeout(() => setTipOpen(true), wait);
    }

    return (
        <span className="external-link">
            <a
                ref={linkRef}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={classNames('text-link', className)}
                aria-describedby={tip.mounted ? tipId : undefined}
                onMouseEnter={() => showTip(HOVER_DELAY_MS)}
                onMouseLeave={hideTip}
                onFocus={() => showTip(0)}
                onBlur={hideTip}
                onClick={hideTip}
                onContextMenu={onContextMenu}
                onKeyDown={(event) => {
                    if (event.key === 'Escape' && tipOpen) {
                        event.stopPropagation();
                        hideTip();
                    }
                }}
            >
                {children ?? href}
            </a>

            {tip.mounted && (
                <span
                    id={tipId}
                    role="tooltip"
                    data-state={tip.state}
                    className="external-link__tip"
                >
                    <span ref={viewRef} className="external-link__tip-view">
                        <span ref={textRef} className="external-link__tip-text">
                            {href}
                        </span>
                    </span>
                </span>
            )}

            {menu}
        </span>
    );
}

export default ExternalLink;
