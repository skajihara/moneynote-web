-- 既存の end_date が NULL のレコードを start_date + 10年に更新する
UPDATE fixed_transactions
SET end_date = start_date + INTERVAL '10 years'
WHERE end_date IS NULL;
