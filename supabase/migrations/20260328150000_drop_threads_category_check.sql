-- Allow arbitrary category slugs so orgs can create custom discussion categories.
-- Validation is now done at the application layer using the org's stored category config.
alter table threads drop constraint if exists threads_category_check;
