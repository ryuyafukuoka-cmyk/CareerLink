import { useEffect, useState } from 'react';
import { Link, generatePath } from 'react-router-dom';
import { RECORD_STATUSES, ROLES, STAGE_ORDER, STAGES } from '@shared/definitions';
import { listCompanyOptions } from '@/api/companies.js';
import { listMyActivityRecords } from '@/api/records.js';
import { listApplicationRounds } from '@/api/rounds.js';
import { listUsers } from '@/api/users.js';
import AnimatedNumber from '@/components/AnimatedNumber/AnimatedNumber.jsx';
import EmptyState from '@/components/EmptyState/EmptyState.jsx';
import ErrorMessage from '@/components/ErrorMessage/ErrorMessage.jsx';
import Loading from '@/components/Loading/Loading.jsx';
import StageTracker from '@/components/StageTracker/StageTracker.jsx';
import StatusMark from '@/components/StatusMark/StatusMark.jsx';
import { getMessage } from '@/messages';
import { PATHS } from '@/routes/paths.js';
import { formatDateTime } from '@/utils/date.js';
import { numberRounds } from '../rounds/roundHelpers.js';

const MAX_ACTIVE_ROUNDS = 4;

const isActive = (round) =>
    round.stage === STAGES.CONSIDERING || round.stage === STAGES.IN_PROGRESS;

// One number with a label. Links to the page where the number comes from.
function StatTile({ to, label, value, index }) {
    return (
        <li style={{ '--i': index }}>
            <Link className="home-stat" to={to}>
                <span className="home-stat__label">{label}</span>
                <AnimatedNumber className="home-stat__value" value={value} />
            </Link>
        </li>
    );
}

// Student view: my records and my rounds.
function StudentSummary({ data }) {
    const { mine, rounds, companies } = data;
    const drafts = mine.filter((record) => record.status === RECORD_STATUSES.DRAFT);
    const published = mine.filter((record) => record.status === RECORD_STATUSES.COMPLETED);
    const active = rounds.filter(isActive);
    const companyNames = new Map(companies.map((c) => [c.companyId, c.nameOfficial]));
    const numbers = numberRounds(rounds);
    const lastDraft = [...drafts].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];

    return (
        <>
            <ul className="home-stats">
                <StatTile
                    to={PATHS.records}
                    label="公開済みの記録"
                    value={published.length}
                    index={0}
                />
                <StatTile to={PATHS.records} label="下書き" value={drafts.length} index={1} />
                <StatTile
                    to={PATHS.rounds}
                    label="進行中の応募回"
                    value={active.length}
                    index={2}
                />
            </ul>

            <div className="home-panels">
                <section className="home-panel" aria-labelledby="home-active-heading">
                    <h2 id="home-active-heading" className="home-section__title">
                        進行中の応募回
                    </h2>
                    {active.length === 0 ? (
                        <EmptyState message={getMessage('N-006')} />
                    ) : (
                        <ul className="home-rounds">
                            {active.slice(0, MAX_ACTIVE_ROUNDS).map((round) => (
                                <li key={round.applicationRoundId} className="home-round">
                                    <Link
                                        className="home-round__name"
                                        to={generatePath(PATHS.roundDetail, {
                                            roundId: round.applicationRoundId,
                                        })}
                                    >
                                        {companyNames.get(round.companyId) ??
                                            `企業ID ${round.companyId}`}
                                        {numbers.get(round.applicationRoundId) > 1 &&
                                            `（${numbers.get(round.applicationRoundId)}回目）`}
                                    </Link>
                                    <StageTracker stage={round.stage} />
                                </li>
                            ))}
                        </ul>
                    )}
                    {active.length > MAX_ACTIVE_ROUNDS && (
                        <Link className="home-panel__more" to={PATHS.rounds}>
                            すべて見る（{active.length}件）
                        </Link>
                    )}
                </section>

                <section className="home-panel" aria-labelledby="home-draft-heading">
                    <h2 id="home-draft-heading" className="home-section__title">
                        続きから書く
                    </h2>
                    {lastDraft ? (
                        <Link
                            className="home-draft"
                            to={generatePath(PATHS.recordEdit, { recordId: lastDraft.recordId })}
                        >
                            <span className="home-draft__name">{lastDraft.companyName}</span>
                            <StatusMark status={lastDraft.status} size="sm" />
                            <span className="home-draft__time">
                                最終更新 {formatDateTime(lastDraft.updatedAt)}
                            </span>
                        </Link>
                    ) : (
                        <EmptyState message="下書きはありません。" />
                    )}
                </section>
            </div>
        </>
    );
}

// Instructor / admin view: an overview of all students.
function StaffSummary({ data }) {
    const { rounds, students } = data;
    const activeStudents = students.filter((s) => s.status === 'active');
    const counts = Object.fromEntries(STAGE_ORDER.map((stage) => [stage, 0]));
    rounds.forEach((round) => {
        counts[round.stage] += 1;
    });

    return (
        <>
            <ul className="home-stats">
                <StatTile
                    to={PATHS.adminUsers}
                    label="利用中の学生"
                    value={activeStudents.length}
                    index={0}
                />
                <StatTile
                    to={PATHS.rounds}
                    label="選考中・結果待ち"
                    value={counts[STAGES.IN_PROGRESS]}
                    index={1}
                />
                <StatTile to={PATHS.rounds} label="内定" value={counts[STAGES.OFFERED]} index={2} />
            </ul>

            <section className="home-panel" aria-labelledby="home-stage-heading">
                <h2 id="home-stage-heading" className="home-section__title">
                    選考段階の内訳（全{rounds.length}件）
                </h2>
                <ul className="home-breakdown">
                    {STAGE_ORDER.map((stage) => (
                        <li key={stage} className="home-breakdown__item">
                            <StatusMark status={stage} />
                            <AnimatedNumber
                                className="home-breakdown__count"
                                value={counts[stage]}
                            />
                        </li>
                    ))}
                </ul>
            </section>
        </>
    );
}

// Summary block of the home screen. A failure here never hides the shortcuts below it.
function HomeSummary({ role, refreshKey = 0 }) {
    const isStudent = role === ROLES.STUDENT;
    const [reloadCount, setReloadCount] = useState(0);
    const [result, setResult] = useState({ key: null, data: null, error: null });
    const requestKey = `${role}|${reloadCount}|${refreshKey}`;

    useEffect(() => {
        let cancelled = false;
        const request = isStudent
            ? Promise.all([
                  listMyActivityRecords(),
                  listApplicationRounds(),
                  listCompanyOptions(),
              ]).then(([mine, rounds, companies]) => ({ mine, rounds, companies }))
            : Promise.all([listApplicationRounds(), listUsers({ role: ROLES.STUDENT })]).then(
                  ([rounds, students]) => ({ rounds, students }),
              );
        request
            .then((data) => !cancelled && setResult({ key: requestKey, data, error: null }))
            .catch((error) => !cancelled && setResult({ key: requestKey, data: null, error }));
        return () => {
            cancelled = true;
        };
    }, [isStudent, requestKey]);

    // After a refresh keep showing the old numbers until the new ones arrive.
    if (result.key === null) return <Loading />;
    if (result.error) {
        return <ErrorMessage error={result.error} onRetry={() => setReloadCount((n) => n + 1)} />;
    }
    return isStudent ? <StudentSummary data={result.data} /> : <StaffSummary data={result.data} />;
}

export default HomeSummary;
