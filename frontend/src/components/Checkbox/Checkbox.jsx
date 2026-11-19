import { classNames } from '@/utils/classNames.js';
import './Checkbox.css';

// Single checkbox with its own label. Pass checked + onChange (native event).
// For a list of checkboxes, put several inside <FormField group label="...">.
function Checkbox({ label, className, ...rest }) {
    return (
        <label className={classNames('checkbox', rest.disabled && 'checkbox--disabled', className)}>
            <input {...rest} type="checkbox" className="checkbox__input" />
            <span className="checkbox__label">{label}</span>
        </label>
    );
}

export default Checkbox;
