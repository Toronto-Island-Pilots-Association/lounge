-- Add custom_domain_verified flag.
-- Reset to false whenever custom_domain changes so a new DNS check is required.
alter table organizations
  add column if not exists custom_domain_verified boolean not null default false;

-- Reset verification whenever the domain is updated
create or replace function reset_custom_domain_verified()
returns trigger language plpgsql as $$
begin
  if new.custom_domain is distinct from old.custom_domain then
    new.custom_domain_verified := false;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_reset_custom_domain_verified on organizations;
create trigger trg_reset_custom_domain_verified
  before update on organizations
  for each row execute function reset_custom_domain_verified();
