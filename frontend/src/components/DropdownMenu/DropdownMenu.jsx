import { useCallback, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useClickOutside } from '@/hooks/useClickOutside.js';
import { usePresence } from '@/hooks/usePresence.js';
import { classNames } from '@/utils/classNames.js';
import '@/styles/popover.css';
import './DropdownMenu.css';

const ITEM_SELECTOR = '[role="menuitem"]:not(:disabled)';

// Button that opens a menu of actions.
// children: the trigger content (text / icon). triggerLabel: accessible name for an icon-only trigger.
// items: [{ label, onSelect?, to?, icon?, danger?, disabled?, separator? }]
//   icon is a component (for example a lucide icon). `to` renders a router link.
// align: 'start' | 'end' (which edge of the trigger the menu lines up with).
function DropdownMenu({ items, align = 'start', triggerLabel, children, className }) {
    const menuId = useId();
    const wrapperRef = useRef(null);
    const triggerRef = useRef(null);
    const menuRef = useRef(null);
    const [open, setOpen] = useState(false);

    const { mounted, state } = usePresence(open);

    useClickOutside(wrapperRef, () => setOpen(false), open);

    function focusItem(target) {
        const nodes = [...(menuRef.current?.querySelectorAll(ITEM_SELECTOR) ?? [])];
        if (nodes.length === 0) return;
        const current = nodes.indexOf(document.activeElement);
        const index = {
            first: 0,
            last: nodes.length - 1,
            next: (current + 1) % nodes.length,
            prev: (current - 1 + nodes.length) % nodes.length,
        }[target];
        nodes[index].focus();
    }

    // Ref callback: when the menu mounts, focus its first enabled item.
    // Stable identity, so it runs only when the menu opens or closes (not on every re-render).
    const setMenuNode = useCallback((node) => {
        menuRef.current = node;
        node?.querySelector(ITEM_SELECTOR)?.focus();
    }, []);

    function closeAndReturn() {
        setOpen(false);
        triggerRef.current?.focus();
    }

    function handleMenuKeyDown(event) {
        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                focusItem('next');
                break;
            case 'ArrowUp':
                event.preventDefault();
                focusItem('prev');
                break;
            case 'Home':
                event.preventDefault();
                focusItem('first');
                break;
            case 'End':
                event.preventDefault();
                focusItem('last');
                break;
            case 'Escape':
                // Close the menu only; do not close a surrounding dialog.
                event.preventDefault();
                event.stopPropagation();
                closeAndReturn();
                break;
            case 'Tab':
                setOpen(false);
                break;
            default:
        }
    }

    return (
        <div ref={wrapperRef} className={classNames('dropdown-menu', className)}>
            <button
                ref={triggerRef}
                type="button"
                className="dropdown-menu__trigger"
                aria-haspopup="menu"
                aria-expanded={open}
                aria-controls={open ? menuId : undefined}
                aria-label={triggerLabel}
                onClick={() => setOpen((value) => !value)}
                onKeyDown={(event) => {
                    if (event.key === 'ArrowDown' && !open) {
                        event.preventDefault();
                        setOpen(true);
                    }
                }}
            >
                {children}
            </button>

            {mounted && (
                <ul
                    ref={setMenuNode}
                    data-state={state}
                    id={menuId}
                    role="menu"
                    className={classNames(
                        'popover',
                        'dropdown-menu__menu',
                        `dropdown-menu__menu--${align}`,
                    )}
                    onKeyDown={handleMenuKeyDown}
                >
                    {items.map((item, index) => {
                        if (item.separator) {
                            return (
                                <li
                                    key={`sep-${index}`}
                                    role="separator"
                                    style={{ '--i': index }}
                                    className="popover__item dropdown-menu__separator"
                                />
                            );
                        }
                        const Icon = item.icon;
                        const content = (
                            <>
                                {Icon && <Icon size={16} aria-hidden="true" />}
                                <span>{item.label}</span>
                            </>
                        );
                        const itemClass = classNames(
                            'dropdown-menu__item',
                            item.danger && 'dropdown-menu__item--danger',
                        );
                        return (
                            <li
                                key={`${item.label}-${index}`}
                                role="none"
                                style={{ '--i': index }}
                                className="popover__item"
                            >
                                {item.to && !item.disabled ? (
                                    <Link
                                        role="menuitem"
                                        tabIndex={-1}
                                        to={item.to}
                                        className={itemClass}
                                        onClick={() => setOpen(false)}
                                    >
                                        {content}
                                    </Link>
                                ) : (
                                    <button
                                        type="button"
                                        role="menuitem"
                                        tabIndex={-1}
                                        disabled={item.disabled}
                                        className={itemClass}
                                        onClick={() => {
                                            item.onSelect?.();
                                            closeAndReturn();
                                        }}
                                    >
                                        {content}
                                    </button>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}

export default DropdownMenu;
