# Hover UI plan (handoff)

Handoff for a new chat. Read this whole file first. Branch: `ui/redesign-v2`. Frontend only (`frontend/src`).

## Working rules (from the owner)

- Speak English. Plain CSS only (no Tailwind). Use tokens from `styles/tokens.css`. Icons: `lucide-react`.
- Do NOT run or test the app (it costs tokens). Do NOT commit or push; the owner does that.
- Every reply: list every modified and new file with its path. Deliver them as a zip (concise name, repo-relative paths inside).
- Format touched files with Prettier (`.prettierrc` in `frontend/`): 4 spaces, single quotes, width 100.
- Every action gets a quiet animation (120-320ms, fade and a few pixels). Never bouncy or blocking. Each CSS file needs a `prefers-reduced-motion` block.
- Schedule context: feature freeze Mon 12/21, delivery 12/23. `src/mocks/` and `backend/mock-server/` are deleted by 12/17. See `mySchedule.md`.

## Already done

| Item                                                                       | Files                                                                                            |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Branched sidebar menu (accordion with branch lines, from React Bits)       | `auth/menuTree.js`, `components/BranchedMenu/`                                                   |
| Persistent breadcrumb in `AppLayout`, built from one route-to-parent table | `routes/breadcrumbs.js`, `components/AppLayout/BreadcrumbContext.js` (`usePageTitle`)            |
| Overlay components                                                         | `components/Overlay/`, `Dialog/`, `Drawer/`, `ConfirmDialog/` (rebuilt on Overlay)               |
| Route-state hook for overlays                                              | `hooks/useOverlay.js` (`useOverlay`, `useOverlayResult`), `utils/overlayStack.js`                |
| Motion tokens and shared enter animation                                   | `styles/tokens.css`, `styles/motion.css`, page fade in `AppLayout`, button press in `Button.css` |
| Gallery demo of Dialog / Drawer / stacked / dirty                          | `gallery/GalleryPage.jsx` (open `/gallery.html`)                                                 |

Component props are in `components/README.md` (section "Hover UIs (overlays) and motion").

## Decision

Every input form becomes a hover UI (an overlay over its parent page). A hover UI has no route of its own and can only be opened from its parent page.

| Form (screen ID)                  | Parent page                                                                                 | Overlay            |
| --------------------------------- | ------------------------------------------------------------------------------------------- | ------------------ |
| Company create (SC-04-03)         | Company list (SC-04-01)                                                                     | Dialog             |
| Company edit (SC-04-03)           | Company detail (SC-04-02)                                                                   | Dialog             |
| Round create (SC-02-06)           | Rounds list (SC-02-04)                                                                      | Dialog             |
| Progress edit (SC-02-07)          | Round detail (SC-02-05)                                                                     | Dialog             |
| Graduation year change (SC-06-05) | User detail (SC-06-02)                                                                      | Dialog             |
| Role change (SC-06-06)            | User detail (SC-06-02)                                                                      | Dialog             |
| Record create / edit (SC-02-03)   | Record list (SC-02-01) or detail (SC-02-02); also "add record" from round detail (SC-02-05) | Drawer (size `lg`) |

Stays a full page:

- First graduation year (SC-00-03) and login (SC-00-01): mandatory, blocks the app, no parent page.
- Search conditions (SC-03-01): results are a separate page. A filter panel on the results page is a different change; leave it.

Open decision: the record form as a drawer is the riskiest (several sections, question list, stacked overlays) and the freeze is close. Plan: migrate the small forms first, judge the drawer on them, then do the record form.

## Rules

1. No route for an overlay. Remove its entry from `routes/screenRoutes.js` (and the matching `PATHS` key if nothing else uses it), and from `routes/breadcrumbs.js` and `auth/menuTree.js` (the "register X" menu links become buttons on the parent page that call `open()`).
2. Open state lives in router location state via `useOverlay(name)`. Back closes the top overlay. A refresh closes everything. Params must be plain data.
3. The breadcrumb stays at the parent level. No crumb for an overlay.
4. Keep the SC-XX-XX IDs in the design docs; they are now overlays (add a note, do not renumber).
5. Forms keep what they have: client + API `details` validation, `useSubmitLock`, `useRetryAfter` (429), "keep input on failure" (E-008), no auto-retry on network failure.
6. Pass `dirty` (form differs from its initial values) so closing asks C-003. Pass `busy={submitting}` so Esc / backdrop / X are blocked while saving.
7. On success: `close(result)`, then the parent reacts with `useOverlayResult(name, handler)` (reload the list, select the new item) and shows the S- message (`Notice` / `toast`).
8. Overlay content must not crash when its params are gone: during the exit animation the overlay shows the last content it had, but the screen should still guard `params` being `null` in its own effects.

## Recipe

```jsx
// Parent page (e.g. CompanyListScreen)
const form = useOverlay('companyCreate');
useOverlayResult('companyCreate', () => reload());

<Button onClick={() => form.open()}>企業を登録</Button>

<Dialog
    open={form.isOpen}
    title="企業を登録"
    dirty={dirty}
    busy={submitting}
    onClose={() => form.close()}
    footer={<>…cancel and save buttons…</>}
>
    <CompanyForm … />   {/* the form body from the old CompanyFormScreen */}
</Dialog>
```

Move the old screen's form into a component in the same `screens/<feature>/` folder (for example `CompanyForm.jsx`), keep its logic, and render it inside the overlay. The old `*Screen.jsx` for that form is deleted. Footer buttons that submit should use `form="<form id>"` or call the submit handler from the parent.

## What gets simpler: `returnTo` and form-state preservation

Record form to "register round" / "register company" no longer navigates away. Open the second overlay on top (`useOverlay('roundCreate')`); when it closes with a result, select the new round or company in the record form, which stayed mounted underneath. Delete: `returnTo` support in SC-02-06 and the company form, and the "preserve form state when navigating" logic in the record form. The unsaved-changes confirmation on route leave is replaced by `dirty`.

## Work breakdown (suggested order)

1. Company: create (list) and edit (detail) dialogs. Smallest, proves the pattern. Add `usePageTitle` to more screens while there if useful.
2. Round create (rounds list) and progress edit (round detail). Keep rules: stage `considering` allows empty application date, others require it; E-215, E-216; admin picks the target student.
3. Admin: graduation year and role dialogs on user detail (role: block self-change, warn on last admin, C-203).
4. Record form drawer (last): section show/hide by activity type tags, interview question list, `validateActivityRecord(input, mode)`, save draft (S-002) / complete with C-001 (S-003), existing draft locks company and round, instructor edits content only, stacked round/company dialogs.
5. Update `routes/screenRoutes.js`, `routes/breadcrumbs.js`, `auth/menuTree.js`, `README`, and `mySchedule.md`. Check that `HomeScreen` cards (from `menus.js`) still point to real pages.
6. Hover previews (HoverCard) on company names, stage badges, truncated labels: later, after the forms, and only with data already on the page.

## Acceptance checks (the owner tests, not the assistant)

- Back closes the top overlay; a refresh shows the parent page with nothing open.
- Opening an overlay URL by hand is impossible (no such route).
- Dirty form: Esc / backdrop / X ask to discard; saving blocks closing.
- Stacked overlays: only the top reacts to Esc / Tab; focus returns to the opener on close.
- 429 countdown, validation errors and "input kept on failure" still work inside overlays.
- Role walkthrough (student / instructor / admin): no form is reachable by a role that may not use it.
- Light and dark themes; reduced motion on.
