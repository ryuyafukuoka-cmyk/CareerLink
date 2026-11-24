// Which overlays (dialogs / drawers) are open, bottom to top. Overlay uses it to know
// which one is on top (only that one reacts to Esc / Tab).
// Page scroll is locked separately: from the moment an overlay mounts until its exit animation
// has ended, so the scrollbar does not pop back (and shift the page) while it is still fading out.
let stack = [];
const locks = new Set();
const listeners = new Set();
let lockedPadding = null;

function syncScrollLock() {
    if (typeof document === 'undefined') return;
    const { body, documentElement } = document;
    if (locks.size > 0 && lockedPadding === null) {
        // Keep the page from shifting when the scrollbar disappears.
        const scrollbar = window.innerWidth - documentElement.clientWidth;
        lockedPadding = body.style.paddingRight;
        body.style.overflow = 'hidden';
        if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
    } else if (locks.size === 0 && lockedPadding !== null) {
        body.style.overflow = '';
        body.style.paddingRight = lockedPadding;
        lockedPadding = null;
    }
}

function emit() {
    listeners.forEach((listener) => listener());
}

export const overlayStack = {
    push(id) {
        stack = [...stack, id];
        emit();
    },
    remove(id) {
        stack = stack.filter((item) => item !== id);
        emit();
    },
    lock(id) {
        locks.add(id);
        syncScrollLock();
    },
    unlock(id) {
        locks.delete(id);
        syncScrollLock();
    },
    subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
    },
    getSnapshot() {
        return stack;
    },
};
