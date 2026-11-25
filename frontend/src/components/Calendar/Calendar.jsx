import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
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

const SLIDE_MS = 320;
const GROW_MS = 280;
const SLIDE_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';
const GROW_EASING = 'cubic-bezier(0.34, 1.56, 0.64, 1)'; // a little overshoot: it "pops"

// Position and size of a day button inside .calendar__body.
function getCellBox(button, body) {
    const bodyRect = body.getBoundingClientRect();
    const rect = button.getBoundingClientRect();
    return {
        x: rect.left - bodyRect.left,
        y: rect.top - bodyRect.top,
        w: rect.width,
        h: rect.height,
    };
}

// One animation frame of the marker: sits on `box`, scaled (0 = a point at the cell's center).
const toFrame = (box, scale = 1) => ({
    transform: `translate(${box.x}px, ${box.y}px) scale(${scale})`,
    width: `${box.w}px`,
    height: `${box.h}px`,
});

// Month calendar (Sunday first).
// value: 'YYYY/MM/DD' or ''. onSelect(dateString). min / max: 'YYYY/MM/DD' limits.
// showToday / onClear: add the footer buttons (今日 / クリア).
// autoFocus: move focus into the grid on mount (used when a popup opens from the keyboard).
// Picking a date moves the highlight to it: it slides from the previous date when that is shown
// in this month, otherwise (nothing picked before, or the old date is in another month) it pops
// up out of the new date.
// onDone: adds a 完了 button to the footer (DatePicker uses it to close the popup).
// Keys: arrows = day / week, PageUp / PageDown = month (Shift = year), Home / End = week start / end.
function Calendar({
    value = '',
    onSelect,
    min,
    max,
    showToday = false,
    onClear,
    onDone,
    autoFocus = false,
}) {
    const titleId = useId();
    const gridRef = useRef(null);
    const moveFocusRef = useRef(false);
    const bodyRef = useRef(null);
    const markerRef = useRef(null);
    const lastKeyRef = useRef(null); // picked date of the previous run ('' = none); null before the first run
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

    const selectedKey = selected ? formatDate(selected) : '';

    // Move the highlight when the picked date changes. At rest the day button paints its own
    // highlight; during the move the button's highlight is hidden and the marker carries it.
    // The old date's button is looked up right now (it is still in the same place), so there is
    // no stored position that could be out of date.
    useLayoutEffect(() => {
        const body = bodyRef.current;
        const marker = markerRef.current;
        const previousKey = lastKeyRef.current;
        lastKeyRef.current = selectedKey;

        const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        if (previousKey === null || previousKey === selectedKey || reduced || !marker.animate) {
            return undefined;
        }
        const target = body.querySelector('.calendar__day--selected');
        if (!target) return undefined;

        const box = getCellBox(target, body);
        const oldButton = previousKey
            ? body.querySelector(
                  `.calendar__day[data-date="${previousKey}"]:not(.calendar__day--outside)`,
              )
            : null;
        const slide = oldButton !== null;
        const from = slide ? getCellBox(oldButton, body) : box;

        marker.style.display = 'block';
        body.classList.add('calendar__body--moving');
        Object.assign(marker.style, { left: '0px', top: '0px', ...toFrame(box) });
        const animation = marker.animate([toFrame(from, slide ? 1 : 0), toFrame(box)], {
            duration: slide ? SLIDE_MS : GROW_MS,
            easing: slide ? SLIDE_EASING : GROW_EASING,
        });
        const finish = () => {
            marker.style.display = 'none';
            body.classList.remove('calendar__body--moving');
        };
        animation.onfinish = finish;
        animation.oncancel = finish;
        return () => animation.cancel();
    }, [selectedKey]);

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

            <div ref={bodyRef} className="calendar__body">
                <span ref={markerRef} className="calendar__marker" aria-hidden="true" />
                <table
                    ref={gridRef}
                    className="calendar__grid"
                    role="grid"
                    aria-labelledby={titleId}
                >
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
                                                data-date={formatDate(date)}
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
                                                    isSameDay(date, today) &&
                                                        'calendar__day--today',
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
            </div>

            {(showToday || onClear || onDone) && (
                <div className={classNames('calendar__footer', onDone && 'calendar__footer--done')}>
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
                    {onDone && (
                        <button
                            type="button"
                            className="calendar__link calendar__link--done"
                            onClick={onDone}
                        >
                            完了
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

export default Calendar;
