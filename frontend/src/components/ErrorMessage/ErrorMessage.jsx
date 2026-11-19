import Button from '@/components/Button/Button.jsx';
import { getErrorMessage, getMessage } from '@/messages';
import { classNames } from '@/utils/classNames.js';
import './ErrorMessage.css';

// Error box. Pass `error` (an ApiError) or a ready `message`. onRetry adds a retry button.
function ErrorMessage({ error, message, onRetry, className }) {
    const text = message ?? (error ? getErrorMessage(error) : getMessage('E-006'));

    return (
        <div className={classNames('error-message', className)} role="alert">
            <p className="error-message__text">{text}</p>
            {onRetry && (
                <Button variant="secondary" onClick={onRetry}>
                    もう一度読み込む
                </Button>
            )}
        </div>
    );
}

export default ErrorMessage;
