-- Add a Grocery Item.
\set u random(1, 2000)
\set h (:u + 1) / 2
BEGIN;
SELECT set_config('role', 'authenticated', true), set_config('request.jwt.claims', json_build_object('sub', '5ca1e001-0000-4000-8000-' || lpad(':u', 12, '0'), 'role', 'authenticated')::text, true);
SELECT get_my_household_context();
INSERT INTO grocery_items (household_id, name) VALUES (('5ca1e002-0000-4000-8000-' || lpad(':h', 12, '0'))::uuid, 'Load test item');
COMMIT;
