import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { classNames } from '@/utils/classNames.js';
import { useFormField } from '@/components/FormField/useFormField.js';
import { usePresence } from '@/hooks/usePresence.js';
import '@/styles/popover.css';
import './Combobox.css';

const normalize = (text) =>
    String(text ?? '')
        .normalize('NFKC')
        .toLowerCase();

// Find the next enabled option index from `from` in direction `step` (+1 / -1), wrapping around.
function nextEnabled(list, from, step) {
    if (list.length === 0) return -1;
    for (let i = 1; i <= list.length; i += 1) {
        const index = (from + step * i + list.length * i) % list.length;
        if (!list[index].disabled) return index;
    }
    return -1;
}

// Type-to-filter select.
// options: [{ value, label, disabled? }] (must include the selected value)
// value / onChange(value): onChange gets the option value ('' when cleared), NOT an event.
// Inside a FormField it is wired up for you.
function Combobox({
    options,
    value,
    onChange,
    placeholder = '選択または入力',
    emptyText = '該当する項目がありません',
    clearable = false,
    disabled = false,
    className,
}) {
    const field = useFormField();
    const autoId = useId();
    const id = field?.id ?? autoId;
    const listId = `${id}-listbox`;

    const wrapperRef = useRef(null);
    const inputRef = useRef(null);
    const listRef = useRef(null);
    const [open, setOpen] = useState(false);
    // null = not typing (show the selected label); string = what the user typed.
    const [query, setQuery] = useState(null);
    const [activeIndex, setActiveIndex] = useState(0);

    const selected = options.find((option) => option.value === value);
    const { mounted, state } = usePresence(open);
    // While the list folds away, `query` is kept so the options do not jump back to the full list.
    // The input already shows the chosen label. openList and typing set `query` again.
    const inputValue = open && query !== null ? query : (selected?.label ?? '');
    const filtered = query
        ? options.filter((option) => normalize(option.label).includes(normalize(query)))
        : options;
    const active = Math.min(activeIndex, filtered.length - 1);

    // Keep the highlighted option visible while moving with the keyboard.
    useEffect(() => {
        if (open) listRef.current?.children[active]?.scrollIntoView?.({ block: 'nearest' });
    }, [open, active]);

    function closeList() {
        setOpen(false);
    }

    function openList() {
        if (open) return;
        setQuery(null);
        const selectedIndex = options.findIndex((option) => option.value === value);
        setActiveIndex(Math.max(selectedIndex, 0));
        setOpen(true);
    }

    function choose(option) {
        if (!option || option.disabled) return;
        onChange(option.value);
        closeList();
    }

    function handleKeyDown(event) {
        switch (event.key) {
            case 'ArrowDown':
            case 'ArrowUp': {
                event.preventDefault();
                if (!open) {
                    openList();
                    return;
                }
                const next = nextEnabled(filtered, active, event.key === 'ArrowDown' ? 1 : -1);
                if (next >= 0) setActiveIndex(next);
                break;
            }
            case 'Enter':
                // Enter that confirms IME conversion must not select anything.
                if (event.nativeEvent.isComposing || event.keyCode === 229) return;
                if (open) {
                    event.preventDefault();
                    choose(filtered[active]);
                }
                break;
            case 'Escape':
                if (open) {
                    // Close the list only; do not close a surrounding dialog.
                    event.preventDefault();
                    event.stopPropagation();
                    closeList();
                }
                break;
            case 'Tab':
                closeList();
                break;
            default:
        }
    }

    return (
        <div
            ref={wrapperRef}
            className={classNames('combobox', className)}
            onBlur={(event) => {
                if (!wrapperRef.current.contains(event.relatedTarget)) closeList();
            }}
        >
            <input
                ref={inputRef}
                id={id}
                type="text"
                role="combobox"
                autoComplete="off"
                aria-expanded={open}
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={open && active >= 0 ? `${id}-opt-${active}` : undefined}
                aria-invalid={field?.invalid || undefined}
                aria-required={field?.required || undefined}
                aria-describedby={field?.describedBy}
                className={classNames(
                    'form-control',
                    'combobox__input',
                    field?.invalid && 'form-control--invalid',
                )}
                value={inputValue}
                placeholder={placeholder}
                disabled={disabled}
                onChange={(event) => {
                    setQuery(event.target.value);
                    setActiveIndex(0);
                    setOpen(true);
                }}
                onClick={openList}
                onKeyDown={handleKeyDown}
            />
            {clearable && value && !disabled ? (
                <button
                    type="button"
                    className="combobox__clear"
                    aria-label="選択を解除"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                        onChange('');
                        closeList();
                        inputRef.current?.focus();
                    }}
                >
                    <X size={16} aria-hidden="true" />
                </button>
            ) : null}
            <ChevronDown className="combobox__chevron" size={16} aria-hidden="true" />

            {mounted && (
                <ul
                    ref={listRef}
                    id={listId}
                    role="listbox"
                    data-state={state}
                    className="popover combobox__list"
                    // Keep focus in the input while clicking an option.
                    onMouseDown={(event) => event.preventDefault()}
                >
                    {filtered.length === 0 ? (
                        <li className="combobox__empty">{emptyText}</li>
                    ) : (
                        filtered.map((option, index) => (
                            <li
                                key={option.value}
                                id={`${id}-opt-${index}`}
                                role="option"
                                aria-selected={option.value === value}
                                aria-disabled={option.disabled || undefined}
                                style={{ '--i': index }}
                                className={classNames(
                                    'popover__item',
                                    'combobox__option',
                                    index === active && 'combobox__option--active',
                                    option.disabled && 'combobox__option--disabled',
                                )}
                                onMouseMove={() => !option.disabled && setActiveIndex(index)}
                                onClick={() => choose(option)}
                            >
                                <span>{option.label}</span>
                                {option.value === value && <Check size={16} aria-hidden="true" />}
                            </li>
                        ))
                    )}
                </ul>
            )}
        </div>
    );
}

export default Combobox;
