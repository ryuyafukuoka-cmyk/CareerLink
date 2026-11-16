import { classNames } from '@/utils/classNames.js';
import { useFormField } from '@/components/FormField/useFormField.js';

// Drop-down. options: [{ value, label, disabled? }].
// placeholder: text of an empty first option (value ''). Leave undefined for no empty option.
function Select({ options, placeholder, className, ...rest }) {
    const field = useFormField();
    return (
        <select
            id={field?.id}
            aria-invalid={field?.invalid || undefined}
            aria-required={field?.required || undefined}
            aria-describedby={field?.describedBy}
            {...rest}
            className={classNames(
                'form-control',
                field?.invalid && 'form-control--invalid',
                className,
            )}
        >
            {placeholder !== undefined && <option value="">{placeholder}</option>}
            {options.map((option) => (
                <option key={option.value} value={option.value} disabled={option.disabled}>
                    {option.label}
                </option>
            ))}
        </select>
    );
}

export default Select;
