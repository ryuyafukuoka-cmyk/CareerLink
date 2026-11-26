import { useEffect, useRef, useState } from 'react';
import { QUESTION_CATEGORY_OPTIONS } from '@shared/definitions';
import AccordionItem from '@/components/Accordion/AccordionItem.jsx';
import Button from '@/components/Button/Button.jsx';
import FormField from '@/components/FormField/FormField.jsx';
import Select from '@/components/Select/Select.jsx';
import TextArea from '@/components/TextArea/TextArea.jsx';
import TextInput from '@/components/TextInput/TextInput.jsx';
import { emptyQuestion } from './sectionDefaults.js';
import './InterviewSection.css';

// Interview details (questions and reflections), shown in the section drawer (F-004-01).
// Time, format and interviewer count are in InterviewBasics.
//
// value:        form state, see emptyInterview() in sectionDefaults.js
// onChange:     called with the next value (the whole interview object)
// needCategory: true when every question must have a category (the round stage is not "considering";
//               this applies to drafts too). When false the category may stay empty.
// errors:       optional { 'durationMinutes': 'message', 'questions.0.category': 'message', ... }
//               keys are the API field names without the leading "interview."
// errorsVersion: changes on every check, so the first question with an error is opened again.
//
// Questions are an accordion: exactly one is expanded, to keep the form short.
function InterviewSection({ value, onChange, needCategory, errors = {}, errorsVersion }) {
    const [openIndex, setOpenIndex] = useState(0);
    const [checked, setChecked] = useState(null);

    const hasError = (index) =>
        Object.keys(errors).some((key) => key.startsWith(`questions.${index}.`));

    // After a check, show an error if the open question has none but another one does.
    if (checked !== errorsVersion) {
        setChecked(errorsVersion);
        const first = value.questions.findIndex((_, i) => hasError(i));
        if (first >= 0 && !hasError(openIndex)) setOpenIndex(first);
    }

    // After the person adds or picks a question, bring it into view once the others have closed.
    const itemRefs = useRef([]);
    const [scrollRequest, setScrollRequest] = useState(null);
    useEffect(() => {
        if (!scrollRequest) return undefined;
        const timer = setTimeout(() => {
            itemRefs.current[scrollRequest.index]?.scrollIntoView({ block: 'nearest' });
        }, 250);
        return () => clearTimeout(timer);
    }, [scrollRequest]);

    function openQuestion(index) {
        setOpenIndex(index);
        setScrollRequest({ index });
    }

    const set = (field, next) => onChange({ ...value, [field]: next });
    const fromEvent = (field) => (event) => set(field, event.target.value);

    const setQuestion = (index, patch) =>
        set(
            'questions',
            value.questions.map((q, i) => (i === index ? { ...q, ...patch } : q)),
        );
    const addQuestion = () => {
        set('questions', [...value.questions, emptyQuestion()]);
        openQuestion(value.questions.length);
    };
    const removeQuestion = (index) => {
        const next = value.questions.filter((_, i) => i !== index);
        set('questions', next);
        setOpenIndex(Math.min(index, next.length - 1));
    };

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
                    <AccordionItem
                        key={qIndex}
                        ref={(element) => {
                            itemRefs.current[qIndex] = element;
                        }}
                        title={`質問${qIndex + 1}`}
                        summary={question.content.trim() || '（未入力）'}
                        open={qIndex === openIndex}
                        onOpen={() => openQuestion(qIndex)}
                        invalid={hasError(qIndex)}
                    >
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
                    </AccordionItem>
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
