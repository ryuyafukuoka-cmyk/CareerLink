import { STAGE_LABELS } from '@shared/definitions';
import { classNames } from '@/utils/classNames.js';
import './StageTracker.css';

// The selection progress of one round as three stretchy bars:
//   considering -> inProgress -> result (offered / rejected / declined).
// The current bar is wider and springs when the stage changes.
// stage: a stage value. Read-only display; change the stage with a Select (SC-02-07).
const OUTCOME_TONES = { offered: 'success', rejected: 'danger', declined: 'warning' };

function getStepIndex(stage) {
    if (stage === 'considering') return 0;
    if (stage === 'inProgress') return 1;
    return 2;
}

function StageTracker({ stage, className }) {
    const current = getStepIndex(stage);
    const outcomeTone = OUTCOME_TONES[stage];
    const steps = [
        { key: 'considering', label: STAGE_LABELS.considering },
        { key: 'inProgress', label: STAGE_LABELS.inProgress },
        { key: 'result', label: outcomeTone ? STAGE_LABELS[stage] : '結果' },
    ];

    return (
        <ol
            className={classNames('stage-tracker', className)}
            aria-label={`選考段階：${STAGE_LABELS[stage] ?? stage}`}
        >
            {steps.map((step, index) => (
                <li
                    key={step.key}
                    className={classNames(
                        'stage-tracker__step',
                        index <= current && 'stage-tracker__step--done',
                        index === current && 'stage-tracker__step--current',
                        index === 2 && outcomeTone && `stage-tracker__step--${outcomeTone}`,
                    )}
                    aria-current={index === current ? 'step' : undefined}
                >
                    <span className="stage-tracker__bar" aria-hidden="true" />
                    <span className="stage-tracker__label">{step.label}</span>
                </li>
            ))}
        </ol>
    );
}

export default StageTracker;
