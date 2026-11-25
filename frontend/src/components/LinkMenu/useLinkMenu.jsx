import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Copy, ExternalLink as OpenIcon } from 'lucide-react';
import { usePresence } from '@/hooks/usePresence.js';
import '@/styles/popover.css';
import './LinkMenu.css';

const EDGE_GAP = 8; // keep the menu this far from the window edge
const CLOSE_AFTER_COPY_MS = 800;

// Our own right-click menu for links (used by ExternalLink and TextLink).
// It replaces the browser menu with: the real URL, 新しいタブで開く, リンクをコピー.
//
//   const { onContextMenu, menu } = useLinkMenu({ url, linkRef, onOpen });
//   <a ref={linkRef} href={url} onContextMenu={onContextMenu}>…</a>
//   {menu}
//
// url: absolute URL shown, opened and copied.
// linkRef: the <a>; focus returns to it when the menu closes, and the menu opens beside it
//   when it is started from the keyboard (menu key / Shift+F10).
// onOpen: called just before the menu opens (for example to hide a hover hint).
export function useLinkMenu({ url, linkRef, onOpen }) {
    const urlId = useId();
    const menuRef = useRef(null);
    const copyTimerRef = useRef(null);

    const [point, setPoint] = useState(null); // null | { x, y } (window coordinates)
    const [copyState, setCopyState] = useState('idle'); // idle | done | failed

    const open = point !== null;
    const { mounted, state } = usePresence(open);

    // Keep the last position while the closing animation plays.
    const [lastPoint, setLastPoint] = useState({ x: 0, y: 0 });
    if (point && (point.x !== lastPoint.x || point.y !== lastPoint.y)) setLastPoint(point);

    // Never leave a timer running after unmount.
    useEffect(() => () => clearTimeout(copyTimerRef.current), []);

    // Keep the menu inside the window, and focus the first action when it opens.
    useLayoutEffect(() => {
        const node = menuRef.current;
        if (!node || !point) return;
        const rect = node.getBoundingClientRect();
        const maxLeft = window.innerWidth - rect.width - EDGE_GAP;
        const maxTop = window.innerHeight - rect.height - EDGE_GAP;
        node.style.left = `${Math.max(EDGE_GAP, Math.min(point.x, maxLeft))}px`;
        node.style.top = `${Math.max(EDGE_GAP, Math.min(point.y, maxTop))}px`;
        node.querySelector('[role="menuitem"]')?.focus({ preventScroll: true });
    }, [point]);

    // Close on outside press, Escape, scroll, resize, or when the window loses focus.
    useEffect(() => {
        if (!open) return undefined;
        function dismiss() {
            setPoint(null);
        }
        function handlePointerDown(event) {
            if (!menuRef.current?.contains(event.target)) dismiss();
        }
        function handleKeyDown(event) {
            if (event.key !== 'Escape') return;
            // Close the menu only; do not also close a dialog behind it.
            event.preventDefault();
            event.stopPropagation();
            dismiss();
            linkRef.current?.focus();
        }
        document.addEventListener('pointerdown', handlePointerDown);
        window.addEventListener('keydown', handleKeyDown, true);
        window.addEventListener('scroll', dismiss, true);
        window.addEventListener('resize', dismiss);
        window.addEventListener('blur', dismiss);
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            window.removeEventListener('keydown', handleKeyDown, true);
            window.removeEventListener('scroll', dismiss, true);
            window.removeEventListener('resize', dismiss);
            window.removeEventListener('blur', dismiss);
        };
    }, [open, linkRef]);

    function onContextMenu(event) {
        event.preventDefault(); // replace the browser menu
        onOpen?.();
        clearTimeout(copyTimerRef.current);
        setCopyState('idle');
        let { clientX: x, clientY: y } = event;
        // Opened from the keyboard: there is no pointer position.
        if (x === 0 && y === 0 && linkRef.current) {
            const rect = linkRef.current.getBoundingClientRect();
            x = rect.left;
            y = rect.bottom;
        }
        setPoint({ x, y });
    }

    function close(returnFocus) {
        setPoint(null);
        if (returnFocus) linkRef.current?.focus();
    }

    function openInNewTab() {
        window.open(url, '_blank', 'noopener,noreferrer');
        close(true);
    }

    async function copyLink() {
        clearTimeout(copyTimerRef.current);
        try {
            await navigator.clipboard.writeText(url);
            setCopyState('done');
            copyTimerRef.current = setTimeout(() => close(true), CLOSE_AFTER_COPY_MS);
        } catch {
            setCopyState('failed');
        }
    }

    function handleKeyDown(event) {
        const items = [...menuRef.current.querySelectorAll('[role="menuitem"]')];
        const current = items.indexOf(document.activeElement);
        const move = (index) => {
            event.preventDefault();
            items[(index + items.length) % items.length]?.focus();
        };
        if (event.key === 'ArrowDown') move(current + 1);
        else if (event.key === 'ArrowUp') move(current - 1);
        else if (event.key === 'Home') move(0);
        else if (event.key === 'End') move(items.length - 1);
        else if (event.key === 'Tab') close(false);
    }

    const menu =
        mounted &&
        createPortal(
            <div
                ref={menuRef}
                data-state={state}
                aria-describedby={urlId}
                className="popover link-menu"
                style={{ left: lastPoint.x, top: lastPoint.y }}
                onKeyDown={handleKeyDown}
                onContextMenu={(event) => event.preventDefault()}
            >
                <p id={urlId} className="popover__item link-menu__url" style={{ '--i': 0 }}>
                    {url}
                </p>
                <ul role="menu" aria-label="リンクの操作" className="link-menu__list">
                    <li role="none" className="popover__item" style={{ '--i': 1 }}>
                        <button
                            type="button"
                            role="menuitem"
                            tabIndex={-1}
                            className="link-menu__action"
                            onClick={openInNewTab}
                        >
                            <OpenIcon size={16} aria-hidden="true" />
                            <span>新しいタブで開く</span>
                        </button>
                    </li>
                    <li role="none" className="popover__item" style={{ '--i': 2 }}>
                        <button
                            type="button"
                            role="menuitem"
                            tabIndex={-1}
                            className="link-menu__action"
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
                    </li>
                </ul>
                <span className="link-menu__live" role="status" aria-live="polite">
                    {copyState === 'done' && 'リンクをコピーしました'}
                </span>
            </div>,
            document.body,
        );

    return { onContextMenu, menu };
}
