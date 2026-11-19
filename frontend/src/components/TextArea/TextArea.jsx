import { classNames } from '@/utils/classNames.js';
import { useFormField } from '@/components/FormField/useFormField.js';

// Multi-line input. Pass value + onChange (native event). Inside a FormField it is wired up for you.
function TextArea({ rows = 4, className, ...rest }) {
    const field = useFormField();
    return (
        <textarea
            id={field?.id}
            aria-invalid={field?.invalid || undefined}
            aria-required={field?.required || undefined}
            aria-describedby={field?.describedBy}
            {...rest}
            rows={rows}
            className={classNames(
                'form-control',
                field?.invalid && 'form-control--invalid',
                className,
            )}
        />
    );
}

export default TextArea;
