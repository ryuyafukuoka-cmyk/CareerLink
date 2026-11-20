// Operation log values (API values -> display labels). Used by SC-06-04.

export { canonicalOperationType } from '../../backend/common/operationLogTypes.mjs';

export const OPERATION_TYPE_LABELS = Object.freeze({
    createActivityRecord: '活動記録の登録',
    saveDraft: '活動記録の下書き保存',
    completeActivityRecord: '活動記録の完了',
    updateActivityRecord: '活動記録の編集',
    deleteActivityRecord: '活動記録の削除',
    createApplicationRound: '応募回の登録',
    updateApplicationRound: '選考進捗の変更',
    createCompany: '企業の登録',
    updateCompany: '企業の編集',
    deleteCompany: '企業の削除',
    changeRole: 'ロール変更',
    setStatus: '利用状態の変更',
});

export const OPERATION_TYPE_ORDER = Object.freeze(Object.keys(OPERATION_TYPE_LABELS));

export const LOG_TARGET_TYPE_LABELS = Object.freeze({
    record: '活動記録',
    round: '応募回',
    company: '企業',
    user: 'ユーザ',
});

export const LOG_TARGET_TYPE_ORDER = Object.freeze(['record', 'round', 'company', 'user']);

export const OPERATION_RESULT_LABELS = Object.freeze({
    success: '成功',
    failure: '失敗',
});
