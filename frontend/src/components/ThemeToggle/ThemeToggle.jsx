import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme.js';
import { classNames } from '@/utils/classNames.js';
import './ThemeToggle.css';

const OPTIONS = [
    { value: 'light', label: 'ライト', Icon: Sun },
    { value: 'dark', label: 'ダーク', Icon: Moon },
    { value: 'system', label: 'システム設定に合わせる', Icon: Monitor },
];

// Light / dark / system switch. Put it in the header and on the login screen.
// showSystem={false}: only light and dark (a stored 'system' choice then shows nothing pressed).
function ThemeToggle({ showSystem = true, className }) {
    const { preference, setPreference } = useTheme();
    const options = showSystem ? OPTIONS : OPTIONS.filter((option) => option.value !== 'system');

    return (
        <div className={classNames('theme-toggle', className)} role="group" aria-label="表示テーマ">
            {options.map(({ value, label, Icon }) => (
                <button
                    key={value}
                    type="button"
                    className="theme-toggle__button"
                    aria-pressed={preference === value}
                    aria-label={label}
                    title={label}
                    onClick={() => setPreference(value)}
                >
                    <Icon size={16} aria-hidden="true" />
                </button>
            ))}
        </div>
    );
}

export default ThemeToggle;
