// Activity record APIs (F-004-01 to F-004-03, F-005-02): R-01 to R-09 and S-02.
import { api } from './client.js';

// R-01 POST /api/activity-records -> ActivityRecord (201)
// input: ActivityRecordInput + mode ('draft' | 'complete'). ownerUserId is for admins only.
// 429 RATE_LIMITED when this operator created a record less than 30 seconds ago.
export function createActivityRecord(input) {
    return api.post('/activity-records', input);
}

// R-02 GET /api/activity-records/mine -> ActivityRecordSummary[] (drafts first, then completed)
export function listMyActivityRecords() {
    return api.get('/activity-records/mine');
}

// R-03 GET /api/activity-records/drafts -> ActivityRecordSummary[] (admin: any student, student: own)
export function listDrafts({ userId } = {}) {
    return api.get('/activity-records/drafts', { query: { userId } });
}

// R-04 GET /api/activity-records/{recordId}/edit -> ActivityRecord
export function getRecordForEdit(recordId) {
    return api.get(`/activity-records/${recordId}/edit`);
}

// R-05 PUT /api/activity-records/{recordId}/draft -> ActivityRecord (stays a draft)
export function saveDraft(recordId, input) {
    return api.put(`/activity-records/${recordId}/draft`, input);
}

// R-06 POST /api/activity-records/{recordId}/complete -> ActivityRecord (becomes completed)
export function completeActivityRecord(recordId, input) {
    return api.post(`/activity-records/${recordId}/complete`, input);
}

// R-07 PUT /api/activity-records/{recordId} -> ActivityRecord (edit a completed record)
export function updateActivityRecord(recordId, input) {
    return api.put(`/activity-records/${recordId}`, input);
}

// R-08 GET /api/activity-records/{recordId}/delete-confirm -> DeleteConfirmInfo
export function getDeleteConfirmInfo(recordId) {
    return api.get(`/activity-records/${recordId}/delete-confirm`);
}

// R-09 DELETE /api/activity-records/{recordId} -> null
export function deleteActivityRecord(recordId) {
    return api.delete(`/activity-records/${recordId}`);
}

// S-02 GET /api/activity-records/{recordId} -> RecordDetail
export function getRecordDetail(recordId) {
    return api.get(`/activity-records/${recordId}`);
}
