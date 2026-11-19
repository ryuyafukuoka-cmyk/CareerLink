// Who may see names (F-005-02 canViewPosterName). The person themself, instructors and admins
// may; other students never see poster / editor names (the API returns null instead).
const { ROLES } = require('./constants');

function canViewPosterName(actor, ownerUserId) {
    return (
        actor.userId === ownerUserId ||
        actor.role === ROLES.INSTRUCTOR ||
        actor.role === ROLES.ADMIN
    );
}

module.exports = { canViewPosterName };
