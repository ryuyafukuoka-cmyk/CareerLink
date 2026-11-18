import { QUESTION_CATEGORY_OPTIONS } from '@shared/definitions';
import Button from '@/components/Button/Button.jsx';
import FormField from '@/components/FormField/FormField.jsx';
import Select from '@/components/Select/Select.jsx';
import TextArea from '@/components/TextArea/TextArea.jsx';
import TextInput from '@/components/TextInput/TextInput.jsx';
import { RECORD_NUMBER_LIMITS } from '../../../../backend/common/recordInput.mjs';
import { emptyQuestion } from './sectionDefaults.js';
import './InterviewSection.css';

// Interview section of the record form (F-004-01).
//
// value:        form state, see emptyInterview() in sectionDefaults.js
// onChange:     called with the next value (the whole interview object)
// needCategory: true when every question must have a category (the round stage is not "considering";
//               this applies to drafts too). When false the category may stay empty.
// errors:       optional { 'durationMinutes': 'message', 'questions.0.category': 'message', ... }
//               keys are the API field names without the leading "interview."
function InterviewSection({ value, onChange, needCategory, errors = {} }) {
    const set = (field, next) => onChange({ ...value, [field]: next });
    const fromEvent = (field) => (event) => set(field, event.target.value);

    const setQuestion = (index, patch) =>
        set(
            'questions',
            value.questions.map((q, i) => (i === index ? { ...q, ...patch } : q)),
        );
    const addQuestion = () => set('questions', [...value.questions, emptyQuestion()]);
    const removeQuestion = (index) =>
        set(
            'questions',
            value.questions.filter((_, i) => i !== index),
        );

    const setFollowUp = (qIndex, fIndex, text) =>
        setQuestion(qIndex, {
            followUps: value.questions[qIndex].followUps.map((t, i) => (i === fIndex ? text : t)),
        });
    const addFollowUp = (qIndex) =>
        setQuestion(qIndex, { followUps: [...value.questions[qIndex].followUps, ''] });
    const removeFollowUp = (qIndex, fIndex) =>
        setQuestion(qIndex, {
            followUps: value.questions[qIndex].followUps.filter((_, i) => i !== fIndex),
        });

    return (
        <div className="interview-section">
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

            <FormField label="面接形式" required error={errors.interviewFormat}>
                <TextInput
                    placeholder="個人面接・集団面接・オンラインなど"
                    value={value.interviewFormat}
                    onChange={fromEvent('interviewFormat')}
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

            <div className="interview-section__questions">
                <h3 className="interview-section__heading">
                    質問<span className="interview-section__required">必須（1件以上）</span>
                </h3>
                <p className="interview-section__hint">
                    {needCategory
                        ? '質問カテゴリは、下書きでも必ず選択してください。'
                        : '応募回が「未応募・検討中」の間は、質問カテゴリを未選択のまま保存できます。'}
                </p>
                {errors.questions && (
                    <p className="interview-section__error" role="alert">
                        {errors.questions}
                    </p>
                )}

                {value.questions.map((question, qIndex) => (
                    <fieldset key={qIndex} className="interview-section__question">
                        <legend>質問{qIndex + 1}</legend>

                        <FormField
                            label="質問カテゴリ"
                            required={needCategory}
                            error={errors[`questions.${qIndex}.category`]}
                        >
                            <Select
                                placeholder="カテゴリを選択"
                                options={QUESTION_CATEGORY_OPTIONS}
                                value={question.category}
                                onChange={(event) =>
                                    setQuestion(qIndex, { category: event.target.value })
                                }
                            />
                        </FormField>

                        <FormField
                            label="質問内容"
                            required
                            error={errors[`questions.${qIndex}.content`]}
                        >
                            <TextArea
                                rows={3}
                                value={question.content}
                                onChange={(event) =>
                                    setQuestion(qIndex, { content: event.target.value })
                                }
                            />
                        </FormField>

                        <FormField label="回答" error={errors[`questions.${qIndex}.answer`]}>
                            <TextArea
                                rows={3}
                                value={question.answer}
                                onChange={(event) =>
                                    setQuestion(qIndex, { answer: event.target.value })
                                }
                            />
                        </FormField>

                        <FormField
                            group
                            label="深掘り質問"
                            hint="質問文のみを記録します。"
                            error={errors[`questions.${qIndex}.followUps`]}
                        >
                            {question.followUps.map((text, fIndex) => (
                                <div key={fIndex} className="interview-section__followup">
                                    <FormField
                                        label={
                                            <span className="visually-hidden">
                                                {`質問${qIndex + 1}の深掘り質問${fIndex + 1}`}
                                            </span>
                                        }
                                        className="interview-section__followup-input"
                                        error={errors[`questions.${qIndex}.followUps.${fIndex}`]}
                                    >
                                        <TextInput
                                            value={text}
                                            onChange={(event) =>
                                                setFollowUp(qIndex, fIndex, event.target.value)
                                            }
                                        />
                                    </FormField>
                                    <Button
                                        variant="secondary"
                                        onClick={() => removeFollowUp(qIndex, fIndex)}
                                    >
                                        削除
                                    </Button>
                                </div>
                            ))}
                            <Button variant="secondary" onClick={() => addFollowUp(qIndex)}>
                                深掘り質問を追加
                            </Button>
                        </FormField>

                        <div className="interview-section__question-actions">
                            <Button
                                variant="danger"
                                disabled={value.questions.length <= 1}
                                onClick={() => removeQuestion(qIndex)}
                            >
                                質問{qIndex + 1}を削除
                            </Button>
                        </div>
                    </fieldset>
                ))}

                <Button variant="secondary" onClick={addQuestion}>
                    質問を追加
                </Button>
            </div>

            <FormField label="面接の所感" required error={errors.impression}>
                <TextArea value={value.impression} onChange={fromEvent('impression')} />
            </FormField>

            <FormField label="注意点" error={errors.caution}>
                <TextArea value={value.caution} onChange={fromEvent('caution')} />
            </FormField>

            <FormField label="後輩へのアドバイス" error={errors.adviceToJuniors}>
                <TextArea value={value.adviceToJuniors} onChange={fromEvent('adviceToJuniors')} />
            </FormField>
        </div>
    );
}

export default InterviewSection;
