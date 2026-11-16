import { classNames } from '@/utils/classNames.js';
import './Notice.css';

// Short result message at the top of a screen, for example "企業を登録しました。".
// tone: 'success' | 'error'. Pass the text (use getMessage with an S- / E- ID).
function Notice({ message, tone = 'success', className }) {
    return (
        <p className={classNames('notice', `notice--${tone}`, className)} role="status">
            {message}
        </p>
    );
}

export default Notice;
