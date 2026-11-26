import { useEffect, useRef, useState } from 'react';
import BranchedMenu from '@/components/BranchedMenu/BranchedMenu.jsx';
import './SideRail.css';

// Floating side drawer. Collapsed it is a short column of icons; it opens over the page (the page
// never shifts).
//   - Starts open (locked). A press outside the rail retracts it.
//   - Mouse near / over it  -> opens; leaving it closes again (small delay, so no flicker).
//   - Keyboard focus inside -> opens; focus leaving closes it.
//   - Click / tap anywhere inside -> locks open. A locked rail stays open when the pointer leaves
//     and closes only on a press outside it (or Esc).
//
// items: the same tree BranchedMenu takes. A top-level node may carry `icon` (shown when collapsed).
const CLOSE_DELAY = 140; // ms the pointer may be away before an unlocked rail closes

function SideRail({ items, label = 'メインメニュー' }) {
    const rootRef = useRef(null);
    const timer = useRef(null);
    const [hovered, setHovered] = useState(false);
    const [focused, setFocused] = useState(false);
    const [locked, setLocked] = useState(true); // starts open; a press outside retracts it
    const expanded = hovered || focused || locked;

    useEffect(() => () => clearTimeout(timer.current), []);

    // Locked: a press outside the rail (or Esc) unlocks it.
    useEffect(() => {
        if (!locked) return undefined;
        const onDown = (event) => {
            if (rootRef.current && !rootRef.current.contains(event.target)) {
                setLocked(false);
                setHovered(false);
                setFocused(false);
            }
        };
        const onKey = (event) => {
            if (event.key === 'Escape') {
                setLocked(false);
                setHovered(false);
                setFocused(false);
            }
        };
        document.addEventListener('pointerdown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('pointerdown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [locked]);

    function handlePointerEnter(event) {
        if (event.pointerType !== 'mouse') return; // touch has no hover; a tap locks instead
        clearTimeout(timer.current);
        setHovered(true);
    }

    function handlePointerLeave(event) {
        if (event.pointerType !== 'mouse') return;
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setHovered(false), CLOSE_DELAY);
    }

    function handleBlur(event) {
        if (!rootRef.current?.contains(event.relatedTarget)) setFocused(false);
    }

    return (
        <nav
            ref={rootRef}
            className="side-rail"
            aria-label={label}
            data-expanded={expanded ? '' : undefined}
            data-locked={locked ? '' : undefined}
            onPointerEnter={handlePointerEnter}
            onPointerLeave={handlePointerLeave}
            onPointerDown={() => setLocked(true)}
            onFocus={() => setFocused(true)}
            onBlur={handleBlur}
        >
            <div className="side-rail__panel">
                {/* The branched menu is always drawn; collapsed, the panel clips it to the head icons. */}
                <div className="side-rail__menu">
                    <BranchedMenu items={items} collapsed={!expanded} />
                </div>
            </div>
        </nav>
    );
}

export default SideRail;
