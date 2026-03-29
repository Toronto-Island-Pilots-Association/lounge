/**
 * Sanity-check Supabase data for ClubLounge dev (or any linked project in .env).
 * Loads .env.local then .env (same order as seed-dev.js). No secrets printed.
 *
 *   node scripts/verify-supabase-data.js
 */
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const root = process.cwd()
require('dotenv').config({ path: path.resolve(root, '.env.local') })
require('dotenv').config({ path: path.resolve(root, '.env') })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

function fail(msg) {
  console.error('FAIL:', msg)
  process.exit(1)
}

function ok(msg) {
  console.log('OK ', msg)
}

async function main() {
  if (!url || !key) {
    fail('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (check .env)')
  }

  const db = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: demoOrg, error: demoErr } = await db
    .from('organizations')
    .select('id, name, slug, subdomain')
    .eq('slug', 'demo')
    .maybeSingle()

  if (demoErr) fail(`organizations demo: ${demoErr.message}`)
  if (!demoOrg) fail('No organization with slug "demo" (run supabase db reset, or npm run db:seed-demo-org)')
  ok(`demo org exists: ${demoOrg.name} (${demoOrg.id})`)

  const { data: pub, error: pubErr } = await db
    .from('settings')
    .select('value')
    .eq('org_id', demoOrg.id)
    .eq('key', 'public_access')
    .maybeSingle()

  if (pubErr) fail(`settings public_access: ${pubErr.message}`)
  if (pub?.value !== 'true') {
    fail(`demo public_access is not "true" (got ${JSON.stringify(pub?.value)})`)
  }
  ok('demo public_access = true (guests can browse)')

  const { count: approvedOm, error: omErr } = await db
    .from('org_memberships')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved')

  if (omErr) fail(`count org_memberships: ${omErr.message}`)

  const { data: omUsers, error: omUsersErr } = await db
    .from('org_memberships')
    .select('user_id')
    .eq('status', 'approved')

  if (omUsersErr) fail(`org_memberships user_id list: ${omUsersErr.message}`)

  const { data: profiles, error: profErr } = await db.from('user_profiles').select('user_id')
  if (profErr) fail(`user_profiles: ${profErr.message}`)

  const profileSet = new Set((profiles || []).map((p) => p.user_id))
  const missingUserIds = new Set()
  for (const r of omUsers || []) {
    if (!profileSet.has(r.user_id)) missingUserIds.add(r.user_id)
  }
  if (missingUserIds.size > 0) {
    fail(
      `${missingUserIds.size} user_id(s) have approved membership but no user_profiles row — run scripts/sql/backfill-user-profiles-for-approved-members.sql or npm run db:sync-members (TIPA @dev.local)`,
    )
  }
  ok(`all approved memberships have user_profiles (${approvedOm ?? 0} approved membership rows)`)

  const { count: mpApproved, error: mpErr } = await db
    .from('member_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved')

  if (mpErr) fail(`member_profiles count: ${mpErr.message}`)
  if ((mpApproved ?? 0) !== (approvedOm ?? 0)) {
    console.warn(
      `WARN: member_profiles approved (${mpApproved}) != org_memberships approved (${approvedOm}) — can differ if one user has multiple approved orgs`,
    )
  } else {
    ok(`member_profiles (approved) count matches org_memberships approved (${mpApproved})`)
  }

  const { count: demoThreads } = await db
    .from('threads')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', demoOrg.id)

  const { count: demoMembers } = await db
    .from('org_memberships')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', demoOrg.id)

  if ((demoThreads ?? 0) < 1) {
    console.warn('WARN: demo org has no threads — run: npm run db:seed-demo-org')
  } else {
    ok(`demo org has ${demoThreads} thread(s)`)
  }
  if ((demoMembers ?? 0) < 5) {
    console.warn('WARN: demo org has few memberships — run npm run db:seed-demo-org')
  } else {
    ok(`demo org has ${demoMembers} membership row(s)`)
  }

  console.log('\nAll required checks passed.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
