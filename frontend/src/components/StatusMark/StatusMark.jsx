import { STAGE_LABELS } from '@shared/definitions';
import { classNames } from '@/utils/classNames.js';
import './StatusMark.css';

// Small status label with a drawn glyph. One look for every status in the app.
// status: a selection stage ('considering' | 'inProgress' | 'declined' | 'rejected' | 'offered')
//         or a record state ('draft' | 'completed').
// label: replaces the default text. size: 'sm' | 'md'.
const RECORD_LABELS = { draft: '下書き', completed: '公開済み' };

const TONES = {
    considering: 'muted',
    inProgress: 'info',
    declined: 'warning',
    rejected: 'danger',
    offered: 'success',
    draft: 'warning',
    completed: 'success',
};

function Glyph({ status }) {
    // 12x12 drawings. Stroke / fill use currentColor, so the tone decides the color.
    switch (status) {
        case 'considering':
            return <circle cx="6" cy="6" r="4.5" fill="none" strokeDasharray="2.4 2" />;
        case 'inProgress':
            return (
                <>
                    <circle cx="6" cy="6" r="4.5" fill="none" />
                    <path d="M6 6 V1.5 A4.5 4.5 0 0 1 6 10.5 Z" stroke="none" />
                </>
            );
        case 'declined':
            return <path d="M2.5 6 H9.5" fill="none" strokeLinecap="round" />;
        case 'rejected':
            return <path d="M3 3 L9 9 M9 3 L3 9" fill="none" strokeLinecap="round" />;
        case 'offered':
            return <path d="M2.5 6.5 L5 9 L9.5 3.5" fill="none" strokeLinecap="round" />;
        case 'draft':
            return <path d="M2 9.5 L2.5 7 L8 1.5 L10.5 4 L5 9.5 Z" fill="none" />;
        case 'completed':
            return <circle cx="6" cy="6" r="4.5" stroke="none" />;
        default:
            return null;
    }
}

function StatusMark({ status, label, size = 'md', className }) {
    const tone = TONES[status] ?? 'muted';
    const text = label ?? STAGE_LABELS[status] ?? RECORD_LABELS[status] ?? status;

    return (
        <span
            className={classNames(
                'status-mark',
                `status-mark--${tone}`,
                `status-mark--${size}`,
                status === 'inProgress' && 'status-mark--live',
                className,
            )}
            data-status={status}
        >
            <svg
                className="status-mark__glyph"
                viewBox="0 0 12 12"
                width="12"
                height="12"
                stroke="currentColor"
                fill="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
            >
                <Glyph status={status} />
            </svg>
            <span className="status-mark__text">{text}</span>
        </span>
    );
}

export default StatusMark;
