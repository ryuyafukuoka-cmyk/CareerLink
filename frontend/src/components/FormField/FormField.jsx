import { useId } from 'react';
import { classNames } from '@/utils/classNames.js';
import { FormFieldContext } from './FormFieldContext.js';
import './FormField.css';

// Label + input + hint + error text for one form item.
// TextInput / TextArea / Select placed inside pick up the id and error state automatically.
// group: use for several controls under one label (checkbox or radio lists). Renders a fieldset.
function FormField({ label, required = false, error, hint, group = false, className, children }) {
    const id = useId();
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;
    const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined;
    const Wrapper = group ? 'fieldset' : 'div';
    const Label = group ? 'legend' : 'label';

    return (
        <FormFieldContext.Provider value={{ id, invalid: Boolean(error), required, describedBy }}>
            <Wrapper className={classNames('form-field', error && 'form-field--error', className)}>
                <Label className="form-field__label" {...(group ? {} : { htmlFor: id })}>
                    {label}
                    {required && (
                        <span className="form-field__required">
                            <span aria-hidden="true">必須</span>
                            <span className="visually-hidden">（必須）</span>
                        </span>
                    )}
                </Label>
                {hint && (
                    <p id={hintId} className="form-field__hint">
                        {hint}
                    </p>
                )}
                {children}
                {error && (
                    <p id={errorId} className="form-field__error" role="alert">
                        {error}
                    </p>
                )}
            </Wrapper>
        </FormFieldContext.Provider>
    );
}

export default FormField;
