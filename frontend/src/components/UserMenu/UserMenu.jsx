import { ChevronDown, LogOut, Monitor, Moon, Sun } from 'lucide-react';
import { ROLE_LABELS } from '@shared/definitions';
import DropdownMenu from '@/components/DropdownMenu/DropdownMenu.jsx';
import { useTheme } from '@/hooks/useTheme.js';
import './UserMenu.css';

// Header account menu: name + role as the trigger; inside, the display theme
// (light / dark / follow the PC, which is the default) and log out.
function UserMenu({ displayName, role, onLogout }) {
    const { preference, setPreference } = useTheme();

    const items = [
        {
            label: 'ライト',
            icon: Sun,
            checked: preference === 'light',
            onSelect: () => setPreference('light'),
        },
        {
            label: 'ダーク',
            icon: Moon,
            checked: preference === 'dark',
            onSelect: () => setPreference('dark'),
        },
        {
            label: 'PCの設定に合わせる',
            icon: Monitor,
            checked: preference === 'system',
            onSelect: () => setPreference('system'),
        },
        { separator: true },
        { label: 'ログアウト', icon: LogOut, danger: true, onSelect: onLogout },
    ];

    return (
        <DropdownMenu
            className="user-menu"
            items={items}
            align="end"
            triggerLabel={`アカウントメニュー（${displayName}）`}
        >
            <span className="user-menu__name">{displayName}</span>
            <span className="user-menu__role">{ROLE_LABELS[role]}</span>
            <ChevronDown size={16} aria-hidden="true" />
        </DropdownMenu>
    );
}

export default UserMenu;
