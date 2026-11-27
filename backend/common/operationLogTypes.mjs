// 旧クライアントやモックのログで使った短い種別名にも対応し、保存済みの履歴やブックマークの絞り込み条件を引き続き使えるようにする。
const names = [
    ['createRecord', 'createActivityRecord'],
    ['updateRecord', 'updateActivityRecord'],
    ['deleteRecord', 'deleteActivityRecord'],
    ['createRound', 'createApplicationRound'],
    ['updateRound', 'updateApplicationRound'],
];
const canonicalNames = new Map(names);
const legacyNames = new Map(names.map(([legacy, canonical]) => [canonical, legacy]));

export function canonicalOperationType(value) {
    return canonicalNames.get(value) ?? value;
}

export function matchingOperationTypes(value) {
    const canonical = canonicalOperationType(value);
    const legacy = legacyNames.get(canonical);
    return legacy ? [canonical, legacy] : [canonical];
}
