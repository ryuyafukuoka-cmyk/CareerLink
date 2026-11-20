import { useFormField } from '@/components/FormField/useFormField.js';
import { classNames } from '@/utils/classNames.js';
import './InputGroup.css';

// Input with text or icons attached to its edges (for example "https://" before, "円" after).
// start / end: addon content. children: one TextInput. disabled: dims the whole group.
// Inside a FormField the group turns red when the field has an error.
function InputGroup({ start, end, disabled = false, className, children }) {
    const field = useFormField();
    return (
        <div
            className={classNames(
                'input-group',
                field?.invalid && 'input-group--invalid',
                disabled && 'input-group--disabled',
                className,
            )}
        >
            {start && <span className="input-group__addon input-group__addon--start">{start}</span>}
            {children}
            {end && <span className="input-group__addon input-group__addon--end">{end}</span>}
        </div>
    );
}

export default InputGroup;
