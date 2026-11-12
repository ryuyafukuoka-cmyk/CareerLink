# components

Shared UI components used across screens.

## Conventions

- One folder per component: `Button/Button.jsx` + `Button/Button.css`.
- Component files and folders: `PascalCase`. Hooks: `useSomething.js`. Utilities: `camelCase.js`.
- Styles are plain CSS. Use the variables from `src/styles/tokens.css`, never hard-coded colors or sizes.
- CSS class names: `block__element--modifier`, for example `button--danger`, `form-field__error`.
- Components receive data through props. They do not call the API directly (screens and hooks do).
- Screen-specific components live in that screen's folder under `screens/`, not here.
