// Selection stages of an application round (API values <-> labels).
// There is no "planned" stage and no separate "result" field.

export const STAGES = Object.freeze({
    CONSIDERING: 'considering',
    IN_PROGRESS: 'inProgress',
    DECLINED: 'declined',
    REJECTED: 'rejected',
    OFFERED: 'offered',
});

export const STAGE_LABELS = Object.freeze({
    considering: '未応募・検討中',
    inProgress: '選考中・結果待ち',
    declined: '辞退',
    rejected: '落選',
    offered: '内定',
});

// Order shown in selects. Also the order of the five stages in the design.
export const STAGE_ORDER = Object.freeze([
    'considering',
    'inProgress',
    'declined',
    'rejected',
    'offered',
]);

// [{ value, label }] for <Select>.
export const STAGE_OPTIONS = Object.freeze(
    STAGE_ORDER.map((value) => Object.freeze({ value, label: STAGE_LABELS[value] })),
);

// Rules that depend on the stage:
//  - application date may be empty only while considering
//  - interview question category may be empty only while considering
export function isConsidering(stage) {
    return stage === STAGES.CONSIDERING;
}
