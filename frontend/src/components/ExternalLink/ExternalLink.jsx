import { useCallback, useRef, useState } from 'react';
import { Check, Copy, ExternalLink as OpenIcon } from 'lucide-react';
import { useClickOutside } from '@/hooks/useClickOutside.js';
import { usePresence } from '@/hooks/usePresence.js';
import { classNames } from '@/utils/classNames.js';
import '@/styles/popover.css';
import '@/styles/textLink.css';
import './ExternalLink.css';

const isHttpUrl = (value) => /^https?:\/\/\S+$/i.test(value ?? '');

// Link to another site. A plain left click does not leave the app: it shows the real URL
// with "新しいタブで開く" and "リンクをコピー". Ctrl / Cmd / Shift / middle click and the
// right-click menu keep working because the element is still a real <a href>.
// href: http(s) URL. Anything else is shown as plain text (never as a link).
// children: link text (defaults to the URL).
function ExternalLink({ href, children, className }) {
    const wrapperRef = useRef(null);
    const linkRef = useRef(null);
    const [open, setOpen] = useState(false);
    const [copyState, setCopyState] = useState('idle'); // idle | done | failed
    const { mounted, state } = usePresence(open);

    useClickOutside(wrapperRef, () => setOpen(false), open);

    // Ref callback: when the panel mounts, focus its first action.
    // Stable identity, so it does not steal focus again on later re-renders.
    const focusFirst = useCallback((node) => node?.querySelector('button')?.focus(), []);

    if (!isHttpUrl(href)) return <span>{children ?? href}</span>;

    function close(returnFocus) {
        setOpen(false);
        if (returnFocus) linkRef.current?.focus();
    }

    function handleLinkClick(event) {
        // Let the browser handle modified clicks (new tab, new window, download).
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0)
            return;
        event.preventDefault();
        setCopyState('idle');
        setOpen((current) => !current);
    }

    function openInNewTab() {
        window.open(href, '_blank', 'noopener,noreferrer');
        close(true);
    }

    async function copyLink() {
        try {
            await navigator.clipboard.writeText(href);
            setCopyState('done');
        } catch {
            setCopyState('failed');
        }
    }

    return (
        <span
            ref={wrapperRef}
            className="external-link"
            onKeyDown={(event) => {
                if (event.key === 'Escape' && open) {
                    event.stopPropagation();
                    close(true);
                }
            }}
            onBlur={(event) => {
                if (open && !wrapperRef.current.contains(event.relatedTarget)) setOpen(false);
            }}
        >
            <a
                ref={linkRef}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={classNames('text-link', className)}
                aria-haspopup="dialog"
                aria-expanded={open}
                onClick={handleLinkClick}
            >
                {children ?? href}
            </a>
            {mounted && (
                <div
                    ref={focusFirst}
                    role="dialog"
                    aria-label="リンクの操作"
                    data-state={state}
                    className="popover external-link__panel"
                >
                    <p className="popover__item external-link__url" style={{ '--i': 0 }}>
                        {href}
                    </p>
                    <button
                        type="button"
                        className="popover__item external-link__action"
                        style={{ '--i': 1 }}
                        onClick={openInNewTab}
                    >
                        <OpenIcon size={16} aria-hidden="true" />
                        <span>新しいタブで開く</span>
                    </button>
                    <button
                        type="button"
                        className="popover__item external-link__action"
                        style={{ '--i': 2 }}
                        onClick={copyLink}
                    >
                        {copyState === 'done' ? (
                            <Check size={16} aria-hidden="true" />
                        ) : (
                            <Copy size={16} aria-hidden="true" />
                        )}
                        <span>
                            {copyState === 'done' && 'コピーしました'}
                            {copyState === 'failed' && 'コピーできませんでした'}
                            {copyState === 'idle' && 'リンクをコピー'}
                        </span>
                    </button>
                    <span className="external-link__live" role="status" aria-live="polite">
                        {copyState === 'done' && 'リンクをコピーしました'}
                    </span>
                </div>
            )}
        </span>
    );
}

export default ExternalLink;
