import { classNames } from '@/utils/classNames.js';
import { useFormField } from '@/components/FormField/useFormField.js';

// One-line input. Pass value + onChange (native event). Inside a FormField it is wired up for you.
function TextInput({ type = 'text', className, ...rest }) {
    const field = useFormField();
    return (
        <input
            id={field?.id}
            aria-invalid={field?.invalid || undefined}
            aria-required={field?.required || undefined}
            aria-describedby={field?.describedBy}
            {...rest}
            type={type}
            className={classNames(
                'form-control',
                field?.invalid && 'form-control--invalid',
                className,
            )}
        />
    );
}

export default TextInput;
