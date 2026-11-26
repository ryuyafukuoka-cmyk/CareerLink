import Button from '@/components/Button/Button.jsx';
import Drawer from '@/components/Drawer/Drawer.jsx';
import { useOverlay } from '@/hooks/useOverlay.js';
import InterviewBasics from './InterviewBasics.jsx';
import InterviewSection from './InterviewSection.jsx';
import SimpleSection from './SimpleSection.jsx';

const isFilled = (value) => String(value ?? '').trim() !== '';

// One activity section of the record form. General (short) items stay on the page; long text and
// the interview questions are typed in a drawer. The drawer edits the form state directly, so
// closing it keeps the input and saving is still done from the page.
function RecordSection({ section, value, onChange, needCategory, errors, errorsVersion }) {
    const drawer = useOverlay(`recordSection-${section.type}`);
    const isInterview = section.type === 'interview';

    const isDetail = (field) => field.input === 'textarea' || field.input === 'questions';
    const mainFields = section.fields.filter((field) => !isDetail(field));
    const detailFields = section.fields.filter(isDetail);

    const filled = detailFields.filter((field) =>
        field.input === 'questions'
            ? value.questions.some((question) => isFilled(question.content))
            : isFilled(value[field.name]),
    ).length;
    const hasDetailError = Object.keys(errors).some((key) =>
        detailFields.some((field) => key === field.name || key.startsWith(`${field.name}.`)),
    );

    const props = { value, onChange, errors };

    return (
        <section className="record-form__section">
            <h2>{section.label}</h2>
            {isInterview ? (
                <InterviewBasics {...props} />
            ) : (
                <SimpleSection {...props} section={{ ...section, fields: mainFields }} />
            )}

            <div className="record-form__details">
                <Button variant="secondary" onClick={() => drawer.open()}>
                    {section.label}の詳細を入力
                </Button>
                <span className="record-form__details-status">
                    入力済み {filled}/{detailFields.length}項目
                    {detailFields.some((field) => field.required) && '（必須項目あり）'}
                </span>
            </div>
            {hasDetailError && (
                <p className="record-form__details-error" role="alert">
                    詳細に入力エラーがあります。
                </p>
            )}

            <Drawer
                open={drawer.isOpen}
                size="lg"
                title={`${section.label}の詳細`}
                onClose={() => drawer.close()}
                footer={<Button onClick={() => drawer.close()}>入力画面に戻る</Button>}
            >
                {isInterview ? (
                    <InterviewSection
                        {...props}
                        needCategory={needCategory}
                        errorsVersion={errorsVersion}
                    />
                ) : (
                    <SimpleSection {...props} section={{ ...section, fields: detailFields }} />
                )}
            </Drawer>
        </section>
    );
}

export default RecordSection;
