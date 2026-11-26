import Button from '@/components/Button/Button.jsx';
import Drawer from '@/components/Drawer/Drawer.jsx';
import { useOverlay } from '@/hooks/useOverlay.js';
import InterviewBasics from './InterviewBasics.jsx';
import InterviewReflection from './InterviewReflection.jsx';
import InterviewSection from './InterviewSection.jsx';
import OptionalFields from './OptionalFields.jsx';
import SimpleSection from './SimpleSection.jsx';

const isFilled = (value) => String(value ?? '').trim() !== '';

// Body of one activity card on the record form. Required items are shown right away; optional
// ones sit behind a "+ 追加（任意）" toggle. The inputs edit the form state directly.
// (Interview: time, format and interviewers here; questions and reflections in InterviewSection.)
function RecordSection({ section, value, onChange, needCategory, errors, errorsVersion }) {
    const props = { value, onChange, errors };
    // The interview questions are typed in a drawer, so the card stays short. The drawer edits the
    // form state directly: closing it keeps the input, and saving is still done from the page.
    const drawer = useOverlay('recordSection-interview');

    if (section.type === 'interview') {
        const filled = value.questions.filter((q) => isFilled(q.content)).length;
        const hasQuestionError = Object.keys(errors).some(
            (key) => key === 'questions' || key.startsWith('questions.'),
        );
        return (
            <div className="record-card__stack">
                <InterviewBasics {...props} />

                <div className="record-card__drawer-row">
                    <Button onClick={() => drawer.open()}>質問を入力</Button>
                    <span className="record-card__drawer-status">
                        {value.questions.length}件中 {filled}件入力済み（必須・1件以上）
                    </span>
                </div>
                {hasQuestionError && (
                    <p className="record-card__drawer-error" role="alert">
                        質問に入力エラーがあります。
                    </p>
                )}

                <InterviewReflection {...props} />

                <Drawer
                    open={drawer.isOpen}
                    size="lg"
                    title="面接の質問"
                    onClose={() => drawer.close()}
                    footer={<Button onClick={() => drawer.close()}>入力画面に戻る</Button>}
                >
                    <InterviewSection
                        {...props}
                        needCategory={needCategory}
                        errorsVersion={errorsVersion}
                    />
                </Drawer>
            </div>
        );
    }

    const required = section.fields.filter((field) => field.required);
    const optional = section.fields.filter((field) => !field.required);
    return (
        <div className="record-card__stack">
            <SimpleSection {...props} section={{ ...section, fields: required }} />
            {optional.length > 0 && (
                <OptionalFields
                    label={optional.map((field) => field.label).join('・')}
                    hasValue={optional.some((field) => isFilled(value[field.name]))}
                    hasError={optional.some((field) => errors[field.name])}
                >
                    <SimpleSection {...props} section={{ ...section, fields: optional }} />
                </OptionalFields>
            )}
        </div>
    );
}

export default RecordSection;
