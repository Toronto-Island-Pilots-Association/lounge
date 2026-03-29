# Post-deploy checks for `lounge-dev`

Run these after stages `01` through `06` are complete and the branch is
deployed against `lounge-dev`.

## Deployment and domains

- `lounge-dev.tipa.ca` resolves to the `dev` deployment, not `Production`
- the `dev` deployment is using the `lounge-dev` Supabase environment values
- the TIPA org row in `lounge-dev` has `custom_domain = 'lounge-dev.tipa.ca'`
- `lounge.tipa.ca` remains on the production deployment until prod cutover
- preview deployments do not share the `lounge` production database

## Authentication

- existing TIPA member can sign in
- existing TIPA admin can sign in
- password reset still works

## Core TIPA parity

- navbar branding still looks like TIPA
- discussions label is `Hangar Talk`
- discussions load
- events load
- announcements/resources load
- membership page loads for approved member
- pending member sees pending state
- expired member sees expired state

## Admin

- members list loads
- member detail loads
- approvals still work
- invite flow still works

## Payments

- TIPA dues checkout still works
- TIPA is not blocked for missing Stripe Connect
- no screen demands Connect before member dues can be paid

## Platform

- TIPA appears as an org in the platform dashboard
- billing page loads without forcing a dues-Stripe migration
- integrations page does not break when `stripe_account_id` is null for TIPA

## Hard stop failures

If any of these happen, stop before destructive cleanup:

- existing users cannot log in
- member dues require Stripe Connect
- org content disappears
- counts from `06_validation_queries.sql` do not match the legacy baseline
