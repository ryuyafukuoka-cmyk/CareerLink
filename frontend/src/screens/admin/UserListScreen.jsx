import { useEffect, useState } from 'react';
import { Link, generatePath, useSearchParams } from 'react-router-dom';
import { ROLE_LABELS, ROLES, USER_STATUS_LABELS } from '@shared/definitions';
import { listUsers } from '@/api/users.js';
import Button from '@/components/Button/Button.jsx';
import EmptyState from '@/components/EmptyState/EmptyState.jsx';
import ErrorMessage from '@/components/ErrorMessage/ErrorMessage.jsx';
import FormField from '@/components/FormField/FormField.jsx';
import Loading from '@/components/Loading/Loading.jsx';
import Notice from '@/components/Notice/Notice.jsx';
import Select from '@/components/Select/Select.jsx';
import { getMessage } from '@/messages';
import { PATHS } from '@/routes/paths.js';
import './AdminScreens.css';

const ROLE_OPTIONS = Object.values(ROLES).map((value) => ({ value, label: ROLE_LABELS[value] }));
const STATUS_OPTIONS = Object.entries(USER_STATUS_LABELS).map(([value, label]) => ({
    value,
    label,
}));

// SC-06-01 User list (instructors and admins). Filters: role, status, graduation year (AND).
// The searched filters live in the URL, so coming back from a user keeps them.
function UserListScreen() {
    const [searchParams, setSearchParams] = useSearchParams();
    const role = searchParams.get('role') ?? '';
    const status = searchParams.get('status') ?? '';
    const graduationYear = searchParams.get('graduationYear') ?? '';

    // What is chosen in the form (applied on submit).
    const [form, setForm] = useState({ role, status, graduationYear });
    const [years, setYears] = useState([]);

    const [reloadCount, setReloadCount] = useState(0);
    const [result, setResult] = useState({ key: null, data: null, error: null });
    const requestKey = `${role}|${status}|${graduationYear}|${reloadCount}`;
    const loading = result.key !== requestKey;

    // Year choices: every graduation year among all users. Without them the filter stays empty.
    useEffect(() => {
        let cancelled = false;
        listUsers()
            .then((all) => {
                if (cancelled) return;
                const found = new Set(all.map((u) => u.graduationYear).filter(Boolean));
                setYears([...found].sort((a, b) => b - a));
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        listUsers({
            role: role || undefined,
            status: status || undefined,
            graduationYear: graduationYear || undefined,
        })
            .then((data) => !cancelled && setResult({ key: requestKey, data, error: null }))
            .catch((error) => !cancelled && setResult({ key: requestKey, data: null, error }));
        return () => {
            cancelled = true;
        };
    }, [role, status, graduationYear, requestKey]);

    const set = (name) => (event) =>
        setForm((current) => ({ ...current, [name]: event.target.value }));

    function search(values) {
        const params = {};
        for (const [key, value] of Object.entries(values)) if (value) params[key] = value;
        setSearchParams(params);
    }

    function handleSubmit(event) {
        event.preventDefault();
        search(form);
    }

    function handleClear() {
        const empty = { role: '', status: '', graduationYear: '' };
        setForm(empty);
        search(empty);
    }

    const { data, error } = loading ? { data: null, error: null } : result;

    return (
        <main className="admin-screen">
            <h1>ユーザ一覧</h1>

            <form className="admin-screen__filters" onSubmit={handleSubmit}>
                <FormField label="ロール">
                    <Select
                        options={ROLE_OPTIONS}
                        placeholder="すべて"
                        value={form.role}
                        onChange={set('role')}
                    />
                </FormField>
                <FormField label="利用状態">
                    <Select
                        options={STATUS_OPTIONS}
                        placeholder="すべて"
                        value={form.status}
                        onChange={set('status')}
                    />
                </FormField>
                <FormField label="卒業年度">
                    <Select
                        options={years.map((y) => ({ value: String(y), label: `${y}年度` }))}
                        placeholder="すべて"
                        value={form.graduationYear}
                        onChange={set('graduationYear')}
                    />
                </FormField>
                <div className="admin-screen__actions">
                    <Button type="submit">検索</Button>
                    <Button variant="secondary" onClick={handleClear}>
                        条件をクリア
                    </Button>
                </div>
            </form>

            {loading && <Loading />}
            {error && <ErrorMessage error={error} onRetry={() => setReloadCount((n) => n + 1)} />}
            {data && data.length === 0 && <EmptyState message={getMessage('N-006')} />}
            {data && data.length > 0 && (
                <>
                    <Notice message={`${data.length}件のユーザが見つかりました。`} />
                    <div className="admin-screen__table-wrap">
                        <table className="admin-screen__table">
                            <thead>
                                <tr>
                                    <th scope="col">氏名</th>
                                    <th scope="col">ロール</th>
                                    <th scope="col">利用状態</th>
                                    <th scope="col">卒業年度</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((user) => (
                                    <tr key={user.userId}>
                                        <td>
                                            <Link
                                                to={generatePath(PATHS.adminUserDetail, {
                                                    userId: user.userId,
                                                })}
                                            >
                                                {user.displayName}
                                            </Link>
                                        </td>
                                        <td>{ROLE_LABELS[user.role]}</td>
                                        <td>{USER_STATUS_LABELS[user.status]}</td>
                                        <td>
                                            {user.graduationYear
                                                ? `${user.graduationYear}年度`
                                                : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </main>
    );
}

export default UserListScreen;
