CREATE TABLE ledger_permissions (
    permission_id   VARCHAR(20)  NOT NULL,
    ledger_id       VARCHAR(20)  NOT NULL,
    user_id         VARCHAR(20)  NOT NULL,
    permission_type VARCHAR(20)  NOT NULL,
    granted_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at      TIMESTAMP,
    CONSTRAINT pk_ledger_permissions PRIMARY KEY (permission_id),
    CONSTRAINT fk_ledger_permissions_ledger FOREIGN KEY (ledger_id) REFERENCES ledgers(ledger_id),
    CONSTRAINT fk_ledger_permissions_user   FOREIGN KEY (user_id)   REFERENCES users(user_id),
    CONSTRAINT uq_ledger_permissions UNIQUE (ledger_id, user_id),
    CONSTRAINT chk_ledger_permissions_type CHECK (permission_type IN ('VIEWER', 'EDITOR', 'ADMIN'))
);
