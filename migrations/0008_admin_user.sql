-- Pre-provisions the Style Vault admin account
INSERT INTO users (email, name, password_hash, created_at)
VALUES (
  'yourstylevaultapp@gmail.com',
  'Style Vault Admin',
  'pbkdf2-sha256$100000$fv/LQWcBENS+rIwotblMhg==$eKJeK/adgIWWj5xK0/DfmgyQtaNrHHPoSy+dARUxpz4=',
  unixepoch()
)
ON CONFLICT(email) DO UPDATE SET
  password_hash = 'pbkdf2-sha256$100000$fv/LQWcBENS+rIwotblMhg==$eKJeK/adgIWWj5xK0/DfmgyQtaNrHHPoSy+dARUxpz4=';

