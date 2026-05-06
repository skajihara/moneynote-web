ALTER TABLE users
    ADD COLUMN role      VARCHAR(20)  NOT NULL DEFAULT 'USER',
    ADD COLUMN is_active BOOLEAN      NOT NULL DEFAULT TRUE;

INSERT INTO users (user_id, user_name, email, password_hash, role, is_active)
VALUES (
    'admin',
    '管理者',
    'admin@example.com',
    '$2a$12$db62H9PxPj.UmgCy2VlGvu81aKPIZY9ogdG2NtfMviHZl1hiBVOpi',
    'SYSTEM_ADMIN',
    TRUE
);
