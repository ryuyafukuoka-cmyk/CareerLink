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
| `Checkbox`        | `label`, `checked`, `onChange`, `disabled`                                                                                                                        | Has its own label                                                                                                      |
| `ConfirmDialog`   | `open`, `title`, `message`, `children`, `confirmLabel`, `cancelLabel`, `variant` (`primary` / `danger`), `loading`, `confirmDisabled`, `onConfirm`, `onCancel`    | Esc and outside click cancel (blocked while `loading`). `children` is for extra content such as the company-name input |
| `Pagination`      | `page`, `totalCount`, `pageSize` (default 10), `onPageChange`, `disabled`                                                                                         | Pass the API values as they are. Shows nothing when `totalCount` is 0                                                  |
| `Loading`         | `message` (default `読み込み中…`), `centered`                                                                                                                     | `centered` for whole-screen loading                                                                                    |
| `EmptyState`      | `message` (default N-006), `children`                                                                                                                             | Pass N-003 to N-006 per screen. `children` is an optional action button                                                |
| `ErrorMessage`    | `error` (ApiError), `message`, `onRetry`, `className`                                                                                                             | `message` wins over `error`                                                                                            |
| `AppLayout`       | none                                                                                                                                                              | Layout route: header, side menu and `<Outlet />`. Wired in `routes/AppRoutes.jsx`                                      |
| `DevRoleSwitcher` | none                                                                                                                                                              | Dev only (mock login). Deleted on 12/21                                                                                |

Helpers: `utils/classNames.js` (`classNames`), `utils/pagination.js` (`getPageItems`).
Shared control look: `styles/controls.css` (`.form-control`).
