# components

Shared UI components used across screens.

## Conventions

- One folder per component: `Button/Button.jsx` + `Button/Button.css`.
- Component files and folders: `PascalCase`. Hooks: `useSomething.js`. Utilities: `camelCase.js`.
- Styles are plain CSS. Use the variables from `src/styles/tokens.css`, never hard-coded colors or sizes.
- CSS class names: `block__element--modifier`, for example `button--danger`, `form-field__error`.
- Components receive data through props. They do not call the API directly (screens and hooks do).
- Screen-specific components live in that screen's folder under `screens/`, not here.

## Component list and props

Forms: put inputs inside `FormField` and they get their id, required mark and error text automatically.
Input components take the native props (`value`, `onChange`, `disabled`, `name`, ...) and pass them to the element.

| Component         | Props                                                                                                                                                             | Notes                                                                                                                  |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `Button`          | `variant` (`primary` / `secondary` / `danger`, default `primary`), `type` (default `button`), `loading`, `loadingText` (default `保存中…`), `disabled`, `onClick` | `loading` disables the button, so it also stops double sends                                                           |
| `FormField`       | `label`, `required`, `error` (string), `hint`, `group`                                                                                                            | `group` renders a fieldset, for checkbox or radio lists                                                                |
| `TextInput`       | `type` (default `text`), `value`, `onChange`                                                                                                                      | Use inside `FormField`                                                                                                 |
| `TextArea`        | `rows` (default 4), `value`, `onChange`                                                                                                                           | Use inside `FormField`                                                                                                 |
| `Select`          | `options` (`[{ value, label, disabled? }]`), `placeholder` (empty first option), `value`, `onChange`                                                              | Use inside `FormField`                                                                                                 |
| `RegionSelect`    | `value` (region ID string[]), `onChange` (new array), `disabled`                                                                                                  | Areas (48-55) and prefectures (1-47) in one box. Independent values, no auto-expansion. Used by company search / form  |
| `Checkbox`        | `label`, `checked`, `onChange`, `disabled`                                                                                                                        | Has its own label                                                                                                      |
| `ConfirmDialog`   | `open`, `title`, `message`, `children`, `confirmLabel`, `cancelLabel`, `variant` (`primary` / `danger`), `loading`, `confirmDisabled`, `onConfirm`, `onCancel`    | Esc and outside click cancel (blocked while `loading`). `children` is for extra content such as the company-name input |
| `Pagination`      | `page`, `totalCount`, `pageSize` (default 10), `onPageChange`, `disabled`                                                                                         | Pass the API values as they are. Shows nothing when `totalCount` is 0                                                  |
| `Notice`          | `message`, `tone` (`success` / `error`, default `success`), `className`                                                                                           | Result message at the top of a screen (for example S-101). Pass text from `getMessage`                                 |
| `Loading`         | `message` (default `読み込み中…`), `centered`                                                                                                                     | `centered` for whole-screen loading                                                                                    |
| `EmptyState`      | `message` (default N-006), `children`                                                                                                                             | Pass N-003 to N-006 per screen. `children` is an optional action button                                                |
| `ErrorMessage`    | `error` (ApiError), `message`, `onRetry`, `className`                                                                                                             | `message` wins over `error`                                                                                            |
| `AppLayout`       | none                                                                                                                                                              | Layout route: header, side menu and `<Outlet />`. Wired in `routes/AppRoutes.jsx`                                      |
| `DevRoleSwitcher` | none                                                                                                                                                              | Dev only (mock login). Deleted on 12/21                                                                                |

Helpers: `utils/classNames.js` (`classNames`), `utils/pagination.js` (`getPageItems`), `utils/date.js` (`isRealDate`, `formatDateTime`).
Hooks: `hooks/useSubmitLock.js` (`run`, `submitting`: blocks double sends), `hooks/useRetryAfter.js` (`start(seconds)`, `secondsLeft`: 429 countdown, text E-009).
Shared control look: `styles/controls.css` (`.form-control`).

## Hover UIs (overlays) and motion

Forms open as a dialog or drawer over their parent page (decision and plan: `docs/hover-ui.md`).

| Component / hook      | Props / API                                                                                                                              | Notes                                                                                                                                                |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Overlay`             | `open`, `variant` (`dialog` / `drawer`), `size` (`sm` / `md` / `lg`), `title`, `onClose`, `dirty`, `busy`, `hideClose`, `footer`, `role` | Base. Portal, backdrop, enter/exit animation, focus trap, Esc, scroll lock. Stack-aware: only the top one reacts to the keyboard, the ones below dim |
| `Dialog`              | same as `Overlay`                                                                                                                        | Centered card. Use for small and medium forms                                                                                                        |
| `Drawer`              | same as `Overlay`                                                                                                                        | Full-height side panel. Use for the record form                                                                                                      |
| `ConfirmDialog`       | unchanged                                                                                                                                | Now built on `Overlay`                                                                                                                               |
| `hooks/useOverlay.js` | `useOverlay(name)` returns `{ isOpen, params, open(params), close(result) }`                                                             | Open state lives in router location state: Back closes it, a refresh closes everything, only the parent page can open it                             |
| `hooks/useOverlay.js` | `useOverlayResult(name, handler)`                                                                                                        | Parent reacts when the overlay closes with a result (reload a list, select the new item)                                                             |

`dirty` makes closing ask C-003 first. `busy` (use `submitting` from `useSubmitLock`) blocks closing while saving.

Motion: tokens `--transition-fast` / `-base` / `-slow`, `--ease-out` / `--ease-in` in `styles/tokens.css`; shared enter animation in `styles/motion.css`.
Every new component animates its actions quietly (120-320ms, fade and a few pixels of movement) and has its own `prefers-reduced-motion` block.
