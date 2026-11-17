// Express middleware for every protected route (after authenticate): loads the Actor from RDS.
// Order of the checks (F-002-03): JWT (gateway) -> account status -> role -> owner/state.
// Unregistered or inactive users get a plain FORBIDDEN here; the login route has its own handling
// (it must be able to create the user on first login and report NOT_ELIGIBLE / ACCOUNT_INACTIVE).
const { forbidden } = require('../common/errors');
const { USER_STATUSES } = require('../common/constants');
const userRepository = require('../repositories/userRepository');

async function loadActor(req, res, next) {
    const user = await userRepository.findByAuthIdentity(req.claims.issuer, req.claims.subject);
    if (!user || user.status !== USER_STATUSES.ACTIVE) throw forbidden();
    // Actor = authenticated userId + the role stored in RDS (F-001 型).
    req.actor = { userId: user.userId, role: user.role };
    next();
}

module.exports = { loadActor };
