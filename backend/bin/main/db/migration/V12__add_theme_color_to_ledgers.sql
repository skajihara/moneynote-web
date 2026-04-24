ALTER TABLE ledgers ADD COLUMN theme_color VARCHAR(30);
UPDATE ledgers SET theme_color = '#4A90D9' WHERE theme_color IS NULL;
