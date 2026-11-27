// DBパスワードなどの機密情報は環境変数から読み込む。AWS では Secrets Manager または Lambda の環境設定で渡す。
// 機密情報をコードやコミットに含めない。

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
        // 複数の Lambda が同じ RDS に並行して接続するため、各プールの接続数を抑える。
        connectionLimit: readInt('DB_CONNECTION_LIMIT', 2),
    },
    // Cognito の JWT から AD グループ一覧と表示名を取得する。実際のクレーム名は未確認のため設定で指定する（F-001 要確認3）。
    auth: {
        groupsClaim: process.env.AD_GROUPS_CLAIM || 'custom:ad_role',
        studentGroup: process.env.AD_STUDENT_GROUP || 'student',
        instructorGroup: process.env.AD_INSTRUCTOR_GROUP || 'instructor',
        displayNameClaim: process.env.DISPLAY_NAME_CLAIM || 'name',
    },
};

module.exports = { config };
