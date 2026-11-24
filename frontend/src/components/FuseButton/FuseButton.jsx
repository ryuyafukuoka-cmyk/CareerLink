import { useEffect, useRef, useState } from 'react';
import { classNames } from '@/utils/classNames.js';
import './FuseButton.css';

// Hold-to-confirm button for actions that cannot be undone (company delete, publish).
// Press and hold (mouse, touch, or Space / Enter); a fuse burns across the button and
// onConfirm fires when it reaches the end. Letting go early cancels.
// variant: 'danger' | 'primary'. holdMs: how long to hold. hint: small text next to the label.
function FuseButton({
    children,
    onConfirm,
    holdMs = 1200,
    variant = 'danger',
    hint = '長押し',
    disabled = false,
    className,
    ...rest
}) {
    const [holding, setHolding] = useState(false);
    const timerRef = useRef(null);

    function cancel() {
        clearTimeout(timerRef.current);
        timerRef.current = null;
        setHolding(false);
    }

    function start() {
        if (disabled || timerRef.current) return;
        setHolding(true);
        timerRef.current = setTimeout(() => {
            timerRef.current = null;
            setHolding(false);
            onConfirm?.();
        }, holdMs);
    }

    // Do not fire after the button is gone.
    useEffect(() => () => clearTimeout(timerRef.current), []);

    function isActivateKey(event) {
        return event.key === ' ' || event.key === 'Enter';
    }

    return (
        <button
            {...rest}
            type="button"
            className={classNames('fuse-button', `fuse-button--${variant}`, className)}
            style={{ '--hold-ms': `${holdMs}ms` }}
            data-holding={holding}
            disabled={disabled}
            onPointerDown={(event) => {
                if (event.button === 0) start();
            }}
            onPointerUp={cancel}
            onPointerLeave={cancel}
            onPointerCancel={cancel}
            onContextMenu={(event) => event.preventDefault()}
            onKeyDown={(event) => {
                if (!isActivateKey(event)) return;
                event.preventDefault();
                if (!event.repeat) start();
            }}
            onKeyUp={(event) => {
                if (!isActivateKey(event)) return;
                event.preventDefault();
                cancel();
            }}
            onBlur={cancel}
        >
            <span className="fuse-button__fill" aria-hidden="true" />
            <span className="fuse-button__label">{children}</span>
            {hint && <span className="fuse-button__hint">{hint}</span>}
        </button>
    );
}

export default FuseButton;
