// Backend copies of the values in shared/definitions (those files are ES modules; the backend is
// CommonJS). Keep in sync with shared/definitions/roles.js. Later steps will add stages,
// activity types, regions and question categories here.

const ROLES = Object.freeze({ STUDENT: 'student', INSTRUCTOR: 'instructor', ADMIN: 'admin' });
const ROLE_VALUES = Object.freeze(Object.values(ROLES));

const USER_STATUSES = Object.freeze({ ACTIVE: 'active', INACTIVE: 'inactive' });
const USER_STATUS_VALUES = Object.freeze(Object.values(USER_STATUSES));

module.exports = { ROLES, ROLE_VALUES, USER_STATUSES, USER_STATUS_VALUES };
