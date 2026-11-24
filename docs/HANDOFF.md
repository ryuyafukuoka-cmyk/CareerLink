# CareerLink frontend: UI redesign hand-off

Branch `ui/redesign-v2` (base commit `f672109`). Frontend only (`frontend/src`). Nothing here is committed: the owner commits and pushes. **Nothing has been run or tested** (no lint, no tests, no browser), so the first job of the next chat is to list what to check, not to assume it works.

Detailed plan for the form migration: `docs/hover-ui.md`. Component props: `frontend/src/components/README.md`.

## Working rules (from the owner)

- Speak English. Plain CSS only (no Tailwind). Tokens from `styles/tokens.css`. Icons from `lucide-react`.
- Do NOT run or test the app (token cost). Do NOT commit or push.
- Every reply: list every modified and new file with its repo path, delivered as a zip (concise name, repo-relative paths inside).
- Format touched files with Prettier (`frontend/.prettierrc`: 4 spaces, single quotes, width 100). `npx prettier@3 --write <files>` works without installing.
- Every action gets a quiet animation (120-320ms, fade and a few pixels of movement). Never bouncy or blocking. Each CSS file has its own `prefers-reduced-motion` block.
- Schedule: feature freeze Mon 12/21, delivery 12/23. `src/mocks/` and `backend/mock-server/` are deleted by 12/17 (`mySchedule.md`).

## Done in this session

| Area                      | What                                                                                                                                                                                                           | Files                                                                                      |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Sidebar                   | Branched (accordion) menu adapted from React Bits: router links, lucide icons, token colors, active branch drawn as a line                                                                                     | `auth/menuTree.js`, `components/BranchedMenu/`                                             |
| Breadcrumb                | Always shown above the page, built from one route-to-parent table. `usePageTitle(label)` replaces the last label with real data (wired only in `CompanyDetailScreen`)                                          | `routes/breadcrumbs.js`, `components/AppLayout/BreadcrumbContext.js`, `AppLayout.jsx/.css` |
| Hover UI components       | `Overlay` (base), `Dialog`, `Drawer`; `ConfirmDialog` rebuilt on `Overlay`. Focus trap, Esc, stacking, `dirty` (asks C-003 before closing), `busy` (blocks closing while saving)                               | `components/Overlay/`, `Dialog/`, `Drawer/`, `ConfirmDialog/`, `utils/overlayStack.js`     |
| Hover UI routing          | `useOverlay(name)`: open state lives in router location state (Back closes it, refresh closes everything, only the parent page can open it). `useOverlayResult(name, handler)`                                 | `hooks/useOverlay.js`                                                                      |
| Motion                    | Duration and easing tokens, shared enter animation (page, notice, field error), button press                                                                                                                   | `styles/tokens.css`, `styles/motion.css`, `components/Button/Button.css`                   |
| Theme fix                 | `index.css` never imported `theme.css` / `colors.css`, so dark mode did not exist. Now imported in the documented order. Theme selectors changed to `[data-theme=...]` so a nested wrapper can force a theme   | `index.css`, `styles/theme.css`, `styles/colors.css`                                       |
| Borders                   | Softer: mixed from text and surface (14% normal, 36% / 34% strong) instead of fixed palette steps                                                                                                              | `styles/colors.css`                                                                        |
| Fonts                     | Google Fonts `@import` (first line of `index.css`). Default **Zen Maru Gothic**. Noto Sans JP and Klee One kept for comparison                                                                                 | `index.css`, `styles/tokens.css`                                                           |
| Gallery (`/gallery.html`) | Font switcher, light / dark side by side (real admin menu, buttons, notices, field error), Dialog / Drawer / stacked / dirty / ConfirmDialog demo. Starts at `/records/new` so the menu shows an active branch | `gallery/`                                                                                 |
| Docs                      | Overlay and motion section in the components README; `docs/hover-ui.md`                                                                                                                                        | `components/README.md`, `docs/`                                                            |

## Gotchas learned (read before editing)

