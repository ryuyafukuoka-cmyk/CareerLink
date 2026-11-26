import { useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { classNames } from '@/utils/classNames.js';
import './AccordionItem.css';

// One panel of an accordion. The parent decides which item is open (pass open={false} to the rest).
// A closed item keeps its content mounted, so typed input stays; it is hidden from view and Tab.
// title: heading. summary: one line shown while closed. invalid: marks a closed item with errors.
// Other props (ref, data-*) go to the outer element.
function AccordionItem({ title, summary, open, onOpen, invalid = false, children, ...rest }) {
    const id = useId();
    const panelId = `${id}-panel`;

    return (
        <div
            {...rest}
            className={classNames(
                'accordion-item',
                open && 'accordion-item--open',
                invalid && 'accordion-item--invalid',
            )}
        >
            <button
                type="button"
                id={id}
                className="accordion-item__header"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={onOpen}
            >
                <span className="accordion-item__title">{title}</span>
                <span className="accordion-item__summary">{open ? '' : summary}</span>
                {invalid && <span className="accordion-item__error">入力エラー</span>}
                <ChevronDown className="accordion-item__icon" size={18} aria-hidden="true" />
            </button>
            <div id={panelId} className="accordion-item__panel" role="group" aria-labelledby={id}>
                <div className="accordion-item__clip">
                    <div className="accordion-item__body">{children}</div>
                </div>
            </div>
        </div>
    );
}

export default AccordionItem;
