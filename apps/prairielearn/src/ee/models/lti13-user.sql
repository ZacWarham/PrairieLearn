-- BLOCK update_lti13_users
INSERT INTO
  lti13_users (user_id, lti13_instance_id, sub)
VALUES
  ($user_id, $lti13_instance_id, $sub)
ON CONFLICT (user_id, lti13_instance_id) DO UPDATE
SET
  sub = $sub;
