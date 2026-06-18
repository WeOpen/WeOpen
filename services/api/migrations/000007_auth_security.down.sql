DELETE FROM role_permissions
WHERE role_id = 'role_admin' AND permission = 'user:manage';

DROP TABLE IF EXISTS login_attempts;

ALTER TABLE users DROP COLUMN IF EXISTS mfa_totp_secret;
ALTER TABLE users DROP COLUMN IF EXISTS mfa_enabled;
ALTER TABLE users DROP COLUMN IF EXISTS password_changed_at;
ALTER TABLE users DROP COLUMN IF EXISTS must_change_password;
