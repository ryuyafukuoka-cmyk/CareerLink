// Edit histories. Only editor and time are kept (no previous values or diffs).
// The mock server turns editorUserId into names and hides them from other students.

// Activity record edit history. Shape: { recordId, editorUserId, editedAt }.
export const recordHistory = [
    { recordId: '1', editorUserId: '1', editedAt: '2026-06-24T20:15:00+09:00' },
    { recordId: '1', editorUserId: '1', editedAt: '2026-06-25T08:40:00+09:00' },
    { recordId: '2', editorUserId: '1', editedAt: '2026-10-02T21:00:00+09:00' },
    { recordId: '3', editorUserId: '1', editedAt: '2026-10-15T18:30:00+09:00' },
    { recordId: '4', editorUserId: '1', editedAt: '2026-08-20T22:10:00+09:00' },
    { recordId: '4', editorUserId: '5', editedAt: '2026-08-25T13:05:00+09:00' },
    { recordId: '5', editorUserId: '2', editedAt: '2026-07-28T19:45:00+09:00' },
    { recordId: '6', editorUserId: '2', editedAt: '2026-09-30T17:20:00+09:00' },
    { recordId: '7', editorUserId: '2', editedAt: '2026-10-05T20:00:00+09:00' },
    { recordId: '8', editorUserId: '7', editedAt: '2026-10-20T16:50:00+09:00' },
    { recordId: '9', editorUserId: '3', editedAt: '2026-10-28T19:10:00+09:00' },
    { recordId: '10', editorUserId: '4', editedAt: '2025-07-20T21:30:00+09:00' },
    { recordId: '11', editorUserId: '4', editedAt: '2025-07-05T18:00:00+09:00' },
];

// Application round history. Shape follows `RoundHistory` plus the round it belongs to.
export const roundHistory = [
    {
        applicationRoundId: '1',
        editorUserId: '1',
        editorName: '山田 太郎',
        editedAt: '2026-06-10T19:00:00+09:00',
    },
    {
        applicationRoundId: '1',
        editorUserId: '1',
        editorName: '山田 太郎',
        editedAt: '2026-07-02T12:30:00+09:00',
    },
    {
        applicationRoundId: '2',
        editorUserId: '1',
        editorName: '山田 太郎',
        editedAt: '2026-09-20T18:00:00+09:00',
    },
    {
        applicationRoundId: '4',
        editorUserId: '1',
        editorName: '山田 太郎',
        editedAt: '2026-08-05T20:00:00+09:00',
    },
    {
        applicationRoundId: '4',
        editorUserId: '7',
        editorName: '管理者 太郎',
        editedAt: '2026-09-10T10:15:00+09:00',
    },
    {
        applicationRoundId: '5',
        editorUserId: '2',
        editorName: '佐藤 花子',
        editedAt: '2026-08-30T21:00:00+09:00',
    },
    {
        applicationRoundId: '7',
        editorUserId: '2',
        editorName: '佐藤 花子',
        editedAt: '2026-10-01T09:20:00+09:00',
    },
    {
        applicationRoundId: '9',
        editorUserId: '4',
        editorName: '高橋 健',
        editedAt: '2025-08-20T15:00:00+09:00',
    },
];
