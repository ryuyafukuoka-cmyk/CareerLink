// 投稿者・編集者の名前を表示できるのは本人、指導員、管理者。他の学生には null を返す（F-005-02 canViewPosterName）。
const { ROLES } = require('./constants');

function canViewPosterName(actor, ownerUserId) {
    return (
        actor.userId === ownerUserId ||
        actor.role === ROLES.INSTRUCTOR ||
        actor.role === ROLES.ADMIN
    );
}

module.exports = { canViewPosterName };
