import { Link, useLocation } from 'react-router-dom';
import { ROLE_LABELS, ROLES } from '@shared/definitions';
import { getVisibleMenus } from '@/auth/menus.js';
import { useAuth } from '@/auth/useAuth.js';
import { getMessage } from '@/messages';
import { classNames } from '@/utils/classNames.js';
import './HomeScreen.css';

// What each menu entry is for (shown on the home cards).
const DESCRIPTIONS = {
    records: '就職活動の記録を登録・確認します。',
    rounds: '応募回ごとの選考の進み具合を確認します。',
    search: '過去の公開済み記録を条件で探します。',
    companies: '企業の情報と、企業別の過去記録を見ます。',
    adminUsers: 'ユーザの利用状態や卒業年度を管理します。',
    adminOperations: '年度更新や下書きの整理を行います。',
    adminLogs: '重要な操作の履歴を確認します。',
};

// SC-01-01 Home: own info and links for the current role.
function HomeScreen() {
    const { user, role } = useAuth();
    const { state } = useLocation();
    const cards = getVisibleMenus(role).filter((menu) => menu.id !== 'home');

    return (
        <main className="home-screen">
            <h1>ホーム</h1>

            {state?.noticeId && (
                <p
                    className={classNames(
                        'home-screen__notice',
                        `home-screen__notice--${state.noticeTone ?? 'success'}`,
                    )}
                    role="status"
                >
                    {getMessage(state.noticeId)}
                </p>
            )}

            <section className="home-screen__section" aria-labelledby="home-user-heading">
                <h2 id="home-user-heading">あなたの情報</h2>
                <dl className="home-screen__info">
                    <dt>氏名</dt>
                    <dd>{user.displayName}</dd>
                    <dt>ロール</dt>
                    <dd>{ROLE_LABELS[role]}</dd>
                    {role === ROLES.STUDENT && (
                        <>
                            <dt>卒業年度</dt>
                            <dd>{user.graduationYear ?? '未設定'}</dd>
                        </>
                    )}
                </dl>
            </section>

            <section className="home-screen__section" aria-labelledby="home-menu-heading">
                <h2 id="home-menu-heading">メニュー</h2>
                <ul className="home-screen__cards">
                    {cards.map((menu) => (
                        <li key={menu.id}>
                            <Link className="home-screen__card" to={menu.path}>
                                <span className="home-screen__card-title">{menu.label}</span>
                                <span className="home-screen__card-text">
                                    {DESCRIPTIONS[menu.id]}
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>
            </section>
        </main>
    );
}

export default HomeScreen;
