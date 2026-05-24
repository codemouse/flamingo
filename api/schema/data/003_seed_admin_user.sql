-- Seed: bootstrap the first admin user.
-- Username: admin | Password: admin | Email: briansodano@gmail.com | Role: admin

INSERT INTO users (username, email, password_hash, role)
VALUES (
  'admin',
  'briansodano@gmail.com',
  '$2b$12$8KcGLBoPBoQMZhD15UupeeoXDKPFToQ.AErgr2gpyHPyzf/z/kyH6',
  'admin'
)
ON CONFLICT (username) DO NOTHING;
