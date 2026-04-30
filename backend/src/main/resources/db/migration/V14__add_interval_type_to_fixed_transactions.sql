ALTER TABLE fixed_transactions
    ADD COLUMN interval_type VARCHAR(20) NOT NULL DEFAULT 'MONTHLY';

ALTER TABLE fixed_transactions
    ADD CONSTRAINT chk_fixed_transactions_interval_type
        CHECK (interval_type IN ('DAILY','WEEKLY','BIWEEKLY','MONTHLY','BIMONTHLY','QUARTERLY','SEMIANNUAL','ANNUAL'));
