import { useId } from 'react';
import { useFormField } from '@/components/FormField/useFormField.js';
import { classNames } from '@/utils/classNames.js';
import './RadioGroup.css';

// Pick one option.
// options: [{ value, label, description?, disabled? }]
// value / onChange(value): onChange gets the option value, NOT an event.
// variant: 'default' (small circles) | 'card' (whole option is a bordered card)
// orientation: 'vertical' | 'horizontal'
// Put it inside <FormField group label="..."> so the label and errors are wired up.
function RadioGroup({
    options,
    value,
    onChange,
    name,
    variant = 'default',
    orientation = 'vertical',
    disabled = false,
    className,
}) {
    const field = useFormField();
    const autoName = useId();
    const groupName = name ?? autoName;

    return (
        <div
            role="radiogroup"
            aria-invalid={field?.invalid || undefined}
            aria-required={field?.required || undefined}
            aria-describedby={field?.describedBy}
            className={classNames(
                'radio-group',
                `radio-group--${variant}`,
                `radio-group--${orientation}`,
                className,
            )}
        >
            {options.map((option) => (
                <label
                    key={option.value}
                    className={classNames(
                        'radio-group__option',
                        (disabled || option.disabled) && 'radio-group__option--disabled',
                    )}
                >
                    <input
                        type="radio"
                        className="radio-group__input"
                        name={groupName}
                        value={option.value}
                        checked={option.value === value}
                        disabled={disabled || option.disabled}
                        onChange={() => onChange(option.value)}
                    />
                    <span className="radio-group__mark" aria-hidden="true" />
                    <span className="radio-group__text">
                        <span className="radio-group__label">{option.label}</span>
                        {option.description && (
                            <span className="radio-group__description">{option.description}</span>
                        )}
                    </span>
                </label>
            ))}
        </div>
    );
}

export default RadioGroup;
