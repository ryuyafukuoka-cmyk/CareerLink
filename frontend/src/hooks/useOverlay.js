import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// Hover UIs (dialogs / drawers) are opened from their parent page and have no URL of their own.
// Which ones are open is kept in the router's location state, so:
//   - the browser Back button closes the top one,
//   - a refresh (or a pasted link) lands on the parent page with nothing open,
//   - only the page that renders the overlay can open it.
//
//   const roundForm = useOverlay('roundCreate');
//   <Button onClick={() => roundForm.open({ companyId })}>応募回を登録</Button>
//   <Dialog open={roundForm.isOpen} onClose={() => roundForm.close()} ...>
//
// `open(params)`: params must be plain data (it is stored in the history entry).
// `close(result)`: pass a result to tell the parent (see useOverlayResult).
// open / close are new functions every render: do not put them in effect dependency lists.

// Changes on every page load. State written by an earlier load is ignored, which is what
// makes a refresh close everything.
const SESSION = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const resultListeners = new Map(); // overlay name -> Set of handlers

function getOpenOverlays(state) {
    return state?.overlaySession === SESSION && Array.isArray(state.overlays) ? state.overlays : [];
}

export function useOverlay(name) {
    const location = useLocation();
    const navigate = useNavigate();
    const overlays = getOpenOverlays(location.state);
    const entry = overlays.find((item) => item.name === name);
    const here = { pathname: location.pathname, search: location.search };

    function open(params = null) {
        const others = overlays.filter((item) => item.name !== name);
        // A new history entry on the same URL: Back closes it.
        navigate(here, {
            state: {
                ...location.state,
                overlaySession: SESSION,
                overlays: [...others, { name, params }],
            },
        });
    }

    function close(result) {
        if (result !== undefined) {
            resultListeners.get(name)?.forEach((handler) => handler(result));
        }
        if (!entry) return;
        const isTop = overlays[overlays.length - 1]?.name === name;
        if (isTop && location.key !== 'default') {
            navigate(-1); // back to the entry the overlay was opened from
            return;
        }
        navigate(here, {
            replace: true,
            state: { ...location.state, overlays: overlays.filter((item) => item.name !== name) },
        });
    }

    return { isOpen: Boolean(entry), params: entry?.params ?? null, open, close };
}

/**
 * Run a handler in the parent when an overlay is closed with a result,
 * for example reload the list, or select the company that was just created.
 * @param {string} name overlay name
 * @param {(result: unknown) => void} handler
 */
export function useOverlayResult(name, handler) {
    const handlerRef = useRef(handler);
    useEffect(() => {
        handlerRef.current = handler;
    });

    useEffect(() => {
        const listener = (result) => handlerRef.current(result);
        const listeners = resultListeners.get(name) ?? new Set();
        listeners.add(listener);
        resultListeners.set(name, listeners);
        return () => listeners.delete(listener);
    }, [name]);
}