1. **Do not combine `--transition-*` tokens with another easing in `animation:`.** They are shorthands (`200ms ease`), so `animation: x var(--transition-base) var(--ease-out)` is invalid and the browser drops the whole declaration. Use `--duration-fast/base/slow` with `--ease-out/--ease-in` for animations; `--transition-*` for `transition:` only.
2. **Scroll lock must outlive the exit animation.** It follows the mounted overlay (`overlayStack.lock/unlock`), not the `open` flag, otherwise the scrollbar returns early and the page jumps.
3. **Reduced motion:** keep a 1ms animation (not `none`) on overlay panels so `animationend` still fires and the overlay unmounts. A 400ms timer is the safety net.
4. **Open animations use `backwards` fill, exit animations `forwards`**, so the "covered" state (`transform` / `opacity` on lower overlays) can take over after the enter animation.
5. **Overlay content during exit:** `Overlay` keeps the last title / footer / children while closing, because a parent may clear its params the instant it closes. Screens should still guard `params === null` in their own effects.
6. **`useOverlay` `open` / `close` are new functions each render.** Do not put them in effect dependency lists. Params must be structured-cloneable (plain data); results are passed through `close(result)` and `useOverlayResult`, not through history state.
7. **Keyed page wrapper:** `AppLayout` renders `<div key={pathname} className="app-layout__page">` for the page fade. It remounts a screen when only its path params change. If a screen misbehaves on that, look here first.
8. **React hooks lint (v7):** set state during render for derived "present / frozen" state, not in effects. `ResizeObserver` is guarded for jsdom.
9. **Klee One has only weights 400 and 600**; medium and bold both render at 600.
10. **Google Fonts needs `fonts.googleapis.com` and `fonts.gstatic.com` reachable.** If the school network blocks them the app falls back to Hiragino / Yu Gothic UI / Meiryo silently. Check on a real school PC. Fallback plan: self-host with `@fontsource/*` (tried and reverted; see git history of this session's notes).
11. Softer borders lower contrast of form control borders below WCAG's 3:1 guideline. The focus ring stays strong. Raise the percentages in `colors.css` if inputs feel too faint.

## First things to verify (owner will test; list these to them)

- `npm run lint`, `npm run format:check`, `npm test` (`App.test.jsx` renders the layout; the menu and page wrapper changed).
- `/gallery.html`: toggle light / dark; side-by-side frames; font switcher; Dialog / Drawer open and close (fade, no page jump); Esc with typed text asks to discard; stacked dialog dims the drawer; reduced motion on.
- App: sidebar groups open / close and mark the active page for all three roles (dev role switcher); breadcrumb on every screen, including search detail going back to the exact results page; delete dialogs in admin and company screens still work (now on `Overlay`).
- Dark mode across all real screens (first time the real palette is active). Light mode may look different from before (the old blue in `tokens.css` is overridden by the green palette).

## Not done / next steps (suggested order)

1. **Wire `ThemeToggle` into the `AppLayout` header and the login screen, and mount `Toaster` once** (`App.jsx` or `AppLayout`). Both are tiny; the toggle lets the owner review dark mode on every screen. Then use `toast()` for success messages instead of inline `Notice` where it fits.
2. **Migrate forms to overlays** per `docs/hover-ui.md` (company, round, progress, admin year / role, then the record form as a drawer). Remove the `returnTo` and form-state-preservation logic. Update `routes/screenRoutes.js`, `routes/breadcrumbs.js`, `auth/menuTree.js`, `mySchedule.md`.
3. **Use the unused components inside those forms:** `Combobox` (company select), `DatePicker` (+ `Calendar`) for dates, `RadioGroup` (stage, activity types), `InputGroup` (website URL), `DropdownMenu` (row actions), `HoverCard` (company / stage previews, only with data already on the page), `Progress` (record completion).
4. `usePageTitle` on record, round and user screens (one line each).
5. Add the components missing from the gallery: `AppLayout`, `Checkbox`, `EmptyState`, `ErrorMessage`, `Loading`, `Pagination`, `RegionSelect`, `Select`, `TextArea`.

## Component usage audit (screens, routes, other components)

Used: `Button`, `FormField`, `TextInput`, `Select`, `TextArea`, `Checkbox`, `Notice`, `EmptyState`, `ErrorMessage`, `Loading`, `Pagination`, `RegionSelect`, `ConfirmDialog`, `AppLayout`, `Breadcrumb`, `BranchedMenu`.
Built but unused in the app (gallery only): `ThemeToggle`, `Toast` / `Toaster`, `Dialog`, `Drawer`, `Combobox`, `DatePicker`, `RadioGroup`, `DropdownMenu`, `HoverCard`, `InputGroup`, `Progress`.

## Open questions for the owner

- Record form as a drawer vs. a full page (riskiest form, freeze is close). Suggested: migrate the small forms first, then decide.
- Keep the Noto Sans JP and Klee One options in code, or remove them before the freeze? (Currently kept for comparison.)
- Is Google Fonts acceptable on the school network, or should fonts be self-hosted?
