// Tiny external store for toasts (used with useSyncExternalStore). The array is replaced, never mutated.
const MAX_VISIBLE = 4;
const listeners = new Set();
let toasts = [];
let nextId = 1;

function emit() {
    listeners.forEach((listener) => listener());
}

export function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function getToasts() {
    return toasts;
}

/** Add a toast. An identical visible toast is not added twice. Returns the toast id. */
export function addToast({ type, message, duration }) {
    const duplicate = toasts.find(
        (item) => !item.leaving && item.type === type && item.message === message,
    );
    if (duplicate) return duplicate.id;

    const id = nextId++;
    let next = [
        ...toasts,
        {
            id,
            type,
            message,
            duration: duration ?? (type === 'error' ? 8000 : 4000),
            leaving: false,
        },
    ];
    // Over the limit: start closing the oldest visible ones.
    let overflow = next.filter((item) => !item.leaving).length - MAX_VISIBLE;
    if (overflow > 0) {
        next = next.map((item) => {
            if (overflow > 0 && !item.leaving) {
                overflow -= 1;
                return { ...item, leaving: true };
            }
            return item;
        });
    }
    toasts = next;
    emit();
    return id;
}

/** Start the leave animation. The toast is removed when that animation ends. No id = all. */
export function dismissToast(id) {
    toasts = toasts.map((item) =>
        id === undefined || item.id === id ? { ...item, leaving: true } : item,
    );
    emit();
}

export function removeToast(id) {
    toasts = toasts.filter((item) => item.id !== id);
    emit();
}
