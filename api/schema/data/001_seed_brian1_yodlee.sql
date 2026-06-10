-- Seed: link Flamingo user "brian1" to the Yodlee sandbox test account.
-- sbMem68c09b712b5831 is the pre-existing Yodlee sandbox user with demo
-- bank/credit-card data. The yodlee_login_name column was dropped in 006_,
-- so this seed is a no-op against a current schema and is kept only for
-- historical replay against pre-006 environments.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'yodlee_login_name'
  ) THEN
    EXECUTE $sql$
      UPDATE users
      SET yodlee_login_name = 'sbMem68c09b712b5831'
      WHERE username = 'brian1'
        AND yodlee_login_name IS NULL
    $sql$;
  END IF;
END $$;
