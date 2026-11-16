// Join CSS class names, skipping empty values.
// classNames('button', isBusy && 'button--loading', undefined) -> 'button button--loading'
export function classNames(...names) {
    return names.filter(Boolean).join(' ');
}
