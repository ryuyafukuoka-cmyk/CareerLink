import { useSyncExternalStore } from 'react';
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';
import { classNames } from '@/utils/classNames.js';
import { dismissToast, getToasts, removeToast, subscribe } from './toastStore.js';
import './Toast.css';

const ICONS = { success: CircleCheck, error: CircleAlert, info: Info };

function ToastItem({ item }) {
    const Icon = ICONS[item.type];
    return (
        <li
            className={classNames('toast', `toast--${item.type}`, item.leaving && 'toast--leaving')}
            role={item.type === 'error' ? 'alert' : 'status'}
            onAnimationEnd={(event) => {
                // Only the toast's own enter / leave animation, not the timer bar's.
                if (event.target === event.currentTarget && item.leaving) removeToast(item.id);
            }}
        >
            <Icon className="toast__icon" size={20} aria-hidden="true" />
            <p className="toast__message">{item.message}</p>
            <button
                type="button"
                className="toast__close"
                aria-label="閉じる"
                onClick={() => dismissToast(item.id)}
            >
                <X size={16} aria-hidden="true" />
            </button>
            {!item.leaving && (
                <span
                    className="toast__timer"
                    style={{ '--toast-duration': `${item.duration}ms` }}
                    onAnimationEnd={(event) => {
                        event.stopPropagation();
                        dismissToast(item.id);
                    }}
                    aria-hidden="true"
                />
            )}
        </li>
    );
}

// Renders the toast stack. Mounted automatically by toast.js; do not place it in a page.
function Toaster() {
    const toasts = useSyncExternalStore(subscribe, getToasts, getToasts);
    return (
        <ol className="toaster" aria-label="通知">
            {toasts.map((item) => (
                <ToastItem key={item.id} item={item} />
            ))}
        </ol>
    );
}

export default Toaster;
