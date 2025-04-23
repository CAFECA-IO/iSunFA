-- Data migration: 改名 role
UPDATE "user_role"
SET "role_name" = 'INDIVIDUAL'
WHERE "role_name" IN ('BOOKKEEPER', 'EDUCATIONAL_TRIAL_VERSION');
