import { useRef } from 'react';
import { Link, useHref } from 'react-router-dom';
import { useLinkMenu } from '@/components/LinkMenu/useLinkMenu.jsx';
import { classNames } from '@/utils/classNames.js';
import '@/styles/textLink.css';

// In-app link (react-router) with the animated underline.
// Left click goes straight to the page (same tab).
// Right click shows our own menu (the full URL, 新しいタブで開く, リンクをコピー).
// For links that leave the app use ExternalLink (it also shows a hover hint with the real URL).
function TextLink({ to, className, children, onContextMenu, ...rest }) {
    const linkRef = useRef(null);
    const path = useHref(to);
    const url = new URL(path, window.location.origin).href;
    const { onContextMenu: openMenu, menu } = useLinkMenu({ url, linkRef });

    return (
        <>
            <Link
                ref={linkRef}
                to={to}
                className={classNames('text-link', className)}
                {...rest}
                onContextMenu={(event) => {
                    onContextMenu?.(event);
                    if (!event.defaultPrevented) openMenu(event);
                }}
            >
                {children}
            </Link>
            {menu}
        </>
    );
}

export default TextLink;
