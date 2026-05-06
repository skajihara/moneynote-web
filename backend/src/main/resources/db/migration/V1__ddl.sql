-- ============================================================
-- V1__ddl.sql  全テーブル・インデックス定義（統合版）
-- テーブル順: users, ledgers, ledger_permissions, categories,
--           fixed_transactions, transactions, budgets, ai_advice_cache
-- ============================================================

CREATE TABLE users (
    user_id         VARCHAR(20)  NOT NULL,
    user_name       VARCHAR(100) NOT NULL,
    email           VARCHAR(255) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    theme_color     VARCHAR(30),
    role            VARCHAR(20)  NOT NULL DEFAULT 'USER',
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_users PRIMARY KEY (user_id),
    CONSTRAINT uq_users_email UNIQUE (email)
);

CREATE TABLE ledgers (
    ledger_id           VARCHAR(20)    NOT NULL,
    owner_user_id       VARCHAR(20)    NOT NULL,
    ledger_name         VARCHAR(100)   NOT NULL,
    initial_balance     DECIMAL(15,2)  NOT NULL DEFAULT 0,
    start_day_of_month  SMALLINT       NOT NULL DEFAULT 1,
    start_month_of_year SMALLINT       NOT NULL DEFAULT 1,
    theme_color         VARCHAR(30),
    is_active           BOOLEAN        NOT NULL DEFAULT true,
    created_at          TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_ledgers PRIMARY KEY (ledger_id),
    CONSTRAINT fk_ledgers_owner FOREIGN KEY (owner_user_id) REFERENCES users(user_id),
    CONSTRAINT chk_ledgers_start_day CHECK (start_day_of_month BETWEEN 1 AND 28),
    CONSTRAINT chk_ledgers_start_month CHECK (start_month_of_year BETWEEN 1 AND 12)
);

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

CREATE TABLE categories (
    category_id     VARCHAR(20)  NOT NULL,
    ledger_id       VARCHAR(20)  NOT NULL,
    category_name   VARCHAR(50)  NOT NULL,
    category_type   VARCHAR(20)  NOT NULL,
    icon            VARCHAR(10),
    color           VARCHAR(30),
    display_order   SMALLINT     NOT NULL DEFAULT 0,
    is_default      BOOLEAN      NOT NULL DEFAULT false,
    is_active       BOOLEAN      NOT NULL DEFAULT true,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_categories PRIMARY KEY (category_id),
    CONSTRAINT fk_categories_ledger FOREIGN KEY (ledger_id) REFERENCES ledgers(ledger_id),
    CONSTRAINT chk_categories_type CHECK (category_type IN ('INCOME', 'EXPENSE'))
);

-- fixed_transactions を transactions より先に定義（transactions の FK 参照先）
CREATE TABLE fixed_transactions (
    fixed_transaction_id VARCHAR(20)   NOT NULL,
    ledger_id            VARCHAR(20)   NOT NULL,
    category_id          VARCHAR(20),
    fixed_name           VARCHAR(100)  NOT NULL,
    transaction_type     VARCHAR(20)   NOT NULL,
    amount               DECIMAL(15,2) NOT NULL,
    day_of_month         SMALLINT      NOT NULL,
    start_date           DATE          NOT NULL,
    end_date             DATE,
    is_active            BOOLEAN       NOT NULL DEFAULT true,
    memo                 VARCHAR(500),
    interval_type        VARCHAR(20)   NOT NULL DEFAULT 'MONTHLY',
    created_at           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_fixed_transactions PRIMARY KEY (fixed_transaction_id),
    CONSTRAINT fk_fixed_transactions_ledger   FOREIGN KEY (ledger_id)   REFERENCES ledgers(ledger_id),
    CONSTRAINT fk_fixed_transactions_category FOREIGN KEY (category_id) REFERENCES categories(category_id),
    CONSTRAINT chk_fixed_transactions_type    CHECK (transaction_type IN ('INCOME', 'EXPENSE')),
    CONSTRAINT chk_fixed_transactions_day     CHECK (day_of_month BETWEEN 1 AND 28),
    CONSTRAINT chk_fixed_transactions_interval_type CHECK (interval_type IN ('DAILY','WEEKLY','BIWEEKLY','MONTHLY','BIMONTHLY','QUARTERLY','SEMIANNUAL','ANNUAL'))
);

