# Theme integration: 5 small edits to existing files (paths relative to `frontend/`)

New files in the zip need no edits. Existing files below get a snippet only.
Gallery files (`gallery.html`, `src/gallery/*`) replace the earlier versions.
`src/styles/theme.css` is a full replacement (same palette values; selectors changed, see colors.css header).

## 1. `index.html` — add one line inside `<head>` (before the page paints)

```html
<script src="/theme-init.js"></script>
```

## 2. `src/index.css` — replace the import list with

```css
@import './styles/theme.css';
@import './styles/tokens.css';
@import './styles/colors.css';
@import './styles/reset.css';
@import './styles/base.css';
@import './styles/controls.css';
```

(`colors.css` must come after `tokens.css`. Afterwards the `--color-*` and `--shadow-*` lines in `tokens.css` are dead and can be deleted.)

## 3. `src/components/ConfirmDialog/ConfirmDialog.css` line 9 (the only hard-coded color in the app)

```css
background: var(--color-overlay);
```

## 4. `src/components/AppLayout/AppLayout.jsx` — toggle in the header

```jsx
import ThemeToggle from '@/components/ThemeToggle/ThemeToggle.jsx';
// inside <div className="app-layout__user">, just before the logout <Button>:
<ThemeToggle />;
```

## 5. Login screen (`SC-00-01`) — same import, place `<ThemeToggle />` in a top corner

Needed because logged-out users never see the header.

## Check

Open `/gallery.html`, flip the toggle, look at the Colors section in both themes.
Then walk the real screens once in dark mode (login, company list, record form, dialogs).

## components/README.md — add this row

| ThemeToggle | `showSystem`, `className` | Light / dark / system switch. Stored in `localStorage` (`careerlink-theme`). Shown theme is `<html data-theme>`. Hooks: `useTheme()` returns `{ preference, setPreference }`. |
