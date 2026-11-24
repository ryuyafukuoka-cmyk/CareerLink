import { useId, useRef, useState } from 'react';
import { classNames } from '@/utils/classNames.js';
import './Tabs.css';

// Tab list with one visible panel.
// items: [{ value, label, content, disabled? }]. Only the active panel is rendered.
// Controlled: value + onChange(value). Uncontrolled: defaultValue (falls back to the first enabled tab).
// Keys: Left / Right move and select, Home / End jump to the first / last tab.
// Use for views of the same data (company karte: records / interview info / exam info),
// not for steps of a flow.
function Tabs({ items, value, onChange, defaultValue, label, className }) {
    const baseId = useId();
    const tabRefs = useRef({});
    const firstEnabled = items.find((item) => !item.disabled)?.value;
    const [innerValue, setInnerValue] = useState(defaultValue ?? firstEnabled);
    const current = value ?? innerValue;
    const active = items.find((item) => item.value === current) ?? items[0];

    function select(next) {
        if (value === undefined) setInnerValue(next);
        onChange?.(next);
    }

    function handleKeyDown(event) {
        const enabled = items.filter((item) => !item.disabled);
        const index = enabled.findIndex((item) => item.value === active.value);
        let target;
        if (event.key === 'ArrowRight') target = enabled[(index + 1) % enabled.length];
        else if (event.key === 'ArrowLeft')
            target = enabled[(index - 1 + enabled.length) % enabled.length];
        else if (event.key === 'Home') target = enabled[0];
        else if (event.key === 'End') target = enabled[enabled.length - 1];
        if (!target) return;
        event.preventDefault();
        select(target.value);
        tabRefs.current[target.value]?.focus();
    }

    return (
        <div className={classNames('tabs', className)}>
            <div className="tabs__list" role="tablist" aria-label={label} onKeyDown={handleKeyDown}>
                {items.map((item) => {
                    const selected = item.value === active.value;
                    return (
                        <button
                            key={item.value}
                            ref={(node) => {
                                tabRefs.current[item.value] = node;
                            }}
                            id={`${baseId}-tab-${item.value}`}
                            type="button"
                            role="tab"
                            className={classNames('tabs__tab', selected && 'tabs__tab--active')}
                            aria-selected={selected}
                            aria-controls={`${baseId}-panel-${item.value}`}
                            tabIndex={selected ? 0 : -1}
                            disabled={item.disabled}
                            onClick={() => select(item.value)}
                        >
                            {item.label}
                        </button>
                    );
                })}
            </div>
            <div
                key={active.value}
                id={`${baseId}-panel-${active.value}`}
                role="tabpanel"
                className="tabs__panel"
                aria-labelledby={`${baseId}-tab-${active.value}`}
                tabIndex={0}
            >
                {active.content}
            </div>
        </div>
    );
}

export default Tabs;
