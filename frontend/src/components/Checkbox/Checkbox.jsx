import { classNames } from '@/utils/classNames.js';
import './Checkbox.css';

// Single checkbox with its own label. Pass checked + onChange (native event).
// For a list of checkboxes, put several inside <FormField group label="...">.
// The native input stays in the page (keyboard, screen readers); the drawn box follows it.
function Checkbox({ label, className, ...rest }) {
    return (
        <label className={classNames('checkbox', rest.disabled && 'checkbox--disabled', className)}>
            <input {...rest} type="checkbox" className="checkbox__input" />
            <span className="checkbox__mark" aria-hidden="true">
                <svg className="checkbox__tick" viewBox="0 0 16 16">
                    <path d="M3.5 8.5 L6.5 11.5 L12.5 4.5" pathLength="1" />
                </svg>
            </span>
            <span className="checkbox__label">{label}</span>
        </label>
    );
}

export default Checkbox;
