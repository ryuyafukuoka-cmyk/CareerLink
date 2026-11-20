import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import Toaster from './Toaster.jsx';
import { addToast, dismissToast } from './toastStore.js';

// Public API. Call from anywhere (handlers, hooks); no provider needed.
//   toast.success('企業を登録しました。')
//   toast.error('保存できませんでした。', { duration: 10000 })
// The Toaster mounts itself on the first call.
let mounted = false;

function ensureMounted() {
    if (mounted || typeof document === 'undefined') return;
    mounted = true;
    const container = document.createElement('div');
    container.id = 'toaster-root';
    document.body.appendChild(container);
    createRoot(container).render(createElement(Toaster));
}

function show(type, message, options = {}) {
    ensureMounted();
    return addToast({ type, message, duration: options.duration });
}

export const toast = {
    success: (message, options) => show('success', message, options),
    error: (message, options) => show('error', message, options),
    info: (message, options) => show('info', message, options),
    dismiss: (id) => dismissToast(id),
};
