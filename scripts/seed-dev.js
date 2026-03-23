/**
 * Seed dev database with realistic mock data using NEXT_PUBLIC_SUPABASE_URL and
 * SUPABASE_SERVICE_ROLE_KEY (dev). All emails are @dev.local so no real emails are sent.
 * Run: node scripts/seed-dev.js  (or npm run db:seed)
 */
const path = require('path')
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') })
const { createClient } = require('@supabase/supabase-js')

const THREAD_CATEGORIES = [
  'introduce_yourself',
  'aircraft_shares',
  'general_aviation',
  'flying_at_ytz',
  'training_safety_proficiency',
  'building_a_better_tipa',
  'other',
]
const REACTION_TYPES = ['like', 'upvote']
const SEED_PASSWORD = 'DevPassword1!'
const NUM_USERS = 12
const NUM_THREADS = 25
const NUM_COMMENTS_PER_THREAD = [0, 1, 2, 3, 4, 5]
const NUM_REACTIONS = 40
const NUM_EVENTS = 6

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
    process.exit(1)
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Use the founding org (TIPA) for all seeded tenant data.
  const { data: tipaOrg, error: orgErr } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', 'tipa')
    .single()

  if (orgErr || !tipaOrg?.id) {
    console.error('Unable to resolve TIPA org id (expected organizations.slug=tipa):', orgErr?.message)
    process.exit(1)
  }

  const orgId = tipaOrg.id

  const firstNames = [
    'Alex', 'Jordan', 'Sam', 'Casey', 'Morgan', 'Riley', 'Quinn', 'Avery',
    'Drew', 'Jamie', 'Skyler', 'Reese', 'Finley', 'Parker', 'Cameron', 'Blair',
    'Hayden', 'Emerson', 'River', 'Sage', 'Phoenix', 'Dakota',
  ]
  const lastNames = [
    'Smith', 'Chen', 'Williams', 'Brown', 'Garcia', 'Lee', 'Martinez', 'Taylor',
    'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Clark', 'Lewis', 'Robinson',
  ]

  // Existing dev users: find highest index so we only create new ones
  const { data: existingProfiles } = await supabase
    .from('user_profiles')
    .select('user_id, email')
    .like('email', 'dev-%@dev.local')
  const existingUserIds = (existingProfiles || []).map((p) => p.user_id)
  const existingIndices = (existingProfiles || [])
    .map((p) => {
      const m = p.email?.match(/^dev-(\d+)@dev\.local$/)
      return m ? parseInt(m[1], 10) : 0
    })
    .filter((n) => n > 0)
  const nextIndex = existingIndices.length > 0 ? Math.max(...existingIndices) + 1 : 1

  console.log(`Found ${existingUserIds.length} existing dev users. Creating ${NUM_USERS} new users (dev-${nextIndex}@dev.local ...)...`)
  const newUserIds = []
  /** @type {{ id: string, email: string, fullName: string, firstName: string, lastName: string, membershipLevel: string }[]} */
  const newUserMeta = []
  for (let i = 0; i < NUM_USERS; i++) {
    const n = nextIndex + i
    const email = `dev-${n}@dev.local`
    const idx = (n - 1) % firstNames.length
    const firstName = firstNames[idx] || `User${n}`
    const lastName = lastNames[idx % lastNames.length] || 'Seed'
    const fullName = `${firstName} ${lastName}`
    const membershipLevel = i === 0 ? 'Full' : pick(['Full', 'Student', 'Associate', 'Corporate'])
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: SEED_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        first_name: firstName,
        last_name: lastName,
        role: 'member',
        membership_level: membershipLevel,
        org_id: orgId,
      },
    })
    if (error) {
      if (error.message?.toLowerCase().includes('already') || error.message?.toLowerCase().includes('exists')) {
        const { data: existingProfile } = await supabase
          .from('user_profiles')
          .select('user_id')
          .eq('email', email)
          .single()
        if (existingProfile) {
          newUserIds.push(existingProfile.user_id)
        } else {
          const { data: listData } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
          const authUser = listData?.users?.find((u) => (u.email || '').toLowerCase() === email)
          if (authUser) {
            newUserIds.push(authUser.id)
            newUserMeta.push({ id: authUser.id, email, fullName, firstName, lastName, membershipLevel })
          } else {
            console.error(`  ${email} exists in auth but could not be found (listUsers).`)
          }
        }
      } else {
        console.error(`  Failed to create ${email}:`, error.message)
      }
    } else if (data?.user) {
      newUserIds.push(data.user.id)
      newUserMeta.push({ id: data.user.id, email, fullName, firstName, lastName, membershipLevel })
    }
  }

  const userIds = [...existingUserIds, ...newUserIds]
  if (userIds.length === 0) {
    console.error('No users available. Create at least one dev user or fix .env')
    process.exit(1)
  }
  console.log(`  ${newUserIds.length} new users created. ${userIds.length} total dev users for this run.`)

  console.log('  Waiting for profiles (trigger), then ensuring all have user_profiles...')
  await new Promise((r) => setTimeout(r, 2000))

  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('user_id')
    .in('user_id', userIds)
  const profileUserIds = (profiles || []).map((p) => p.user_id)
  const missingUserIds = newUserIds.filter((id) => !profileUserIds.includes(id))
  if (missingUserIds.length > 0) {
    for (const meta of newUserMeta) {
      if (!missingUserIds.includes(meta.id)) continue
      const { error: insErr } = await supabase.from('user_profiles').insert({
        id: meta.id,
        user_id: meta.id,
        org_id: orgId,
        email: meta.email,
        full_name: meta.fullName,
        first_name: meta.firstName,
        last_name: meta.lastName,
        role: 'member',
        membership_level: meta.membershipLevel,
        status: 'approved',
      })
      if (insErr) console.error(`  Profile insert for ${meta.email}:`, insErr.message)
    }
    console.log(`  Created ${missingUserIds.length} missing user_profiles so they show in Admin Members.`)
  }
  const { data: profilesAfter } = await supabase
    .from('user_profiles')
    .select('id')
    .in('user_id', userIds)
  const profileIdsAfter = (profilesAfter || []).map((p) => p.id)
  if (profileIdsAfter.length > 0) {
    const { error: upErr } = await supabase
      .from('user_profiles')
      .update({ status: 'approved' })
      .in('id', profileIdsAfter)
    if (!upErr) console.log(`  Approved ${profileIdsAfter.length} profiles.`)
  }

  console.log('Creating threads and comments...')
  const threadIds = []
  for (let t = 0; t < NUM_THREADS; t++) {
    const { data: thread, error: te } = await supabase
      .from('threads')
      .insert({
        title: `Seed thread ${t + 1}: ${pick(['Flying at YTZ', 'Gear for sale', 'Training tips', 'Building TIPA', 'General chat'])}`,
        content: `This is seed content for thread ${t + 1}. Some **markdown** and real-looking discussion.`,
        created_by: pick(userIds),
        category: pick(THREAD_CATEGORIES),
        org_id: orgId,
      })
      .select('id')
      .single()
    if (te) {
      console.error('  Thread insert error:', te.message)
      continue
    }
    if (thread) threadIds.push(thread.id)

    const numComments = pick(NUM_COMMENTS_PER_THREAD)
    for (let c = 0; c < numComments; c++) {
      await supabase.from('comments').insert({
        thread_id: thread.id,
        content: `Seed comment ${c + 1} on thread ${t + 1}.`,
        created_by: pick(userIds),
        org_id: orgId,
      })
    }
  }

  console.log(`  ${threadIds.length} threads created. Adding reactions...`)
  const { data: comments } = await supabase.from('comments').select('id, thread_id').in('thread_id', threadIds)
  const commentsByThread = (comments || []).reduce((acc, c) => {
    if (!acc[c.thread_id]) acc[c.thread_id] = []
    acc[c.thread_id].push(c.id)
    return acc
  }, {})
  let reactionsAdded = 0
  for (let r = 0; r < NUM_REACTIONS; r++) {
    const targetThread = pick(threadIds)
    const threadComments = commentsByThread[targetThread]
    const targetComment = threadComments?.length ? pick(threadComments) : null
    const { error } = await supabase.from('reactions').insert({
      thread_id: targetThread,
      comment_id: targetComment,
      user_id: pick(userIds),
      reaction_type: pick(REACTION_TYPES),
      org_id: orgId,
    })
    if (!error) reactionsAdded++
    else if (!error.message?.includes('duplicate') && !error.message?.includes('unique')) {
      console.error('  Reaction error:', error.message)
    }
  }
  console.log(`  ${reactionsAdded} reactions added.`)

  console.log('Creating events...')
  const now = new Date()
  for (let e = 0; e < NUM_EVENTS; e++) {
    const start = new Date(now)
    start.setDate(start.getDate() + e * 7)
    start.setHours(10, 0, 0, 0)
    const end = new Date(start)
    end.setHours(12, 0, 0, 0)
    await supabase.from('events').insert({
      title: `Seed event ${e + 1}`,
      description: 'Seed event for dev.',
      location: e % 2 ? 'YTZ' : 'Online',
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      created_by: pick(userIds),
      org_id: orgId,
    })
  }

  console.log('Done. Dev DB seeded with users, threads, comments, reactions, and events (all emails @dev.local).')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
