import { generatePath } from 'react-router-dom';
import { ROLES } from '@shared/definitions';
import { useAuth } from '@/auth/useAuth.js';
import TextLink from '@/components/TextLink/TextLink.jsx';
import { PATHS } from '@/routes/paths.js';
import './AdminScreens.css';

// SC-06-03 Operations (Should). Year rollover guidance only: no function of its own.
// Each step points to a screen that already does the work (F-007-02). Step 4 is admin only.
function OperationsScreen() {
    const { role } = useAuth();
    const isAdmin = role === ROLES.ADMIN;

    return (
        <main className="admin-screen">
            <h1>運用・データ管理</h1>
            <p className="admin-screen__lead">
                年度更新は次の手順で行います。公開済みの活動記録は、年度が変わっても削除・初期化されません。
            </p>

            <ol className="admin-screen__steps">
                <li className="admin-screen__step">
                    <h2>卒業・退校した学生を探す</h2>
                    <p>ユーザ一覧で卒業年度を指定して、対象の学生を探します。</p>
                    <TextLink to={PATHS.adminUsers}>ユーザ一覧を開く</TextLink>
                </li>
                <li className="admin-screen__step">
                    <h2>学生アカウントを無効にする</h2>
                    <p>
                        ユーザ詳細から利用状態を「無効」に変更します。無効にしても記録は削除されません。
                    </p>
                    <TextLink to={`${generatePath(PATHS.adminUsers)}?role=student&status=active`}>
                        有効な学生を表示する
                    </TextLink>
                </li>
                <li className="admin-screen__step">
                    <h2>公開済みの記録が残っていることを確認する</h2>
                    <p>
                        過去情報検索で、過去の卒業年度を指定して記録が表示されることを確認します。
                    </p>
                    <TextLink to={PATHS.search}>過去情報検索を開く</TextLink>
                </li>
                <li className="admin-screen__step">
                    <h2>卒業・退校した学生の下書きを削除する（管理者のみ）</h2>
                    <p>下書きは自動では削除されません。管理者が内容を確認し、手動で削除します。</p>
                    {isAdmin ? (
                        <TextLink to={PATHS.adminDraftCleanup}>下書きの整理を開く</TextLink>
                    ) : (
                        <p className="admin-screen__muted">この手順は管理者が行います。</p>
                    )}
                </li>
                <li className="admin-screen__step">
                    <h2>新年度の学生が利用を始める</h2>
                    <p>
                        新年度の学生が初めてログインすると、自動的にユーザが登録されます。初回登録で卒業見込み年度を入力してもらいます。
                    </p>
                </li>
                <li className="admin-screen__step">
                    <h2>操作履歴を確認する</h2>
                    <p>無効化などの管理操作が記録されていることを確認します。</p>
                    <TextLink to={PATHS.adminLogs}>操作履歴を開く</TextLink>
                </li>
            </ol>
        </main>
    );
}

export default OperationsScreen;
