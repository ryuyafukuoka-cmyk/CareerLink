import { getMessage } from '@/messages';
import './EmptyState.css';

// "Nothing to show" block. Pass the message for the screen (N-003 to N-006).
// children: an optional action, for example a "Register company" button.
function EmptyState({ message = getMessage('N-006'), children }) {
    return (
        <div className="empty-state">
            <p className="empty-state__message">{message}</p>
            {children && <div className="empty-state__action">{children}</div>}
        </div>
    );
}

export default EmptyState;
