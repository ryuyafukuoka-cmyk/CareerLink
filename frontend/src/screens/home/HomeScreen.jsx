import { useEffect, useState } from 'react';
import {
    Building2,
    ClipboardList,
    FileText,
    Plus,
    ScrollText,
    Search,
    Settings,
    Users,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ROLES } from '@shared/definitions';
import { getVisibleMenus } from '@/auth/menus.js';
import { useAuth } from '@/auth/useAuth.js';
import Badge, { RoleBadge } from '@/components/Badge/Badge.jsx';
import Button from '@/components/Button/Button.jsx';
import { toast } from '@/components/Toast/toast.js';
import { useOverlay, useOverlayResult } from '@/hooks/useOverlay.js';
import { getMessage } from '@/messages';
import { PATHS } from '@/routes/paths.js';
import RoundFormDialog from '../rounds/RoundFormDialog.jsx';
import HomeSummary from './HomeSummary.jsx';
import './HomeScreen.css';

// What each menu entry is for, and its icon (shown on the shortcut cards).
const SHORTCUTS = {
    records: { icon: FileText, text: '就職活動の記録を登録・確認します。' },
    rounds: { icon: ClipboardList, text: '応募回ごとの選考の進み具合を確認します。' },
    search: { icon: Search, text: '過去の公開済み記録を条件で探します。' },
    companies: { icon: Building2, text: '企業の情報と、企業別の過去記録を見ます。' },
    adminUsers: { icon: Users, text: 'ユーザの利用状態や卒業年度を管理します。' },
    adminOperations: { icon: Settings, text: '年度更新や下書きの整理を行います。' },
    adminLogs: { icon: ScrollText, text: '重要な操作の履歴を確認します。' },
};

function getGreeting(hour) {
    if (hour < 11) return 'おはようございます';
    if (hour < 18) return 'こんにちは';
    return 'こんばんは';
}

// SC-01-01 Home: greeting, a summary for the current role, and shortcuts to every page.
function HomeScreen() {
    const navigate = useNavigate();
    const { user, role } = useAuth();
    const { state, pathname, search } = useLocation();
    const isStudent = role === ROLES.STUDENT;
    const canWrite = isStudent || role === ROLES.ADMIN; // instructors are read-only
    // SC-02-06 opens over the home screen too; after a save the summary is read again.
    const roundForm = useOverlay('roundCreate');
    const [summaryKey, setSummaryKey] = useState(0);
    useOverlayResult('roundCreate', () => {
        toast.success(getMessage('S-302'));
        setSummaryKey((n) => n + 1);
    });
    const shortcuts = getVisibleMenus(role).filter((menu) => menu.id !== 'home');

    // Result message from another page (S-201 ...): show it once as a toast, then clear it
    // from the history entry so a refresh does not show it again.
    const noticeId = state?.noticeId;
    const noticeTone = state?.noticeTone;
    useEffect(() => {
        if (!noticeId) return;
        const show = noticeTone === 'error' ? toast.error : toast.success;
        show(getMessage(noticeId));
        navigate(`${pathname}${search}`, { replace: true, state: null });
    }, [noticeId, noticeTone, navigate, pathname, search]);

    const now = new Date();
    const today = now.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
    });

    return (
        <main className="home-screen">
            <header className="home-hero">
                <div className="home-hero__text">
                    <p className="home-hero__date">{today}</p>
                    <h1 className="home-hero__title">
                        {getGreeting(now.getHours())}、{user.displayName}さん
                    </h1>
                    <p className="home-hero__meta">
                        <RoleBadge role={role} />
                        {isStudent && (
                            <Badge tone="neutral">
                                {user.graduationYear
                                    ? `${user.graduationYear}年度卒`
                                    : '卒業年度 未設定'}
                            </Badge>
                        )}
                    </p>
                </div>
                {canWrite && (
                    <div className="home-hero__actions">
                        <Button onClick={() => navigate(PATHS.recordNew)}>
                            <Plus size={18} aria-hidden="true" />
                            活動記録を登録
                        </Button>
                        <Button variant="secondary" onClick={() => roundForm.open()}>
                            応募回を登録
                        </Button>
                    </div>
                )}
            </header>

            <HomeSummary role={role} refreshKey={summaryKey} />

            <section className="home-section" aria-labelledby="home-shortcuts-heading">
                <h2 id="home-shortcuts-heading" className="home-section__title">
                    メニュー
                </h2>
                <ul className="home-shortcuts">
                    {shortcuts.map((menu, index) => {
                        const { icon: Icon, text } = SHORTCUTS[menu.id];
                        return (
                            <li key={menu.id} style={{ '--i': index }}>
                                <Link className="home-shortcut" to={menu.path}>
                                    <span className="home-shortcut__icon" aria-hidden="true">
                                        <Icon size={20} />
                                    </span>
                                    <span className="home-shortcut__title">{menu.label}</span>
                                    <span className="home-shortcut__text">{text}</span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </section>

            <RoundFormDialog overlay={roundForm} />
        </main>
    );
}

export default HomeScreen;
