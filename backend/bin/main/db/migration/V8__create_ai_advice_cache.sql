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
