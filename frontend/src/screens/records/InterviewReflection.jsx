import FormField from '@/components/FormField/FormField.jsx';
import TextArea from '@/components/TextArea/TextArea.jsx';
import OptionalFields from './OptionalFields.jsx';

// Impression (required) and the optional notes of an interview, shown on the interview card.
// Props are the same as InterviewSection (value, onChange, errors).
function InterviewReflection({ value, onChange, errors = {} }) {
    const fromEvent = (field) => (event) => onChange({ ...value, [field]: event.target.value });

    return (
        <>
            <FormField label="面接の所感" required error={errors.impression}>
                <TextArea value={value.impression} onChange={fromEvent('impression')} />
            </FormField>

            <OptionalFields
                label="注意点・後輩へのアドバイス"
                hasValue={Boolean(value.caution.trim() || value.adviceToJuniors.trim())}
                hasError={Boolean(errors.caution || errors.adviceToJuniors)}
            >
                <FormField label="注意点" error={errors.caution}>
                    <TextArea value={value.caution} onChange={fromEvent('caution')} />
                </FormField>

                <FormField label="後輩へのアドバイス" error={errors.adviceToJuniors}>
                    <TextArea
                        value={value.adviceToJuniors}
                        onChange={fromEvent('adviceToJuniors')}
                    />
                </FormField>
            </OptionalFields>
        </>
    );
}

export default InterviewReflection;
