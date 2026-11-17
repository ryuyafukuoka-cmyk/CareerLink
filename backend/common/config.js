// Environment-based settings. Secrets (DB password etc.) come from the environment, which in AWS
// is filled from Secrets Manager / Lambda environment settings. Never hard-code or commit them.

function readInt(name, fallback) {
    const raw = process.env[name];
    const value = raw === undefined || raw === '' ? NaN : Number(raw);
    return Number.isInteger(value) ? value : fallback;
}

const config = {
    db: {
        host: process.env.DB_HOST || 'localhost',
        port: readInt('DB_PORT', 3306),
        user: process.env.DB_USER || '',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'careerlink',
        // Lambda: keep the pool small; many concurrent Lambdas share one RDS.
        connectionLimit: readInt('DB_CONNECTION_LIMIT', 2),
    },
    // Where the AD group list and display name sit in the Cognito JWT. The real claim names are
    // still unconfirmed (F-001 要確認3), so they are settings, not code.
    auth: {
        groupsClaim: process.env.AD_GROUPS_CLAIM || 'custom:ad_role',
        studentGroup: process.env.AD_STUDENT_GROUP || 'student',
        instructorGroup: process.env.AD_INSTRUCTOR_GROUP || 'instructor',
        displayNameClaim: process.env.DISPLAY_NAME_CLAIM || 'name',
    },
};

module.exports = { config };
