import { classNames } from '@/utils/classNames.js';
import './Loading.css';

// "Loading" indicator. centered: puts it in the middle of the page area (for whole-screen loading).
function Loading({ message = '読み込み中…', centered = false }) {
    return (
        <div
            className={classNames('loading', centered && 'loading--centered')}
            role="status"
            aria-live="polite"
        >
            <span className="loading__lattice" aria-hidden="true">
                {Array.from({ length: 9 }, (_, index) => (
                    <span
                        key={index}
                        className="loading__cell"
                        style={{ '--step': (index % 3) + Math.floor(index / 3) }}
                    />
                ))}
            </span>
            <span>{message}</span>
        </div>
    );
}

export default Loading;
