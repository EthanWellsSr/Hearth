-- Run only after deployment and Vault configuration in the verified target.
-- This file intentionally contains no deployment URLs or credential values.
do $$ begin
  if not exists(select 1 from vault.decrypted_secrets where name='hearth_google_calendar_sync_url')
    or not exists(select 1 from vault.decrypted_secrets where name='hearth_google_calendar_sync_secret') then
    raise exception 'Configure the Google Calendar sync URL and bearer secret in Vault first';
  end if;
end $$;
select cron.schedule('hearth-google-calendar-recovery','*/15 * * * *', $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name='hearth_google_calendar_sync_url'),
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' ||
      (select decrypted_secret from vault.decrypted_secrets where name='hearth_google_calendar_sync_secret')),
    body := '{}'::jsonb, timeout_milliseconds := 300000
  );
$job$);
