-- Toggle a To-do (fires the completed_at trigger).
\set u random(1, 2000)
\set h (:u + 1) / 2
BEGIN;
SELECT set_config('role', 'authenticated', true), set_config('request.jwt.claims', json_build_object('sub', '5ca1e001-0000-4000-8000-' || lpad(':u', 12, '0'), 'role', 'authenticated')::text, true);
SELECT get_my_household_context();
\set i random(1, 100)
UPDATE todos SET done = NOT done WHERE id = ('5ca1e004-' || lpad(':i', 4, '0') || '-4000-8000-' || lpad(':h', 12, '0'))::uuid AND household_id = ('5ca1e002-0000-4000-8000-' || lpad(':h', 12, '0'))::uuid;
COMMIT;
