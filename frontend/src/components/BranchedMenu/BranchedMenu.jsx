import { useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import './BranchedMenu.css';

// Vertical menu whose groups open to a branch of links, with the active branch drawn as a line.
// Adapted from React Bits "Branched Menu": uses router links, lucide icons, and the app's tokens.
//
// items: [{ value, label, to, icon? }                                  a top-level link
//         { id, label, icon?, children: [{ value, label, to, icon? }] } a group]
// A top-level `icon` is drawn in the head, before the label.
// The active link comes from the current URL (the longest matching `to`).
// A group opens by default when it contains the active link; clicking its head toggles it.
const PAD = 6; // space above and below a group's rows (px)
const MARK = 16; // height of the active marker (px)

const matches = (to, pathname) =>
    to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`);

// Longest matching `to` wins, so /records/new beats /records.
function findActive(items, pathname) {
    let best = { value: '', section: -1, length: -1 };
    items.forEach((item, section) => {
        for (const leaf of item.children ?? [item]) {
            if (matches(leaf.to, pathname) && leaf.to.length > best.length) {
                best = {
                    value: leaf.value,
                    section: item.children ? section : -1,
                    length: leaf.to.length,
                };
            }
        }
    });
    return best;
}

function HeadLabel({ icon: Icon, children }) {
    return (
        <span className="branched-menu__head-main">
            {Icon && (
                <Icon
                    className="branched-menu__head-icon"
                    size={20}
                    strokeWidth={1.8}
                    aria-hidden="true"
                />
            )}
            <span className="branched-menu__head-label">{children}</span>
        </span>
    );
}

function BranchedMenu({
    items,
    rowHeight = 36,
    indent = 40,
    trunk = 14,
    radius = 10,
    lineWidth = 1.5,
    drawDuration = 400,
    foldDuration = 300,
    collapsed = false,
}) {
    const { pathname } = useLocation();
    const [overrides, setOverrides] = useState({}); // group id -> true / false once the user toggles it
    const heads = useRef({});
    const markerRef = useRef(null);
    const rootRef = useRef(null);

    const active = findActive(items, pathname);
    const activeGroup = active.section >= 0 ? items[active.section] : null;
    const isOpen = (item, index) => overrides[item.id] ?? index === active.section;
    // Top-level link that is the current page (e.g. home); it has no group.
    const activeLink =
        active.section < 0 ? items.find((item) => item.value === active.value) : null;
    const markedHead = activeGroup ? activeGroup.id : (activeLink?.value ?? null);
    // Open menu: bar only beside an open group. Collapsed (heads only): always beside the current branch.
    const markerShown =
        collapsed && Boolean(markedHead)
            ? true
            : Boolean(activeGroup) && isOpen(activeGroup, active.section);

    // Slide the marker beside the head of the group that holds the active link.
    useLayoutEffect(() => {
        const place = (glide) => {
            const marker = markerRef.current;
            const head = markedHead ? heads.current[markedHead] : null;
            if (!marker) return;
            const on = markerShown && head;
            if (!glide) marker.style.transition = 'none';
            if (on) marker.style.top = `${head.offsetTop + (head.offsetHeight - MARK) / 2}px`;
            marker.toggleAttribute('data-on', Boolean(on));
            if (!glide) {
                void marker.offsetHeight; // flush so the jump is not animated
                marker.style.transition = '';
            }
        };
        place(true);
        if (typeof ResizeObserver === 'undefined') return undefined;
        let first = true;
        const observer = new ResizeObserver(() => {
            if (first) {
                first = false;
                return;
            }
            place(false);
        });
        if (rootRef.current) observer.observe(rootRef.current);
        return () => observer.disconnect();
    }, [markedHead, markerShown, rowHeight]);

    function toggle(item, index) {
        setOverrides((prev) => ({
            ...prev,
            [item.id]: !(prev[item.id] ?? index === active.section),
        }));
    }

    // Geometry of the branch lines (SVG, one tree per open group).
    const r = Math.min(radius, rowHeight / 2 - 2);
    const endX = indent - 8;
    const rowY = (k) => PAD + k * rowHeight + rowHeight / 2;
    const branch = (k) =>
        `M ${trunk} ${rowY(k) - r} A ${r} ${r} 0 0 0 ${trunk + r} ${rowY(k)} H ${endX}`;
    const reach = (k) =>
        `M ${trunk} 0 V ${rowY(k) - r} A ${r} ${r} 0 0 0 ${trunk + r} ${rowY(k)} H ${endX}`;
    const length = (k) => rowY(k) - r + (Math.PI * r) / 2 + (endX - trunk - r);

    return (
        <div
            ref={rootRef}
            className="branched-menu"
            style={{
                '--bm-row': `${rowHeight}px`,
                '--bm-indent': `${indent}px`,
                '--bm-pad': `${PAD}px`,
                '--bm-mark': `${MARK}px`,
                '--bm-line-w': lineWidth,
                '--bm-draw': `${drawDuration}ms`,
                '--bm-fold': `${foldDuration}ms`,
            }}
        >
            <span ref={markerRef} className="branched-menu__marker" aria-hidden="true" />
            {items.map((item, index) => {
                const kids = item.children;
                if (!kids) {
                    const current = item.value === active.value;
                    return (
                        <div key={item.value} className="branched-menu__section">
                            <Link
                                ref={(node) => {
                                    heads.current[item.value] = node;
                                }}
                                to={item.to}
                                className="branched-menu__head"
                                aria-current={current ? 'page' : undefined}
                                data-active={current ? '' : undefined}
                                title={item.label}
                            >
                                <HeadLabel icon={item.icon}>{item.label}</HeadLabel>
                            </Link>
                        </div>
                    );
                }
                const open = isOpen(item, index);
                const bodyHeight = PAD * 2 + kids.length * rowHeight;
                return (
                    <div
                        key={item.id}
                        className="branched-menu__section"
                        data-open={open ? '' : undefined}
                    >
                        <button
                            ref={(node) => {
                                heads.current[item.id] = node;
                            }}
                            type="button"
                            className="branched-menu__head"
                            aria-expanded={open}
                            data-has-active={index === active.section ? '' : undefined}
                            title={item.label}
                            onClick={() => toggle(item, index)}
                        >
                            <HeadLabel icon={item.icon}>{item.label}</HeadLabel>
                            <ChevronDown
                                className="branched-menu__chevron"
                                size={16}
                                aria-hidden="true"
                            />
                        </button>
                        <div className="branched-menu__body">
                            <div className="branched-menu__fold">
                                <div className="branched-menu__tree" style={{ height: bodyHeight }}>
                                    <svg
                                        className="branched-menu__lines"
                                        width={indent}
                                        height={bodyHeight}
                                        aria-hidden="true"
                                    >
                                        <path
                                            className="branched-menu__base"
                                            d={`M ${trunk} 0 V ${rowY(kids.length - 1) - r}`}
                                        />
                                        {kids.map((kid, k) => (
                                            <path
                                                key={kid.value}
                                                className="branched-menu__base"
                                                d={branch(k)}
                                            />
                                        ))}
                                        {kids.map((kid, k) => (
                                            <path
                                                key={kid.value}
                                                className="branched-menu__reach"
                                                d={reach(k)}
                                                style={{
                                                    strokeDasharray: length(k),
                                                    strokeDashoffset:
                                                        kid.value === active.value ? 0 : length(k),
                                                }}
                                            />
                                        ))}
                                    </svg>
                                    {kids.map((kid) => {
                                        const Icon = kid.icon;
                                        const current = kid.value === active.value;
                                        return (
                                            <Link
                                                key={kid.value}
                                                to={kid.to}
                                                className="branched-menu__item"
                                                aria-current={current ? 'page' : undefined}
                                                data-active={current ? '' : undefined}
                                                tabIndex={open ? 0 : -1}
                                                title={kid.label}
                                            >
                                                {Icon && (
                                                    <Icon
                                                        className="branched-menu__icon"
                                                        size={16}
                                                        strokeWidth={1.8}
                                                        aria-hidden="true"
                                                    />
                                                )}
                                                <span className="branched-menu__label">
                                                    {kid.label}
                                                </span>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default BranchedMenu;
