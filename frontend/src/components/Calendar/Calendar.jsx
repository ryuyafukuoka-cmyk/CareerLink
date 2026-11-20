import { useEffect, useId, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { classNames } from '@/utils/classNames.js';
import {
    WEEKDAYS,
    addDays,
    addMonths,
    formatDate,
    getMonthGrid,
    isOutOfRange,
    isSameDay,
    parseDate,
    startOfToday,
} from '@/utils/calendar.js';
import './Calendar.css';

// Month calendar (Sunday first).
// value: 'YYYY/MM/DD' or ''. onSelect(dateString). min / max: 'YYYY/MM/DD' limits.
// showToday / onClear: add the footer buttons (今日 / クリア).
// autoFocus: move focus into the grid on mount (used when a popup opens from the keyboard).
// Keys: arrows = day / week, PageUp / PageDown = month (Shift = year), Home / End = week start / end.
function Calendar({
    value = '',
    onSelect,
    min,
    max,
    showToday = false,
    onClear,
    autoFocus = false,
}) {
    const titleId = useId();
    const gridRef = useRef(null);
    const moveFocusRef = useRef(false);
    const [today] = useState(startOfToday);
    const minDate = min ? parseDate(min) : null;
    const maxDate = max ? parseDate(max) : null;
    const selected = parseDate(value);
    // The one date that holds the roving tab stop. The visible month follows it.
    const [focused, setFocused] = useState(() => selected ?? today);

    // Focus the day button after keyboard navigation, and on mount if asked.
    useEffect(() => {
        if (!moveFocusRef.current) return;
        moveFocusRef.current = false;
        gridRef.current?.querySelector('button[tabindex="0"]')?.focus();
    }, [focused]);
    useEffect(() => {
        if (autoFocus) gridRef.current?.querySelector('button[tabindex="0"]')?.focus();
    }, [autoFocus]);

    function clamp(date) {
        if (minDate && isOutOfRange(date, minDate, null)) return minDate;
        if (maxDate && isOutOfRange(date, null, maxDate)) return maxDate;
        return date;
    }

    function moveTo(date) {
        moveFocusRef.current = true;
        setFocused(clamp(date));
    }

    function handleKeyDown(event) {
        const steps = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
        if (event.key in steps) {
            event.preventDefault();
            moveTo(addDays(focused, steps[event.key]));
        } else if (event.key === 'PageUp' || event.key === 'PageDown') {
            event.preventDefault();
            const months = (event.shiftKey ? 12 : 1) * (event.key === 'PageUp' ? -1 : 1);
            moveTo(addMonths(focused, months));
        } else if (event.key === 'Home') {
            event.preventDefault();
            moveTo(addDays(focused, -focused.getDay()));
        } else if (event.key === 'End') {
            event.preventDefault();
            moveTo(addDays(focused, 6 - focused.getDay()));
        }
    }

    const year = focused.getFullYear();
    const month = focused.getMonth();
    const days = getMonthGrid(year, month);
    const weeks = Array.from({ length: 6 }, (_, row) => days.slice(row * 7, row * 7 + 7));
    const todayDisabled = isOutOfRange(today, minDate, maxDate);

    return (
        <div className="calendar">
            <div className="calendar__header">
                <button
                    type="button"
                    className="calendar__nav"
                    aria-label="前の月"
                    onClick={() => setFocused(clamp(addMonths(focused, -1)))}
                >
                    <ChevronLeft size={18} aria-hidden="true" />
                </button>
                <div id={titleId} className="calendar__title" aria-live="polite">
                    {year}年{month + 1}月
                </div>
                <button
                    type="button"
                    className="calendar__nav"
                    aria-label="次の月"
                    onClick={() => setFocused(clamp(addMonths(focused, 1)))}
                >
                    <ChevronRight size={18} aria-hidden="true" />
                </button>
            </div>

            <table ref={gridRef} className="calendar__grid" role="grid" aria-labelledby={titleId}>
                <thead>
                    <tr>
                        {WEEKDAYS.map((weekday) => (
                            <th key={weekday} scope="col" className="calendar__weekday">
                                {weekday}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody onKeyDown={handleKeyDown}>
                    {weeks.map((week) => (
                        <tr key={formatDate(week[0])}>
                            {week.map((date) => {
                                const outOfRange = isOutOfRange(date, minDate, maxDate);
                                const isSelected = isSameDay(date, selected);
                                return (
                                    <td
                                        key={formatDate(date)}
                                        role="gridcell"
                                        aria-selected={isSelected}
                                    >
                                        <button
                                            type="button"
                                            tabIndex={isSameDay(date, focused) ? 0 : -1}
                                            aria-label={`${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`}
                                            aria-current={
                                                isSameDay(date, today) ? 'date' : undefined
                                            }
                                            aria-disabled={outOfRange || undefined}
                                            className={classNames(
                                                'calendar__day',
                                                date.getMonth() !== month &&
                                                    'calendar__day--outside',
                                                isSameDay(date, today) && 'calendar__day--today',
                                                isSelected && 'calendar__day--selected',
                                                outOfRange && 'calendar__day--disabled',
                                            )}
                                            onClick={() => {
                                                if (!outOfRange) onSelect(formatDate(date));
                                            }}
                                        >
                                            {date.getDate()}
                                        </button>
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>

            {(showToday || onClear) && (
                <div className="calendar__footer">
                    {showToday && (
                        <button
                            type="button"
                            className="calendar__link"
                            disabled={todayDisabled}
                            onClick={() => onSelect(formatDate(today))}
                        >
                            今日
                        </button>
                    )}
                    {onClear && (
                        <button type="button" className="calendar__link" onClick={onClear}>
                            クリア
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

export default Calendar;
