import { ROLE_LABELS, USER_STATUS_LABELS } from '@shared/definitions';
import { classNames } from '@/utils/classNames.js';
import './Badge.css';

// Small label for a role, a status or a count.
// tone: neutral | primary | info | success | warning | danger. size: sm | md.
// Selection stages and draft/completed use StatusMark; Badge is for everything else.
function Badge({ tone = 'neutral', size = 'md', children, className }) {
    return (
        <span className={classNames('badge', `badge--${tone}`, `badge--${size}`, className)}>
            {children}
        </span>
    );
}

const ROLE_TONES = { student: 'info', instructor: 'primary', admin: 'danger' };
const USER_STATUS_TONES = { active: 'success', inactive: 'neutral' };

// role: 'student' | 'instructor' | 'admin'
export function RoleBadge({ role, size, className }) {
    return (
        <Badge tone={ROLE_TONES[role] ?? 'neutral'} size={size} className={className}>
            {ROLE_LABELS[role] ?? role}
        </Badge>
    );
}

// status: 'active' | 'inactive'
export function UserStatusBadge({ status, size, className }) {
    return (
        <Badge tone={USER_STATUS_TONES[status] ?? 'neutral'} size={size} className={className}>
            {USER_STATUS_LABELS[status] ?? status}
        </Badge>
    );
}

export default Badge;
