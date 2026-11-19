import { useContext } from 'react';
import { FormFieldContext } from './FormFieldContext.js';

// Returns { id, invalid, required, describedBy } inside a FormField, or null outside one.
export function useFormField() {
    return useContext(FormFieldContext);
}
