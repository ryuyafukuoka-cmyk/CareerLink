import { Link } from 'react-router-dom';
import { classNames } from '@/utils/classNames.js';
import '@/styles/textLink.css';

// In-app link (react-router) with the animated underline.
// Clicking goes straight to the page. For links that leave the app use ExternalLink.
function TextLink({ to, className, children, ...rest }) {
    return (
        <Link to={to} className={classNames('text-link', className)} {...rest}>
            {children}
        </Link>
    );
}

export default TextLink;
