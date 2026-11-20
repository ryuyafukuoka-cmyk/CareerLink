import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    canonicalOperationType,
    LOG_TARGET_TYPE_LABELS,
    LOG_TARGET_TYPE_ORDER,
    OPERATION_RESULT_LABELS,
    OPERATION_TYPE_LABELS,
    OPERATION_TYPE_ORDER,
} from '@shared/definitions';
import { listUsers } from '@/api/users.js';
import { listOperationLogs } from '@/api/operationLogs.js';
import Button from '@/components/Button/Button.jsx';
import EmptyState from '@/components/EmptyState/EmptyState.jsx';
import ErrorMessage from '@/components/ErrorMessage/ErrorMessage.jsx';
import FormField from '@/components/FormField/FormField.jsx';
import Loading from '@/components/Loading/Loading.jsx';
import Notice from '@/components/Notice/Notice.jsx';
import Pagination from '@/components/Pagination/Pagination.jsx';
import Select from '@/components/Select/Select.jsx';
import TextInput from '@/components/TextInput/TextInput.jsx';
import { getMessage } from '@/messages';
import { formatDateTime, isRealDate } from '@/utils/date.js';
import './AdminScreens.css';

const OPERATION_OPTIONS = OPERATION_TYPE_ORDER.map((value) => ({
    value,
    label: OPERATION_TYPE_LABELS[value],
}));
const TARGET_OPTIONS = LOG_TARGET_TYPE_ORDER.map((value) => ({
    value,
    label: LOG_TARGET_TYPE_LABELS[value],
}));

const EMPTY_FORM = { from: '', to: '', operatorUserId: '', operationType: '', targetType: '' };

// Form values -> checked error message IDs ({} when fine).
function validate(values) {
    const errors = {};
    const from = values.from.trim();
    const to = values.to.trim();
    if (from && !isRealDate(from)) errors.from = 'E-207';
    if (to && !isRealDate(to)) errors.to = 'E-207';
    if (!errors.from && !errors.to && from && to && from > to) errors.to = 'E-208';
    return errors;
}

// SC-06-04 Operation log list (instructors and admins). Filters: period, operator, operation type,
// target type (AND). Newest first, 10 per page. Searched filters and page live in the URL.
// The log never holds record bodies, so only who / when / what / result is shown.
function OperationLogScreen() {
    const [searchParams, setSearchParams] = useSearchParams();
    const applied = {
        from: searchParams.get('from') ?? '',
        to: searchParams.get('to') ?? '',
        operatorUserId: searchParams.get('operatorUserId') ?? '',
        operationType: canonicalOperationType(searchParams.get('operationType') ?? ''),
        targetType: searchParams.get('targetType') ?? '',
    };
    const pageParam = Number(searchParams.get('page'));
    const page = Number.isInteger(pageParam) && pageParam >= 1 ? pageParam : 1;

    const [form, setForm] = useState(applied);
    const [errors, setErrors] = useState({});
    const [operators, setOperators] = useState([]);

    const [reloadCount, setReloadCount] = useState(0);
    const [result, setResult] = useState({ key: null, data: null, error: null });
    const requestKey = `${searchParams.toString()}|${reloadCount}`;
    const loading = result.key !== requestKey;

    // Operator choices: every user (students can also be operators).
    useEffect(() => {
        let cancelled = false;
        listUsers()
            .then((all) => !cancelled && setOperators(all))
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        const query = { page };
        for (const [key, value] of Object.entries(applied)) if (value) query[key] = value;
        listOperationLogs(query)
            .then((data) => !cancelled && setResult({ key: requestKey, data, error: null }))
            .catch((error) => !cancelled && setResult({ key: requestKey, data: null, error }));
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [requestKey]);

    const set = (name) => (event) =>
        setForm((current) => ({ ...current, [name]: event.target.value }));

    function search(values, nextPage = 1) {
        const params = {};
        for (const [key, value] of Object.entries(values))
            if (value.trim()) params[key] = value.trim();
        if (nextPage > 1) params.page = String(nextPage);
        setSearchParams(params);
    }

    function handleSubmit(event) {
        event.preventDefault();
        const found = validate(form);
        setErrors(found);
        if (Object.keys(found).length === 0) search(form);
    }

    function handleClear() {
        setForm(EMPTY_FORM);
        setErrors({});
        search(EMPTY_FORM);
    }

    const errorText = (name) =>
        errors[name]
            ? getMessage(errors[name], { 項目名: name === 'from' ? '開始日' : '終了日' })
            : undefined;
    const { data, error } = loading ? { data: null, error: null } : result;

    return (
        <main className="admin-screen">
            <h1>操作履歴</h1>

            <form className="admin-screen__filters" onSubmit={handleSubmit} noValidate>
                <FormField label="期間（開始）" error={errorText('from')}>
                    <TextInput placeholder="YYYY/MM/DD" value={form.from} onChange={set('from')} />
                </FormField>
                <FormField label="期間（終了）" error={errorText('to')}>
                    <TextInput placeholder="YYYY/MM/DD" value={form.to} onChange={set('to')} />
                </FormField>
                <FormField label="操作者">
                    <Select
                        options={operators.map((u) => ({ value: u.userId, label: u.displayName }))}
                        placeholder="すべて"
                        value={form.operatorUserId}
                        onChange={set('operatorUserId')}
                    />
                </FormField>
                <FormField label="操作種別">
                    <Select
                        options={OPERATION_OPTIONS}
                        placeholder="すべて"
                        value={form.operationType}
                        onChange={set('operationType')}
                    />
                </FormField>
                <FormField label="対象種別">
                    <Select
                        options={TARGET_OPTIONS}
                        placeholder="すべて"
                        value={form.targetType}
                        onChange={set('targetType')}
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
            {data && data.totalCount === 0 && <EmptyState message={getMessage('N-006')} />}
            {data && data.totalCount > 0 && (
                <>
                    <Notice message={`${data.totalCount}件の操作履歴が見つかりました。`} />
                    <div className="admin-screen__table-wrap">
                        <table className="admin-screen__table">
                            <thead>
                                <tr>
                                    <th scope="col">日時</th>
                                    <th scope="col">操作者</th>
                                    <th scope="col">操作種別</th>
                                    <th scope="col">対象</th>
                                    <th scope="col">結果</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.items.map((log) => (
                                    <tr key={log.logId}>
                                        <td>{formatDateTime(log.operatedAt)}</td>
                                        <td>{log.operatorName || '—'}</td>
                                        <td>
                                            {OPERATION_TYPE_LABELS[
                                                canonicalOperationType(log.operationType)
                                            ] ?? log.operationType}
                                        </td>
                                        <td>
                                            {LOG_TARGET_TYPE_LABELS[log.targetType] ??
                                                log.targetType}
                                            {log.targetId ? `（ID: ${log.targetId}）` : ''}
                                        </td>
                                        <td>{OPERATION_RESULT_LABELS[log.result] ?? log.result}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Pagination
                        page={data.page}
                        totalCount={data.totalCount}
                        pageSize={data.pageSize}
                        onPageChange={(next) => search(applied, next)}
                    />
                </>
            )}
        </main>
    );
}

export default OperationLogScreen;
