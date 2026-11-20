import { useSyncExternalStore } from 'react';
import { getThemePreference, setThemePreference, subscribe } from '@/theme/themeStore.js';

// { preference: 'light' | 'dark' | 'system', setPreference(next) }
// The theme actually shown is on document.documentElement.dataset.theme.
export function useTheme() {
    const preference = useSyncExternalStore(subscribe, getThemePreference, getThemePreference);
    return { preference, setPreference: setThemePreference };
}
