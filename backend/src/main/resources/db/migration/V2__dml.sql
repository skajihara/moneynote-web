-- ============================================================
-- V2__dml.sql  初期データ（統合版）
-- ============================================================

-- システム管理者ユーザー（初期パスワードは別途管理。本番環境では起動後に必ず変更すること）
INSERT INTO users (user_id, user_name, email, password_hash, role, is_active)
VALUES (
    'admin',
    '管理者',
    'admin@example.com',
    '$2a$12$db62H9PxPj.UmgCy2VlGvu81aKPIZY9ogdG2NtfMviHZl1hiBVOpi',
    'SYSTEM_ADMIN',
    TRUE
);
