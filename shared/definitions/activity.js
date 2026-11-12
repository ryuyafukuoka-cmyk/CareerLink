// Activity types, record status and save modes.

export const ACTIVITY_TYPES = Object.freeze({
    INTERVIEW: 'interview',
    EXAM: 'exam',
    BRIEFING: 'briefing',
    OTHER: 'other',
});

export const ACTIVITY_TYPE_LABELS = Object.freeze({
    interview: '面接',
    exam: '試験',
    briefing: '説明会',
    other: 'その他',
});

// Display order of the type tags.
export const ACTIVITY_TYPE_ORDER = Object.freeze(['interview', 'exam', 'briefing', 'other']);

export const RECORD_STATUSES = Object.freeze({
    DRAFT: 'draft',
    COMPLETED: 'completed',
});

export const RECORD_STATUS_LABELS = Object.freeze({
    draft: '下書き',
    completed: '公開済み',
});

// Save mode sent with a new record (R-01).
export const SAVE_MODES = Object.freeze({
    DRAFT: 'draft',
    COMPLETE: 'complete',
});

// Search match mode (S-01).
export const MATCH_MODES = Object.freeze({
    PARTIAL: 'partial',
    EXACT: 'exact',
});

export const MATCH_MODE_LABELS = Object.freeze({
    partial: '部分一致',
    exact: '完全一致（単語単位）',
});
