// Earlier clients and mock logs used short names. Existing rows and bookmarked filters stay readable.
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