-- fixed_transaction_id FK はテーブル定義時点でインライン化（V5/V6 の相互参照を解消）
CREATE TABLE transactions (
    transaction_id       VARCHAR(20)   NOT NULL,
    ledger_id            VARCHAR(20)   NOT NULL,
    category_id          VARCHAR(20),
    fixed_transaction_id VARCHAR(20),
    transaction_type     VARCHAR(20)   NOT NULL,
    amount               DECIMAL(15,2) NOT NULL,
    transaction_date     DATE          NOT NULL,
    memo                 VARCHAR(500),
    is_fixed_origin      BOOLEAN       NOT NULL DEFAULT false,
    created_at           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_transactions PRIMARY KEY (transaction_id),
    CONSTRAINT fk_transactions_ledger   FOREIGN KEY (ledger_id)            REFERENCES ledgers(ledger_id),
    CONSTRAINT fk_transactions_category FOREIGN KEY (category_id)          REFERENCES categories(category_id),
    CONSTRAINT fk_transactions_fixed    FOREIGN KEY (fixed_transaction_id) REFERENCES fixed_transactions(fixed_transaction_id),
    CONSTRAINT chk_transactions_type    CHECK (transaction_type IN ('INCOME', 'EXPENSE'))
);

CREATE TABLE budgets (
    budget_id   VARCHAR(20)   NOT NULL,
    ledger_id   VARCHAR(20)   NOT NULL,
    category_id VARCHAR(20)   NOT NULL,
    year        SMALLINT      NOT NULL,
    month       SMALLINT      NOT NULL,
    amount      DECIMAL(15,2) NOT NULL,
    created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_budgets PRIMARY KEY (budget_id),
    CONSTRAINT fk_budgets_ledger   FOREIGN KEY (ledger_id)   REFERENCES ledgers(ledger_id),
    CONSTRAINT fk_budgets_category FOREIGN KEY (category_id) REFERENCES categories(category_id),
    CONSTRAINT uq_budgets UNIQUE (ledger_id, category_id, year, month),
    CONSTRAINT chk_budgets_month CHECK (month BETWEEN 1 AND 12)
);

CREATE TABLE ai_advice_cache (
    cache_id     VARCHAR(20)  NOT NULL,
    ledger_id    VARCHAR(20)  NOT NULL,
    period_type  VARCHAR(20)  NOT NULL,
    advice_type  VARCHAR(20)  NOT NULL,
    advice_text  TEXT         NOT NULL,
    generated_at TIMESTAMP    NOT NULL,
    expires_at   TIMESTAMP    NOT NULL,
    CONSTRAINT pk_ai_advice_cache PRIMARY KEY (cache_id),
    CONSTRAINT fk_ai_advice_cache_ledger FOREIGN KEY (ledger_id) REFERENCES ledgers(ledger_id),
    CONSTRAINT chk_ai_advice_cache_period CHECK (period_type IN ('ONE_MONTH', 'THREE_MONTHS', 'TWELVE_MONTHS')),
    CONSTRAINT chk_ai_advice_cache_type   CHECK (advice_type   IN ('INSIGHT', 'ADVICE', 'FORECAST'))
);

-- インデックス
CREATE INDEX idx_transactions_ledger_id        ON transactions(ledger_id);
CREATE INDEX idx_transactions_transaction_date  ON transactions(transaction_date);
CREATE INDEX idx_transactions_category_id       ON transactions(category_id);
CREATE INDEX idx_fixed_transactions_ledger_id   ON fixed_transactions(ledger_id);
CREATE INDEX idx_ledger_permissions_user_id     ON ledger_permissions(user_id);
CREATE INDEX idx_ai_advice_cache_ledger_id      ON ai_advice_cache(ledger_id);
