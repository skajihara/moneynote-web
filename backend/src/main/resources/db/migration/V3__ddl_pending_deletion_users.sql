-- pending_deletion_users: アカウント削除依頼ユーザー管理テーブル
-- 削除依頼時に登録し、毎日0時のバッチで物理削除する
CREATE TABLE pending_deletion_users (
    user_id      VARCHAR(20)  NOT NULL,
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_pending_deletion_users PRIMARY KEY (user_id),
    CONSTRAINT fk_pending_deletion_users_user FOREIGN KEY (user_id) REFERENCES users(user_id)
);
