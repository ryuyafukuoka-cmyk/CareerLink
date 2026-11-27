import { useEffect, useState } from 'react';
import { Link, generatePath, useSearchParams } from 'react-router-dom';
import { ROLES, STAGE_LABELS } from '@shared/definitions';
import { listCompanyOptions } from '@/api/companies.js';
import { listApplicationRounds } from '@/api/rounds.js';
import { listUsers } from '@/api/users.js';
import { useAuth } from '@/auth/useAuth.js';
import Button from '@/components/Button/Button.jsx';
import EmptyState from '@/components/EmptyState/EmptyState.jsx';
import ErrorMessage from '@/components/ErrorMessage/ErrorMessage.jsx';
import FormField from '@/components/FormField/FormField.jsx';
import Loading from '@/components/Loading/Loading.jsx';
import Select from '@/components/Select/Select.jsx';
import { toast } from '@/components/Toast/toast.js';
import { useOverlay, useOverlayResult } from '@/hooks/useOverlay.js';
import { getMessage } from '@/messages';
import { PATHS } from '@/routes/paths.js';
import RoundEditDialog from './RoundEditDialog.jsx';
import RoundFormDialog from './RoundFormDialog.jsx';
import { displayDate, groupByCompany, numberRounds, studentOptions } from './roundHelpers.js';
import './RoundScreens.css';

// SC-02-04 Application rounds and selection progress, grouped by company.
// Student: own rounds. Instructor / admin: all students, or one chosen student (kept in the URL).
function ApplicationRoundListScreen() {
    const { role } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const isStaff = role !== ROLES.STUDENT;
    const canWrite = role === ROLES.STUDENT || role === ROLES.ADMIN; // instructors are read-only
    const studentUserId = isStaff ? (searchParams.get('studentUserId') ?? '') : '';

    // SC-02-06 and SC-02-07 open over this list; after a save the list is read again.
    const createForm = useOverlay('roundCreate');
    const editForm = useOverlay('roundEdit');
    const [reloadCount, setReloadCount] = useState(0);
    useOverlayResult('roundCreate', () => {
        toast.success(getMessage('S-302'));
        setReloadCount((n) => n + 1);
    });
    useOverlayResult('roundEdit', () => {
        toast.success(getMessage('S-301'));
        setReloadCount((n) => n + 1);
    });

    const [result, setResult] = useState({ key: null, data: null, error: null });
    const requestKey = `${role}|${studentUserId}|${reloadCount}`;
    const loading = result.key !== requestKey;

    useEffect(() => {
        let cancelled = false;
        Promise.all([
            listApplicationRounds({ studentUserId: studentUserId || undefined }),
            listCompanyOptions(),
            isStaff ? listUsers({ role: ROLES.STUDENT }) : Promise.resolve([]),
        ])
            .then(([rounds, companies, students]) => {
                if (!cancelled)
                    setResult({
                        key: requestKey,
                        data: { rounds, companies, students },
                        error: null,
                    });
            })
            .catch((error) => !cancelled && setResult({ key: requestKey, data: null, error }));
        return () => {
            cancelled = true;
        };
    }, [studentUserId, isStaff, requestKey]);

    const { data, error } = result.key === requestKey ? result : { data: null, error: null };

    function handleStudentChange(event) {
        const value = event.target.value;
        setSearchParams(value ? { studentUserId: value } : {});
    }

    let groups = [];
    let numbers = new Map();
    let companyNames = new Map();
    let studentNames = new Map();
    if (data) {
        groups = groupByCompany(data.rounds);
        numbers = numberRounds(data.rounds);
        companyNames = new Map(data.companies.map((c) => [c.companyId, c.nameOfficial]));
        studentNames = new Map(data.students.map((s) => [s.userId, s.displayName]));
    }

    return (
        <main className="round-screen">
            <div className="round-screen__header">
                <h1>応募企業・選考進捗</h1>
                {canWrite && (
                    <Button
                        onClick={() => createForm.open(studentUserId ? { studentUserId } : null)}
                    >
                        応募回を登録する
                    </Button>
                )}
            </div>

            {isStaff && (
                <div className="round-screen__filter">
                    <FormField label="学生">
                        <Select
                            placeholder="すべての学生"
                            options={studentOptions(data?.students ?? [])}
                            value={studentUserId}
                            onChange={handleStudentChange}
                        />
                    </FormField>
                </div>
            )}

            {loading && <Loading />}
            {error && <ErrorMessage error={error} onRetry={() => setReloadCount((n) => n + 1)} />}
            {data && groups.length === 0 && <EmptyState message={getMessage('N-006')} />}

            {groups.map(({ companyId, rounds }) => (
                <section key={companyId} className="round-screen__group">
                    <h2>
                        <Link to={generatePath(PATHS.companyDetail, { companyId })}>
                            {companyNames.get(companyId) ?? `企業ID ${companyId}`}
                        </Link>
                    </h2>
                    <div className="round-screen__table-wrap">
                        <table className="round-screen__table">
                            <thead>
                                <tr>
                                    {isStaff && <th scope="col">学生</th>}
                                    <th scope="col">応募回</th>
                                    <th scope="col">応募日</th>
                                    <th scope="col">選考段階</th>
                                    <th scope="col">操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rounds.map((round) => {
                                    const params = { roundId: round.applicationRoundId };
                                    return (
                                        <tr key={round.applicationRoundId}>
                                            {isStaff && (
                                                <td>
                                                    {studentNames.get(round.studentUserId) ??
                                                        `ID ${round.studentUserId}`}
                                                </td>
                                            )}
                                            <td>第{numbers.get(round.applicationRoundId)}回</td>
                                            <td>{displayDate(round.applicationDate)}</td>
                                            <td>{STAGE_LABELS[round.stage]}</td>
                                            <td className="round-screen__links">
                                                <Link to={generatePath(PATHS.roundDetail, params)}>
                                                    活動記録・履歴
                                                </Link>
                                                {canWrite && (
                                                    <button
                                                        type="button"
                                                        className="round-screen__link"
                                                        onClick={() =>
                                                            editForm.open({
                                                                round,
                                                                companyName:
                                                                    companyNames.get(companyId) ??
                                                                    null,
                                                            })
                                                        }
                                                    >
                                                        進捗を編集
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </section>
            ))}

            <RoundFormDialog overlay={createForm} />
            <RoundEditDialog overlay={editForm} />
        </main>
    );
}

export default ApplicationRoundListScreen;
