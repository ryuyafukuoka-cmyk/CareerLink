import { classNames } from '@/utils/classNames.js';
import './Switch.css';

// On/off switch with its own label. Pass checked + onChange (native event), like Checkbox.
// Use it for a setting that takes effect right away (for example account active / inactive).
// Use Checkbox for a choice that is saved later with a form.
// The native input stays in the page (keyboard Space, screen readers); the drawn track follows it.
function Switch({ label, className, ...rest }) {
    return (
        <label className={classNames('switch', rest.disabled && 'switch--disabled', className)}>
            <input {...rest} type="checkbox" role="switch" className="switch__input" />
            <span className="switch__track" aria-hidden="true">
                <span className="switch__thumb" />
            </span>
            {label && <span className="switch__label">{label}</span>}
        </label>
    );
}

export default Switch;
