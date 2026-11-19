import FormField from '@/components/FormField/FormField.jsx';
import TextArea from '@/components/TextArea/TextArea.jsx';
import TextInput from '@/components/TextInput/TextInput.jsx';
import { RECORD_NUMBER_LIMITS } from '../../../../backend/common/recordInput.mjs';

// Exam, briefing and other sections of the record form (F-004-01).
// The inputs come from the shared section definition (getSectionDefinitions), so labels, input
// kinds and required marks are the same as in validation.
//
// section:  { type, label, fields: [{ name, label, input, required }] }
// value:    form state of this section, see emptyExam() / emptyBriefing() / emptyOther()
// onChange: called with the next value (the whole section object)
// errors:   optional { fieldName: 'message' } using the field names without the "exam." prefix
function SimpleSection({ section, value, onChange, errors = {} }) {
    const set = (name) => (event) => onChange({ ...value, [name]: event.target.value });

    return (
        <div className="simple-section">
            {section.fields.map((field) => (
                <FormField
                    key={field.name}
                    label={field.label}
                    required={field.required}
                    error={errors[field.name]}
                >
                    {field.input === 'textarea' ? (
                        <TextArea value={value[field.name]} onChange={set(field.name)} />
                    ) : (
                        <TextInput
                            type={field.input === 'number' ? 'number' : 'text'}
                            {...(field.input === 'number'
                                ? {
                                      inputMode: 'numeric',
                                      ...RECORD_NUMBER_LIMITS.duration,
                                      step: 1,
                                  }
                                : {})}
                            value={value[field.name]}
                            onChange={set(field.name)}
                        />
                    )}
                </FormField>
            ))}
        </div>
    );
}

export default SimpleSection;
