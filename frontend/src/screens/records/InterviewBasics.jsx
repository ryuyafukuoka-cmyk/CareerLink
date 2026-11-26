import FormField from '@/components/FormField/FormField.jsx';
import RadioGroup from '@/components/RadioGroup/RadioGroup.jsx';
import TextInput from '@/components/TextInput/TextInput.jsx';
import { RECORD_NUMBER_LIMITS } from '../../../../backend/common/recordInput.mjs';
import { FORMAT_OTHER, METHOD_CHOICES, STYLE_CHOICES } from './interviewFormat.js';
import './InterviewSection.css';

// The API allows 100 characters for the composed string.
const OTHER_MAX_LENGTH = 40;

const toOptions = (choices) => [
    ...choices.map((choice) => ({ value: choice, label: choice })),
    { value: FORMAT_OTHER, label: 'その他' },
];

// The general interview items shown on the record form itself: time, format, interviewers.
// Props are the same as InterviewSection (value, onChange, errors).
function InterviewBasics({ value, onChange, errors = {} }) {
    const set = (field, next) => onChange({ ...value, [field]: next });
    const fromEvent = (field) => (event) => set(field, event.target.value);

    function renderFormat(label, field, choices) {
        const otherField = `${field}Other`;
        return (
            <FormField group label={label} required error={errors.interviewFormat}>
                <RadioGroup
                    orientation="horizontal"
                    options={toOptions(choices)}
                    value={value[field]}
                    onChange={(next) => set(field, next)}
                />
                {value[field] === FORMAT_OTHER && (
                    <TextInput
                        className="interview-section__other"
                        aria-label={`${label}（その他の内容）`}
                        placeholder="内容を入力してください"
                        maxLength={OTHER_MAX_LENGTH}
                        value={value[otherField] ?? ''}
                        onChange={fromEvent(otherField)}
                    />
                )}
            </FormField>
        );
    }

    return (
        <div className="interview-section">
            <div className="interview-section__row">
                <FormField label="面接時間（分）" required error={errors.durationMinutes}>
                    <TextInput
                        type="number"
                        inputMode="numeric"
                        {...RECORD_NUMBER_LIMITS.duration}
                        step="1"
                        value={value.durationMinutes}
                        onChange={fromEvent('durationMinutes')}
                    />
                </FormField>

                <FormField label="面接官の人数" required error={errors.interviewerCount}>
                    <TextInput
                        type="number"
                        inputMode="numeric"
                        {...RECORD_NUMBER_LIMITS.interviewerCount}
                        step="1"
                        value={value.interviewerCount}
                        onChange={fromEvent('interviewerCount')}
                    />
                </FormField>
            </div>

            <div className="interview-section__row">
                {renderFormat('面接形式', 'formatStyle', STYLE_CHOICES)}
                {renderFormat('実施方法', 'formatMethod', METHOD_CHOICES)}
            </div>
        </div>
    );
}

export default InterviewBasics;
