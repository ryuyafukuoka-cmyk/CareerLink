// Small helpers shared by the round screens (SC-02-04 to SC-02-07).
import { getMessage } from '@/messages';

export const FIELD_LABELS = {
    studentUserId: '対象学生',
    companyId: '企業',
    applicationDate: '応募日',
    stage: '選考段階',
    statusNote: '選考状況',
};

// Message for a field error. The API uses E-207 (実施日) for the application date; show the format message instead.
export function fieldMessage(field, messageId) {
    const id = field === 'applicationDate' && messageId === 'E-207' ? 'E-202' : messageId;
    return getMessage(id, { 項目名: FIELD_LABELS[field] ?? '' });
}

// Round number per student and company: 1 for the first round, 2 for the re-application, ...
// Returns Map<applicationRoundId, number>.
export function numberRounds(rounds) {
    const counters = new Map();
    const numbers = new Map();
    [...rounds]
        .sort((a, b) => Number(a.applicationRoundId) - Number(b.applicationRoundId))
        .forEach((round) => {
            const key = `${round.studentUserId}|${round.companyId}`;
            const next = (counters.get(key) ?? 0) + 1;
            counters.set(key, next);
            numbers.set(round.applicationRoundId, next);
        });
    return numbers;
}

// Group rounds by company, keeping the incoming order. Returns [{ companyId, rounds }].
export function groupByCompany(rounds) {
    const groups = new Map();
    rounds.forEach((round) => {
        if (!groups.has(round.companyId)) groups.set(round.companyId, []);
        groups.get(round.companyId).push(round);
    });
    return [...groups].map(([companyId, items]) => ({ companyId, rounds: items }));
}

export const displayDate = (date) => date ?? '未設定';

// [{ value, label }] of students for a <Select>.
export function studentOptions(students) {
    return students.map((s) => ({
        value: s.userId,
        label: s.graduationYear ? `${s.displayName}（${s.graduationYear}年度卒）` : s.displayName,
    }));
}
