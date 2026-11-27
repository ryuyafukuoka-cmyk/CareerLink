import { Fragment } from 'react';
import { getSectionDefinitions } from '@shared/definitions';
import Badge from '@/components/Badge/Badge.jsx';
import './RecordScreens.css';

const EMPTY = '—';
const isBlank = (value) => value === null || value === undefined || value === '';
const show = (value) => (isBlank(value) ? EMPTY : String(value));

// Read-only view of the interview questions (category, question, answer, follow-ups).
function QuestionsView({ questions }) {
    if (!Array.isArray(questions) || questions.length === 0) return EMPTY;
    return (
        <ol className="record-view__questions">
            {questions.map((question, index) => (
                // Questions have no ID of their own; the list never reorders on this screen.
                <li key={index} className="record-view__question">
                    {question.category && (
                        <p>
                            <Badge size="sm" tone="primary">
                                {question.category}
                            </Badge>
                        </p>
                    )}
                    <p className="record-view__question-text">
                        <span className="visually-hidden">質問：</span>
                        {show(question.content)}
                    </p>
                    <p className="record-view__text">
                        <span className="record-view__label">回答</span>
                        {show(question.answer)}
                    </p>
                    {Array.isArray(question.followUps) && question.followUps.length > 0 && (
                        <ul className="record-view__followups" aria-label="深掘り質問">
                            {question.followUps.map((followUp, followIndex) => (
                                <li key={followIndex}>{followUp}</li>
                            ))}
                        </ul>
                    )}
                </li>
            ))}
        </ol>
    );
}

// Read-only sections of a record, one block per selected activity type (same field list as the form).
// Optional fields that were left empty show "—".
function RecordSectionsView({ activityTypes, sections }) {
    const definitions = getSectionDefinitions(activityTypes ?? []);

    return (
        <div className="record-screen__sections">
            {definitions.map((definition) => {
                const values = sections?.[definition.type] ?? {};
                return (
                    <section key={definition.type} className="record-view">
                        <h2>{definition.label}</h2>
                        <dl className="record-view__fields">
                            {definition.fields.map((field) => (
                                <Fragment key={field.name}>
                                    <dt>{field.label}</dt>
                                    <dd>
                                        {field.input === 'questions' ? (
                                            <QuestionsView questions={values.questions} />
                                        ) : (
                                            show(values[field.name])
                                        )}
                                    </dd>
                                </Fragment>
                            ))}
                        </dl>
                    </section>
                );
            })}
        </div>
    );
}

export default RecordSectionsView;
