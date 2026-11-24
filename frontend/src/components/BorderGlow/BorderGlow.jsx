import { classNames } from '@/utils/classNames.js';
import './BorderGlow.css';

// A light runs around the border. Use it ONCE per screen to point at the one thing that
// matters (latest round, main call to action). Wrap a card or a button.
// as: tag to render ('div' by default). active: turn the light off without removing the wrapper.
function BorderGlow({ as: Tag = 'div', active = true, className, children, ...rest }) {
    return (
        <Tag
            {...rest}
            className={classNames('border-glow', active && 'border-glow--on', className)}
        >
            {children}
        </Tag>
    );
}

export default BorderGlow;
