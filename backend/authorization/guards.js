// Authorization guards (F-002-03). They throw AppError; they never trust anything the client sent
// about who it is. The Actor always comes from the RDS user row (role and status are read fresh).
const { forbidden } = require('../common/errors');

// Throws FORBIDDEN unless the actor has one of the allowed roles.
function requireRole(actor, allowedRoles) {
    if (!allowedRoles.includes(actor.role)) throw forbidden();
}

// Throws FORBIDDEN unless the actor owns the data (same userId) or has an allowed role.
function requireOwnerOrRole(actor, ownerUserId, allowedRoles) {
    if (actor.userId === ownerUserId) return;
    requireRole(actor, allowedRoles);
}

module.exports = { requireRole, requireOwnerOrRole };
