import { classNames } from '@/utils/classNames.js';
import './Progress.css';

// Progress bar.
// value / max: plain bar. segments: N steps (value = steps done), e.g. the 5 selection stages.
// label: accessible name (shown above the bar). showValue: show "3/5" or "60%".
// tone: 'primary' | 'success' | 'warning' | 'danger'
function Progress({
    value = 0,
    max = 100,
    segments,
    label,
    showValue = false,
    tone = 'primary',
    className,
}) {
    const total = segments ?? max;
    const current = Math.min(Math.max(value, 0), total);
    const percent = total > 0 ? Math.round((current / total) * 100) : 0;
    const valueText = segments ? `${current}/${total}` : `${percent}%`;

    return (
        <div className={classNames('progress', `progress--${tone}`, className)}>
            {(label || showValue) && (
                <div className="progress__head">
                    {label && <span className="progress__label">{label}</span>}
                    {showValue && <span className="progress__value">{valueText}</span>}
                </div>
            )}
            <div
                className={classNames('progress__track', segments && 'progress__track--segmented')}
                role="progressbar"
                aria-label={label}
                aria-valuemin={0}
                aria-valuemax={total}
                aria-valuenow={current}
                aria-valuetext={valueText}
            >
                {segments ? (
                    Array.from({ length: segments }, (_, index) => (
                        <span
                            key={index}
                            className={classNames(
                                'progress__segment',
                                index < current && 'progress__segment--done',
                            )}
                        />
                    ))
                ) : (
                    <span className="progress__fill" style={{ width: `${percent}%` }} />
                )}
            </div>
        </div>
    );
}

export default Progress;
