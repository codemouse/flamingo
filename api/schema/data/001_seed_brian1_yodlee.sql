-- Seed: link Flamingo user "brian1" to the Yodlee sandbox test account.
-- sbMem68c09b712b5831 is the pre-existing Yodlee sandbox user with demo
-- bank/credit-card data.

UPDATE users
SET yodlee_login_name = 'sbMem68c09b712b5831'
WHERE username = 'brian1'
  AND yodlee_login_name IS NULL;
