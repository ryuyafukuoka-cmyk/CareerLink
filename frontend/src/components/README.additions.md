# components/README.md に追記する行（props 一覧）

Import with `import X from '@/components/X/X.jsx'`. Toast is the exception (see below).

| Component    | Props                                                                                                                      | Notes                                                                                                                                                         |
| ------------ | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Toast        | `toast.success(msg, {duration?})` / `.error` / `.info` / `.dismiss(id?)`                                                   | `import { toast } from '@/components/Toast/toast.js'`. No provider; mounts itself. Max 4 shown, same message not duplicated. Hover or focus pauses the timer. |
| Combobox     | `options [{value,label,disabled?}]`, `value`, `onChange(value)`, `placeholder`, `emptyText`, `clearable`, `disabled`       | Type to filter. `onChange` gets the value, not an event. `options` must include the selected value. Works inside `FormField`.                                 |
| Calendar     | `value`, `onSelect(dateString)`, `min`, `max`, `showToday`, `onClear`, `autoFocus`                                         | Dates are `YYYY/MM/DD`. Arrows move by day/week, PageUp/PageDown by month (Shift = year), Home/End.                                                           |
| DatePicker   | `value`, `onChange(valueString)`, `min`, `max`, `placeholder`, `disabled`                                                  | Typed input + calendar popup. `onChange` gets a string, not an event. Text is tidied on blur only. Works inside `FormField`.                                  |
| Breadcrumb   | `items [{label,to?}]`                                                                                                      | Last item is the current page. Needs a Router.                                                                                                                |
| Progress     | `value`, `max`, `segments`, `label`, `showValue`, `tone`                                                                   | `segments={5}` + `value` = steps done (selection stages). `tone`: primary / success / warning / danger.                                                       |
| DropdownMenu | `items [{label,onSelect?,to?,icon?,danger?,disabled?,separator?}]`, `align`, `triggerLabel`, `children`                    | `children` is the trigger content. Set `triggerLabel` when it is icon-only. Needs a Router when `to` is used.                                                 |
| HoverCard    | `content`, `openDelay`, `closeDelay`, `align`, `children`                                                                  | Extra info only. Child should be focusable (link / button).                                                                                                   |
| InputGroup   | `start`, `end`, `disabled`, `children`                                                                                     | Wrap one `TextInput`. Turns red inside a `FormField` with an error.                                                                                           |
| RadioGroup   | `options [{value,label,description?,disabled?}]`, `value`, `onChange(value)`, `name`, `variant`, `orientation`, `disabled` | `variant`: default / card. Use inside `<FormField group label="…">`. `onChange` gets the value.                                                               |

Shared pieces: `styles/popover.css` (floating panel surface), `hooks/useClickOutside.js`, `utils/calendar.js`.

## Signature components

- `StatusMark`: `status` (a stage value, or `draft` / `completed`), `label?`, `size` (`sm` / `md`). One look for every status. `inProgress` has a breathing ring.
- `StageTracker`: `stage`. Three stretchy bars (considering, in progress, result). Display only; the stage itself is changed with a Select.
- `FuseButton`: `onConfirm`, `holdMs` (1200), `variant` (`danger` / `primary`), `hint`, `disabled`. Hold to confirm (mouse, touch, Space / Enter). For irreversible actions only.
- `AnimatedNumber`: `value` (integer), `duration`, `locale`. Counts to the value; screen readers read the final number.
- `BorderGlow`: `as`, `active`. A light runs around the border. Use once per screen.
- `DotField`: no props. Login-screen background; put it first inside a `position: relative` container.
- `Checkbox` now draws its own box (spring tick). `RadioGroup` has a jelly press. `Loading` is a 3x3 lattice. All keep their props.

## Functional components (Tooltip, Badge, Switch, Tabs)

| Component | Props                                                                                            | Notes                                                                                                                     |
| --------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `Tooltip` | `content`, `placement` (`top` / `bottom`), `delay` (250), `focusable`, `children`                | One short sentence. Set `focusable` when wrapping a disabled input or button. Empty `content` renders the child as it is. |
| `Badge`   | `tone` (`neutral` / `primary` / `info` / `success` / `warning` / `danger`), `size` (`sm` / `md`) | Also exports `RoleBadge` (`role`) and `UserStatusBadge` (`status`). Stages and draft/completed stay with `StatusMark`.    |
| `Switch`  | `label`, `checked`, `onChange`, `disabled`                                                       | Native event like `Checkbox`. For settings that apply right away (account active / inactive).                             |
| `Tabs`    | `items [{value,label,content,disabled?}]`, `value`, `onChange(value)`, `defaultValue`, `label`   | Only the active panel renders. Left / Right / Home / End move between tabs. `onChange` gets the value.                    |

Planned uses: `Tooltip` on locked fields, the 30-second cooldown and the application-date rule; `Badge` in the user list; `Switch` for C-201 / C-202; `Tabs` in the company karte.

## Popup animation

Popups (`Combobox` list, `DatePicker`, `DropdownMenu`, `HoverCard`) grow downward when they open, their items appear one by one, and they fold back up when they close. `Tooltip` fades in and out.

- `hooks/usePresence.js`: `const { mounted, state } = usePresence(open, 180)`. Render the popup while `mounted`, and set `data-state={state}` on it. It stays in the page while the closing animation plays. With reduced motion it unmounts at once.
- `styles/popover.css`: the `.popover` grow / fold animation. Put `popover__item` and `style={{ '--i': index }}` on each item to get the one-by-one build (the delay stops growing after the 10th).

## Links

| Component      | Props                           | Notes                                                                                                                                                                                                                          |
| -------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ExternalLink` | `href` (http/https), `children` | Left click opens a new tab. Hover / focus shows the real URL (a long URL slides sideways with faded edges). Right click shows our own menu: URL, 新しいタブで開く, リンクをコピー. A non-http(s) `href` renders as plain text. |
| `TextLink`     | `to`, `children`                | In-app (react-router) link. Same animated underline. Left click navigates in the same tab. Right click shows the same custom menu (full URL, 新しいタブで開く, リンクをコピー).                                                |

Right-click menu: `components/LinkMenu/useLinkMenu.jsx` (shared by both). Look: `styles/textLink.css` (`.text-link`). The underline draws in from the left and the color deepens on hover / focus.
