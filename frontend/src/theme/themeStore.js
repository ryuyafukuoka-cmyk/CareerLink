// Theme preference store: 'light' | 'dark' | 'system' (used with useSyncExternalStore via hooks/useTheme.js).
// It writes <html data-theme="light|dark">. public/theme-init.js sets the same attribute before first paint
// and follows OS changes while the preference is 'system'.
const STORAGE_KEY = 'careerlink-theme';
const listeners = new Set();

function readPreference() {
    try {
        const value = localStorage.getItem(STORAGE_KEY);
        return value === 'light' || value === 'dark' ? value : 'system';
    } catch {
        return 'system'; // storage blocked: fall back to following the OS
    }
}

let preference = readPreference();

function applyToDocument() {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = preference === 'system' ? (prefersDark ? 'dark' : 'light') : preference;
    document.documentElement.setAttribute('data-theme', theme);
}

function emit() {
    listeners.forEach((listener) => listener());
}

export function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function getThemePreference() {
    return preference;
}

export function setThemePreference(next) {
    preference = next;
    try {
        if (next === 'system') localStorage.removeItem(STORAGE_KEY);
        else localStorage.setItem(STORAGE_KEY, next);
    } catch {
        // storage blocked: the choice still applies until the page is closed
    }
    applyToDocument();
    emit();
}

// Another tab changed the preference: follow it.
window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) return;
    preference = readPreference();
    applyToDocument();
    emit();
});
