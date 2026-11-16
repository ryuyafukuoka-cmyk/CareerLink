import { classNames } from '@/utils/classNames.js';
import './Button.css';

// variant: 'primary' | 'secondary' | 'danger'
// loading: disables the button and shows loadingText (use while saving, to block double sends).
function Button({
    variant = 'primary',
    type = 'button',
    loading = false,
    loadingText = '保存中…',
    disabled = false,
    className,
    children,
    ...rest
}) {
    return (
        <button
            {...rest}
            type={type}
            className={classNames(
                'button',
                `button--${variant}`,
                loading && 'button--loading',
                className,
            )}
            disabled={disabled || loading}
            aria-busy={loading || undefined}
        >
            {loading ? loadingText : children}
        </button>
    );
}

export default Button;
