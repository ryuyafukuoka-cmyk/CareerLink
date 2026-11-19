// Application round APIs (F-004-04): RD-01 to RD-06.
import { api } from './client.js';

// RD-01 POST /api/application-rounds -> ApplicationRound (201, stage is always `considering`)
// input: { studentUserId, companyId, applicationDate? }  applicationDate: 'YYYY/MM/DD' or null
// 429 RATE_LIMITED when this operator created a round less than 30 seconds ago.
export function createApplicationRound(input) {
    return api.post('/application-rounds', input);
}

// RD-02 GET /api/application-rounds -> ApplicationRound[]
export function listApplicationRounds({ studentUserId, companyId } = {}) {
    return api.get('/application-rounds', { query: { studentUserId, companyId } });
}

// RD-03 GET /api/application-rounds/{id} -> ApplicationRound
export function getApplicationRound(applicationRoundId) {
    return api.get(`/application-rounds/${applicationRoundId}`);
}

// RD-04 PATCH /api/application-rounds/{id} -> ApplicationRound
// patch: { stage?, statusNote?, applicationDate? } (one or more). Owner student and admin only.
export function updateApplicationRound(applicationRoundId, patch) {
    return api.patch(`/application-rounds/${applicationRoundId}`, patch);
}

// RD-05 GET /api/application-rounds/{id}/records -> ActivityRecordSummary[]
export function listRoundRecords(applicationRoundId) {
    return api.get(`/application-rounds/${applicationRoundId}/records`);
}

// RD-06 GET /api/application-rounds/{id}/history -> RoundHistory[] (editor and time only)
export function listRoundHistory(applicationRoundId) {
    return api.get(`/application-rounds/${applicationRoundId}/history`);
}
