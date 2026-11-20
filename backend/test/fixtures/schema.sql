-- Integration test fixture: tables and reference data from the CareerLink DB design.

CREATE TABLE users (
    users_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    users_name VARCHAR(100) NOT NULL,
    graduation_year SMALLINT UNSIGNED NULL,
    active TINYINT UNSIGNED NOT NULL DEFAULT 1,
    last_application_created_at DATETIME(6) NULL DEFAULT NULL,
    last_activity_created_at DATETIME(6) NULL DEFAULT NULL,

    PRIMARY KEY (users_id),

    CONSTRAINT chk_users_active
        CHECK (active IN (0, 1))
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_auth (
    user_auth_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    users_id INT UNSIGNED NOT NULL,
    auth_issuer VARCHAR(255) COLLATE utf8mb4_bin NOT NULL,
    auth_subject VARCHAR(255) COLLATE utf8mb4_bin NOT NULL,

    PRIMARY KEY (user_auth_id),

    UNIQUE KEY uq_user_auth_users (users_id),
    UNIQUE KEY uq_user_auth_identity (
        auth_issuer,
        auth_subject
    ),

    CONSTRAINT fk_user_auth_users
        FOREIGN KEY (users_id)
        REFERENCES users (users_id)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE roles (
    role_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    role_name VARCHAR(20) NOT NULL,
    role_description VARCHAR(255) NULL,

    PRIMARY KEY (role_id),

    UNIQUE KEY uq_roles_name (role_name)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

INSERT INTO roles (role_name, role_description) VALUES
    ('学生', NULL),
    ('指導員', NULL),
    ('管理者', NULL);

CREATE TABLE user_roles (
    user_role_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    users_id INT UNSIGNED NOT NULL,
    role_id INT UNSIGNED NOT NULL,

    PRIMARY KEY (user_role_id),

    UNIQUE KEY uq_user_roles_users (users_id),

    CONSTRAINT fk_user_roles_users
        FOREIGN KEY (users_id)
        REFERENCES users (users_id),

    CONSTRAINT fk_user_roles_roles
        FOREIGN KEY (role_id)
        REFERENCES roles (role_id)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE companies (
    company_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    company_name VARCHAR(255) NOT NULL,
    company_name_kana VARCHAR(255) NOT NULL,
    website_url VARCHAR(2048) NULL,
    created_by INT UNSIGNED NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by INT UNSIGNED NOT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deletion_version BIGINT UNSIGNED NOT NULL DEFAULT 0
        COMMENT '企業および関連データの変更検知用バージョン',

    PRIMARY KEY (company_id),

    CONSTRAINT fk_companies_created_by
        FOREIGN KEY (created_by)
        REFERENCES users (users_id),

    CONSTRAINT fk_companies_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES users (users_id)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE prefectures (
    prefecture_id TINYINT UNSIGNED NOT NULL,
    area_name VARCHAR(20) NOT NULL,

    PRIMARY KEY (prefecture_id),

    UNIQUE KEY uq_prefectures_area_name (area_name)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

INSERT INTO prefectures (prefecture_id, area_name) VALUES
    (1,  '北海道'),
    (2,  '青森県'),
    (3,  '岩手県'),
    (4,  '宮城県'),
    (5,  '秋田県'),
    (6,  '山形県'),
    (7,  '福島県'),
    (8,  '茨城県'),
    (9,  '栃木県'),
    (10, '群馬県'),
    (11, '埼玉県'),
    (12, '千葉県'),
    (13, '東京都'),
    (14, '神奈川県'),
    (15, '新潟県'),
    (16, '富山県'),
    (17, '石川県'),
    (18, '福井県'),
    (19, '山梨県'),
    (20, '長野県'),
    (21, '岐阜県'),
    (22, '静岡県'),
    (23, '愛知県'),
    (24, '三重県'),
    (25, '滋賀県'),
    (26, '京都府'),
    (27, '大阪府'),
    (28, '兵庫県'),
    (29, '奈良県'),
    (30, '和歌山県'),
    (31, '鳥取県'),
    (32, '島根県'),
    (33, '岡山県'),
    (34, '広島県'),
    (35, '山口県'),
    (36, '徳島県'),
    (37, '香川県'),
    (38, '愛媛県'),
    (39, '高知県'),
    (40, '福岡県'),
    (41, '佐賀県'),
    (42, '長崎県'),
    (43, '熊本県'),
    (44, '大分県'),
    (45, '宮崎県'),
    (46, '鹿児島県'),
    (47, '沖縄県'),
    (48, '東北'),
    (49, '関東'),
    (50, '北陸・甲信越'),
    (51, '東海'),
    (52, '関西'),
    (53, '中国'),
    (54, '四国'),
    (55, '九州');

CREATE TABLE company_locations (
    company_location_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    company_id INT UNSIGNED NOT NULL,
    prefecture_id TINYINT UNSIGNED NOT NULL,

    PRIMARY KEY (company_location_id),

    UNIQUE KEY uq_company_locations_company_prefecture (
        company_id,
        prefecture_id
    ),

    CONSTRAINT fk_company_locations_companies
        FOREIGN KEY (company_id)
        REFERENCES companies (company_id),

    CONSTRAINT fk_company_locations_prefectures
        FOREIGN KEY (prefecture_id)
        REFERENCES prefectures (prefecture_id)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE activity_types (
    activity_type_id TINYINT UNSIGNED NOT NULL,
    activity_type_name VARCHAR(20) NOT NULL,

    PRIMARY KEY (activity_type_id),

    UNIQUE KEY uq_activity_types_name (activity_type_name)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

INSERT INTO activity_types (
    activity_type_id,
    activity_type_name
) VALUES
    (1, '面接'),
    (2, '試験'),
    (3, '説明会'),
    (4, 'その他');

CREATE TABLE question_categories (
    question_category_id TINYINT UNSIGNED NOT NULL,
    question_category_name VARCHAR(50) NOT NULL,

    PRIMARY KEY (question_category_id),

    UNIQUE KEY uq_question_categories_name (
        question_category_name
    )
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

INSERT INTO question_categories (
    question_category_id,
    question_category_name
) VALUES
    (1,  '自己紹介・自己PR'),
    (2,  '志望動機・企業理解'),
    (3,  '学校生活・学習'),
    (4,  'IT技術・資格・制作'),
    (5,  '経験・実績'),
    (6,  '人柄・価値観'),
    (7,  'チームワーク・対人関係'),
    (8,  '課題解決・失敗経験'),
    (9,  '将来像・働き方'),
    (10, '就職活動・選考状況'),
    (11, 'その他');

CREATE TABLE selection_statuses (
    selection_status_id TINYINT UNSIGNED NOT NULL,
    selection_status_name VARCHAR(20) NOT NULL,

    PRIMARY KEY (selection_status_id),

    UNIQUE KEY uq_selection_statuses_name (
        selection_status_name
    )
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

INSERT INTO selection_statuses (
    selection_status_id,
    selection_status_name
) VALUES
    (1, '未応募・検討中'),
    (2, '選考中・結果待ち'),
    (3, '辞退'),
    (4, '落選'),
    (5, '内定');

CREATE TABLE applications (
    application_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    owner_id INT UNSIGNED NOT NULL,
    company_id INT UNSIGNED NOT NULL,
    application_date DATE NULL,
    selection_status_id TINYINT UNSIGNED NOT NULL DEFAULT 1,
    selection_notes TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by INT UNSIGNED NOT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (application_id),

    CONSTRAINT fk_applications_owner
        FOREIGN KEY (owner_id)
        REFERENCES users (users_id),

    CONSTRAINT fk_applications_companies
        FOREIGN KEY (company_id)
        REFERENCES companies (company_id),

    CONSTRAINT fk_applications_selection_statuses
        FOREIGN KEY (selection_status_id)
        REFERENCES selection_statuses (selection_status_id),

    CONSTRAINT fk_applications_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES users (users_id)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE activities (
    activity_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    application_id INT UNSIGNED NOT NULL,
    created_by INT UNSIGNED NOT NULL,
    activity_date DATE NULL,
    record_status TINYINT UNSIGNED NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by INT UNSIGNED NOT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (activity_id),

    CONSTRAINT chk_activities_record_status
        CHECK (record_status IN (0, 1)),

    CONSTRAINT fk_activities_applications
        FOREIGN KEY (application_id)
        REFERENCES applications (application_id),

    CONSTRAINT fk_activities_created_by
        FOREIGN KEY (created_by)
        REFERENCES users (users_id),

    CONSTRAINT fk_activities_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES users (users_id)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE activity_details (
    activity_detail_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    activity_id INT UNSIGNED NOT NULL,
    activity_type_id TINYINT UNSIGNED NOT NULL,

    PRIMARY KEY (activity_detail_id),

    UNIQUE KEY uq_activity_details_activity_type (
        activity_id,
        activity_type_id
    ),

    CONSTRAINT fk_activity_details_activities
        FOREIGN KEY (activity_id)
        REFERENCES activities (activity_id),

    CONSTRAINT fk_activity_details_activity_types
        FOREIGN KEY (activity_type_id)
        REFERENCES activity_types (activity_type_id)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE interviews (
    interview_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    activity_detail_id INT UNSIGNED NOT NULL,
    duration_minutes SMALLINT UNSIGNED NULL,
    interview_format VARCHAR(100) NULL,
    interviewer_count TINYINT UNSIGNED NULL,
    impressions TEXT NULL,
    cautions TEXT NULL,
    advice TEXT NULL,

    PRIMARY KEY (interview_id),

    UNIQUE KEY uq_interviews_activity_detail (
        activity_detail_id
    ),

    CONSTRAINT fk_interviews_activity_details
        FOREIGN KEY (activity_detail_id)
        REFERENCES activity_details (activity_detail_id)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE interview_questions (
    interview_question_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    interview_id INT UNSIGNED NOT NULL,
    question_category_id TINYINT UNSIGNED NULL,
    question_text TEXT NULL,
    answer_text TEXT NULL,
    follow_up_questions TEXT NULL,
    display_order SMALLINT UNSIGNED NOT NULL,

    PRIMARY KEY (interview_question_id),

    CONSTRAINT fk_interview_questions_interviews
        FOREIGN KEY (interview_id)
        REFERENCES interviews (interview_id),

    CONSTRAINT fk_interview_questions_categories
        FOREIGN KEY (question_category_id)
        REFERENCES question_categories (question_category_id)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE exams (
    exam_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    activity_detail_id INT UNSIGNED NOT NULL,
    exam_name_format VARCHAR(255) NULL,
    duration_minutes SMALLINT UNSIGNED NULL,
    exam_content TEXT NULL,
    difficulty VARCHAR(100) NULL,
    preparation TEXT NULL,
    impressions TEXT NULL,
    cautions TEXT NULL,

    PRIMARY KEY (exam_id),

    UNIQUE KEY uq_exams_activity_detail (
        activity_detail_id
    ),

    CONSTRAINT fk_exams_activity_details
        FOREIGN KEY (activity_detail_id)
        REFERENCES activity_details (activity_detail_id)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE briefings (
    briefing_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    activity_detail_id INT UNSIGNED NOT NULL,
    learned_info TEXT NULL,
    key_points TEXT NULL,
    questions_answers TEXT NULL,
    impressions TEXT NULL,

    PRIMARY KEY (briefing_id),

    UNIQUE KEY uq_briefings_activity_detail (
        activity_detail_id
    ),

    CONSTRAINT fk_briefings_activity_details
        FOREIGN KEY (activity_detail_id)
        REFERENCES activity_details (activity_detail_id)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE other_activities (
    other_activity_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    activity_detail_id INT UNSIGNED NOT NULL,
    activity_name VARCHAR(100) NULL,
    activity_content TEXT NULL,
    key_points TEXT NULL,
    impressions_advice TEXT NULL,

    PRIMARY KEY (other_activity_id),

    UNIQUE KEY uq_other_activities_detail (
        activity_detail_id
    ),

    CONSTRAINT fk_other_activities_details
        FOREIGN KEY (activity_detail_id)
        REFERENCES activity_details (activity_detail_id)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE selection_history (
    selection_history_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    application_id INT UNSIGNED NOT NULL,
    updated_by INT UNSIGNED NOT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (selection_history_id),

    CONSTRAINT fk_selection_history_applications
        FOREIGN KEY (application_id)
        REFERENCES applications (application_id),

    CONSTRAINT fk_selection_history_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES users (users_id)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE activity_history (
    activity_history_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    activity_id INT UNSIGNED NOT NULL,
    updated_by INT UNSIGNED NOT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (activity_history_id),

    CONSTRAINT fk_activity_history_activities
        FOREIGN KEY (activity_id)
        REFERENCES activities (activity_id),

    CONSTRAINT fk_activity_history_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES users (users_id)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE operation_logs (
    operation_log_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    users_id INT UNSIGNED NOT NULL,
    operation_type VARCHAR(50) NOT NULL,
    target_table VARCHAR(64) NOT NULL,
    target_id INT UNSIGNED NULL,
    operation_details TEXT NULL,
    operation_result VARCHAR(10) NOT NULL,
    operated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (operation_log_id),

    CONSTRAINT fk_operation_logs_users
        FOREIGN KEY (users_id)
        REFERENCES users (users_id)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;
