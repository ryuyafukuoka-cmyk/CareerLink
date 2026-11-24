import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import Button from '@/components/Button/Button.jsx';
import { getMessage } from '@/messages';
import { classNames } from '@/utils/classNames.js';
import { overlayStack } from '@/utils/overlayStack.js';
import './Overlay.css';

const FOCUSABLE =
    'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)';
const EXIT_FALLBACK_MS = 400; // unmount anyway if the exit animation never reports its end

// Base for every hover UI: a panel over the current page (a centered dialog or a side drawer)
// with a dimmed backdrop. Use <Dialog> or <Drawer> in screens; ConfirmDialog is built on it too.
//
// open        shown or not. Closing plays the exit animation, then unmounts.
// variant     'dialog' | 'drawer'
// size        'sm' | 'md' | 'lg'
// title       heading (also the accessible name)
// onClose     called when the user closes it (Esc, backdrop, X, or discard confirmed)
// dirty       there are unsaved changes: closing first asks C-003 "discard?"
// busy        saving: closing is blocked (Esc, backdrop and X do nothing)
// hideClose   no X button (confirm dialogs)
// footer      action buttons, pinned to the bottom
// role        'dialog' (default) | 'alertdialog'
//
// Several can be open at once (for example a dialog over a drawer). Only the top one reacts
// to the keyboard, and the ones below dim slightly.
function Overlay({
    open,
    variant = 'dialog',
    size = 'md',
    title,
    onClose,
    dirty = false,
    busy = false,
    hideClose = false,
    footer,
    children,
    role = 'dialog',
    className,
    nested = false, // internal: the discard prompt itself
}) {
    const id = useId();
    const titleId = useId();
    const panelRef = useRef(null);
    const stateRef = useRef({});
    const stack = useSyncExternalStore(overlayStack.subscribe, overlayStack.getSnapshot);

    const [present, setPresent] = useState(open); // still mounted (open, or playing the exit animation)
    const [confirmingDiscard, setConfirmingDiscard] = useState(false);
    // Last content shown while open, so the exit animation does not flash empty
    // (a parent may clear its data the moment the overlay closes).
    const [frozen, setFrozen] = useState({ title, footer, children });

    if (open && !present) setPresent(true);
    if (!open && confirmingDiscard) setConfirmingDiscard(false);
    if (
        open &&
        (frozen.title !== title || frozen.footer !== footer || frozen.children !== children)
    ) {
        setFrozen({ title, footer, children });
    }

    const position = stack.indexOf(id);
    const isTop = position === stack.length - 1;
    const covered = open && position >= 0 && !isTop;
    const view = open ? { title, footer, children } : frozen;

    function requestClose() {
        if (busy) return;
        if (dirty) {
            setConfirmingDiscard(true);
            return;
        }
        onClose();
    }

    // Keep the latest values for the key handler without re-running the focus effect.
    useEffect(() => {
        stateRef.current = { isTop, busy, requestClose };
    });

    // Lock page scroll while mounted, including the exit animation (no scrollbar jump).
    useEffect(() => {
        if (!present) return undefined;
        overlayStack.lock(id);
        return () => overlayStack.unlock(id);
    }, [present, id]);

    // Register in the stack while open (which overlay is on top).
    useEffect(() => {
        if (!open) return undefined;
        overlayStack.push(id);
        return () => overlayStack.remove(id);
    }, [open, id]);

    // Focus the panel on open, keep Tab inside, close on Esc, give focus back on close.
    useEffect(() => {
        if (!open) return undefined;
        const previouslyFocused = document.activeElement;
        panelRef.current?.focus();

        function handleKeyDown(event) {
            const current = stateRef.current;
            if (!current.isTop) return;
            if (event.key === 'Escape') {
                event.preventDefault();
                current.requestClose();
                return;
            }
            if (event.key !== 'Tab' || !panelRef.current) return;

            const items = [...panelRef.current.querySelectorAll(FOCUSABLE)];
            if (items.length === 0) {
                event.preventDefault();
                return;
            }
            const first = items[0];
            const last = items[items.length - 1];
            const active = document.activeElement;
            if (event.shiftKey && (active === first || active === panelRef.current)) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && active === last) {
                event.preventDefault();
                first.focus();
            }
        }

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            previouslyFocused?.focus?.();
        };
    }, [open]);

    // Safety net: unmount even if animationend never fires (hidden tab, animations off).
    useEffect(() => {
        if (open || !present) return undefined;
        const timer = setTimeout(() => setPresent(false), EXIT_FALLBACK_MS);
        return () => clearTimeout(timer);
    }, [open, present]);

    if (!open && !present) return null;

    const state = open ? 'open' : 'closed';
    const zIndex = `calc(var(--z-modal) + ${position >= 0 ? position : stack.length})`;

    return createPortal(
        <div
            className="overlay"
            data-variant={variant}
            data-size={size}
            data-covered={covered ? '' : undefined}
            style={{ zIndex }}
        >
            <div
                className="overlay__backdrop"
                data-state={state}
                onMouseDown={requestClose}
                aria-hidden="true"
            />
            <div
                ref={panelRef}
                className={classNames('overlay__panel', className)}
                data-state={state}
                role={role}
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                onAnimationEnd={(event) => {
                    if (!open && event.target === event.currentTarget) setPresent(false);
                }}
            >
                <header className="overlay__header">
                    <h2 id={titleId} className="overlay__title">
                        {view.title}
                    </h2>
                    {!hideClose && (
                        <button
                            type="button"
                            className="overlay__close"
                            aria-label="閉じる"
                            disabled={busy}
                            onClick={requestClose}
                        >
                            <X size={18} aria-hidden="true" />
                        </button>
                    )}
                </header>
                <div className="overlay__body">{view.children}</div>
                {view.footer && <footer className="overlay__footer">{view.footer}</footer>}
            </div>
            {!nested && (
                <Overlay
                    nested
                    open={confirmingDiscard}
                    size="sm"
                    role="alertdialog"
                    title="変更を破棄しますか？"
                    hideClose
                    onClose={() => setConfirmingDiscard(false)}
                    footer={
                        <>
                            <Button variant="secondary" onClick={() => setConfirmingDiscard(false)}>
                                編集を続ける
                            </Button>
                            <Button
                                variant="danger"
                                onClick={() => {
                                    setConfirmingDiscard(false);
                                    onClose();
                                }}
                            >
                                破棄する
                            </Button>
                        </>
                    }
                >
                    <p>{getMessage('C-003')}</p>
                </Overlay>
            )}
        </div>,
        document.body,
    );
}

export default Overlay;
