import { useRef, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import Calendar from '@/components/Calendar/Calendar.jsx';
import { useFormField } from '@/components/FormField/useFormField.js';
import { useClickOutside } from '@/hooks/useClickOutside.js';
import { classNames } from '@/utils/classNames.js';
import '@/styles/popover.css';
import './DatePicker.css';

// Turn typed input into YYYY/MM/DD when it clearly is a date (full-width digits, - or . separators,
// missing zero padding). Anything else is returned unchanged so validation can report it.
function normalizeDateText(text) {
    const half = text.normalize('NFKC').trim().replace(/[-.]/g, '/');
    const match = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(half);
    if (!match) return half;
    return `${match[1]}/${match[2].padStart(2, '0')}/${match[3].padStart(2, '0')}`;
}

// Date input: type YYYY/MM/DD or pick from the calendar popup.
// value: 'YYYY/MM/DD' or ''. onChange(valueString): a string, NOT an event (unlike TextInput).
// min / max: 'YYYY/MM/DD' limits for the calendar. Inside a FormField it is wired up for you.
function DatePicker({
    value,
    onChange,
    min,
    max,
    placeholder = 'YYYY/MM/DD',
    disabled = false,
    className,
}) {
    const field = useFormField();
    const wrapperRef = useRef(null);
    const inputRef = useRef(null);
    const composingRef = useRef(false);
    const [open, setOpen] = useState(false);
    const [focusCalendar, setFocusCalendar] = useState(false);

    useClickOutside(wrapperRef, () => setOpen(false), open);

    function openCalendar() {
        setFocusCalendar(true);
        setOpen(true);
    }

    function closeCalendar() {
        setOpen(false);
        inputRef.current?.focus();
    }

    function handleBlur() {
        // Never rewrite the text while an IME conversion is in progress.
        if (composingRef.current) return;
        const normalized = normalizeDateText(value ?? '');
        if (normalized !== value) onChange(normalized);
    }

    return (
        <div
            ref={wrapperRef}
            className={classNames('date-picker', className)}
            onKeyDown={(event) => {
                if (event.key === 'Escape' && open) {
                    // Close the popup only; do not close a surrounding dialog.
                    event.preventDefault();
                    event.stopPropagation();
                    closeCalendar();
                }
            }}
        >
            <input
                ref={inputRef}
                id={field?.id}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                aria-invalid={field?.invalid || undefined}
                aria-required={field?.required || undefined}
                aria-describedby={field?.describedBy}
                className={classNames(
                    'form-control',
                    'date-picker__input',
                    field?.invalid && 'form-control--invalid',
                )}
                value={value ?? ''}
                placeholder={placeholder}
                disabled={disabled}
                onChange={(event) => {
                    onChange(event.target.value);
                    setOpen(false);
                }}
                onBlur={handleBlur}
                onCompositionStart={() => {
                    composingRef.current = true;
                }}
                onCompositionEnd={() => {
                    composingRef.current = false;
                }}
                onKeyDown={(event) => {
                    if (event.key === 'ArrowDown' && !open) {
                        event.preventDefault();
                        openCalendar();
                    }
                }}
            />
            <button
                type="button"
                className="date-picker__toggle"
                aria-label="カレンダーを開く"
                aria-haspopup="dialog"
                aria-expanded={open}
                disabled={disabled}
                onClick={() => (open ? setOpen(false) : openCalendar())}
            >
                <CalendarDays size={18} aria-hidden="true" />
            </button>

            {open && (
                <div className="popover date-picker__popover" role="dialog" aria-label="日付を選択">
                    <Calendar
                        value={value}
                        min={min}
                        max={max}
                        autoFocus={focusCalendar}
                        showToday
                        onClear={
                            value
                                ? () => {
                                      onChange('');
                                      closeCalendar();
                                  }
                                : undefined
                        }
                        onSelect={(dateString) => {
                            onChange(dateString);
                            closeCalendar();
                        }}
                    />
                </div>
            )}
        </div>
    );
}

export default DatePicker;
