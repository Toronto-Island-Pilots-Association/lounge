/**
 * Seed script: creates the demo org at demo.clublounge.app
 * with realistic fake data for use on the landing page.
 *
 * Run against clublounge-dev:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/seed-demo-org.ts
 *
 * Or with .env.local:
 *   npx tsx --env-file=.env.local scripts/seed-demo-org.ts
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const ORG_SLUG = 'demo'
const ORG_NAME = 'Lakeside Sports Club'
const ADMIN_EMAIL = 'admin@demo.clublounge.app'
const ADMIN_PASSWORD = 'DemoAdmin2024!'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

function daysFromNow(n: number) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString()
}

function monthsAgo(n: number) {
  const d = new Date()
  d.setMonth(d.getMonth() - n)
  return d.toISOString()
}

function avatar(seed: string) {
  return `https://api.dicebear.com/7.x/personas/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`
}

// ---------------------------------------------------------------------------
// Member data
// ---------------------------------------------------------------------------

const MEMBERS = [
  // Admins
  { first: 'Alex',     last: 'Morgan',    email: ADMIN_EMAIL,                         role: 'admin',  status: 'approved', level: 'Full',      monthsAgo: 18, paid: true  },
  { first: 'Jordan',   last: 'Chen',      email: 'jordan@demo.clublounge.app',         role: 'admin',  status: 'approved', level: 'Full',      monthsAgo: 18, paid: true  },

  // Active full members
  { first: 'Sam',      last: 'Patel',     email: 'sam.patel@gmail.com',               role: 'member', status: 'approved', level: 'Full',      monthsAgo: 14, paid: true  },
  { first: 'Taylor',   last: 'Williams',  email: 'taylor.w@hotmail.com',              role: 'member', status: 'approved', level: 'Full',      monthsAgo: 12, paid: true  },
  { first: 'Morgan',   last: 'Lee',       email: 'morgan.lee@outlook.com',            role: 'member', status: 'approved', level: 'Full',      monthsAgo: 11, paid: true  },
  { first: 'Casey',    last: 'Brown',     email: 'casey.brown@gmail.com',             role: 'member', status: 'approved', level: 'Full',      monthsAgo: 10, paid: true  },
  { first: 'Riley',    last: 'Davis',     email: 'riley.d@icloud.com',                role: 'member', status: 'approved', level: 'Full',      monthsAgo: 10, paid: true  },
  { first: 'Avery',    last: 'Wilson',    email: 'avery.wilson@yahoo.com',            role: 'member', status: 'approved', level: 'Full',      monthsAgo: 9,  paid: true  },
  { first: 'Quinn',    last: 'Martinez',  email: 'quinn.m@gmail.com',                 role: 'member', status: 'approved', level: 'Full',      monthsAgo: 9,  paid: true  },
  { first: 'Drew',     last: 'Thompson',  email: 'drew.t@outlook.com',                role: 'member', status: 'approved', level: 'Full',      monthsAgo: 8,  paid: true  },
  { first: 'Peyton',   last: 'Garcia',    email: 'peyton.garcia@gmail.com',           role: 'member', status: 'approved', level: 'Full',      monthsAgo: 8,  paid: true  },
  { first: 'Blake',    last: 'Anderson',  email: 'blake.a@icloud.com',                role: 'member', status: 'approved', level: 'Full',      monthsAgo: 7,  paid: true  },
  { first: 'Skyler',   last: 'Jackson',   email: 'skyler.j@gmail.com',                role: 'member', status: 'approved', level: 'Full',      monthsAgo: 7,  paid: true  },
  { first: 'Reese',    last: 'White',     email: 'reese.white@hotmail.com',           role: 'member', status: 'approved', level: 'Full',      monthsAgo: 6,  paid: true  },
  { first: 'Finley',   last: 'Harris',    email: 'finley.h@gmail.com',                role: 'member', status: 'approved', level: 'Full',      monthsAgo: 6,  paid: true  },
  { first: 'Hayden',   last: 'Clark',     email: 'hayden.clark@outlook.com',          role: 'member', status: 'approved', level: 'Full',      monthsAgo: 5,  paid: true  },
  { first: 'Charlie',  last: 'Lewis',     email: 'charlie.lewis@gmail.com',           role: 'member', status: 'approved', level: 'Full',      monthsAgo: 5,  paid: true  },
  { first: 'Emery',    last: 'Robinson',  email: 'emery.r@yahoo.com',                 role: 'member', status: 'approved', level: 'Full',      monthsAgo: 4,  paid: true  },
  { first: 'Jamie',    last: 'Walker',    email: 'jamie.walker@gmail.com',            role: 'member', status: 'approved', level: 'Full',      monthsAgo: 4,  paid: true  },
  { first: 'Rowan',    last: 'Hall',      email: 'rowan.hall@icloud.com',             role: 'member', status: 'approved', level: 'Full',      monthsAgo: 3,  paid: true  },
  { first: 'Sage',     last: 'Young',     email: 'sage.young@gmail.com',              role: 'member', status: 'approved', level: 'Full',      monthsAgo: 3,  paid: true  },
  { first: 'Remy',     last: 'King',      email: 'remy.king@outlook.com',             role: 'member', status: 'approved', level: 'Full',      monthsAgo: 2,  paid: true  },
  { first: 'Logan',    last: 'Wright',    email: 'logan.wright@gmail.com',            role: 'member', status: 'approved', level: 'Full',      monthsAgo: 2,  paid: true  },

  // Associate / student members
  { first: 'Harper',   last: 'Scott',     email: 'harper.scott@gmail.com',            role: 'member', status: 'approved', level: 'Associate', monthsAgo: 6,  paid: true  },
  { first: 'Phoenix',  last: 'Green',     email: 'phoenix.green@yahoo.com',           role: 'member', status: 'approved', level: 'Associate', monthsAgo: 5,  paid: true  },
  { first: 'River',    last: 'Adams',     email: 'river.adams@gmail.com',             role: 'member', status: 'approved', level: 'Associate', monthsAgo: 4,  paid: true  },
  { first: 'Elliot',   last: 'Baker',     email: 'elliot.baker@icloud.com',           role: 'member', status: 'approved', level: 'Associate', monthsAgo: 3,  paid: true  },
  { first: 'Nico',     last: 'Nelson',    email: 'nico.nelson@gmail.com',             role: 'member', status: 'approved', level: 'Associate', monthsAgo: 2,  paid: true  },

  // Lapsed / overdue
  { first: 'Dana',     last: 'Carter',    email: 'dana.carter@gmail.com',             role: 'member', status: 'approved', level: 'Full',      monthsAgo: 14, paid: false },
  { first: 'Jules',    last: 'Mitchell',  email: 'jules.mitchell@hotmail.com',        role: 'member', status: 'approved', level: 'Full',      monthsAgo: 13, paid: false },
  { first: 'Lennon',   last: 'Perez',     email: 'lennon.perez@gmail.com',            role: 'member', status: 'approved', level: 'Full',      monthsAgo: 12, paid: false },
  { first: 'Wren',     last: 'Roberts',   email: 'wren.roberts@outlook.com',          role: 'member', status: 'expired',  level: 'Full',      monthsAgo: 16, paid: false },
  { first: 'Marlowe',  last: 'Turner',    email: 'marlowe.t@gmail.com',               role: 'member', status: 'expired',  level: 'Full',      monthsAgo: 15, paid: false },

  // Pending approval
  { first: 'Indigo',   last: 'Phillips',  email: 'indigo.p@gmail.com',                role: 'member', status: 'pending',  level: 'Full',      monthsAgo: 0,  paid: false },
  { first: 'Cleo',     last: 'Campbell',  email: 'cleo.campbell@yahoo.com',           role: 'member', status: 'pending',  level: 'Full',      monthsAgo: 0,  paid: false },
  { first: 'Zephyr',   last: 'Parker',    email: 'zephyr.parker@gmail.com',           role: 'member', status: 'pending',  level: 'Associate', monthsAgo: 0,  paid: false },
  { first: 'Onyx',     last: 'Evans',     email: 'onyx.evans@icloud.com',             role: 'member', status: 'pending',  level: 'Full',      monthsAgo: 0,  paid: false },
  { first: 'Cypress',  last: 'Edwards',   email: 'cypress.e@gmail.com',               role: 'member', status: 'pending',  level: 'Associate', monthsAgo: 0,  paid: false },

  // Extra demo directory volume (approved, varied levels)
  { first: 'Mika',     last: 'Okonkwo',   email: 'mika.okonkwo@gmail.com',            role: 'member', status: 'approved', level: 'Full',      monthsAgo: 15, paid: true  },
  { first: 'Sofia',    last: 'Vasquez',   email: 'sofia.v@outlook.com',               role: 'member', status: 'approved', level: 'Full',      monthsAgo: 14, paid: true  },
  { first: 'Owen',     last: 'MacLeod',   email: 'owen.macleod@gmail.com',            role: 'member', status: 'approved', level: 'Corporate', monthsAgo: 20, paid: true  },
  { first: 'Priya',    last: 'Shah',      email: 'priya.shah@yahoo.com',              role: 'member', status: 'approved', level: 'Associate', monthsAgo: 8,  paid: true  },
  { first: 'Theo',     last: 'Bouchard',  email: 'theo.bouchard@gmail.com',           role: 'member', status: 'approved', level: 'Student',   monthsAgo: 3,  paid: true  },
  { first: 'Yuki',     last: 'Tanaka',    email: 'yuki.tanaka@icloud.com',            role: 'member', status: 'approved', level: 'Full',      monthsAgo: 11, paid: true  },
  { first: 'Diego',    last: 'Fernandez', email: 'diego.f@gmail.com',                 role: 'member', status: 'approved', level: 'Full',      monthsAgo: 9,  paid: true  },
  { first: 'Amara',    last: 'Diallo',    email: 'amara.diallo@outlook.com',          role: 'member', status: 'approved', level: 'Associate', monthsAgo: 7,  paid: true  },
  { first: 'Felix',    last: 'Novak',     email: 'felix.novak@gmail.com',             role: 'member', status: 'approved', level: 'Full',      monthsAgo: 6,  paid: true  },
  { first: 'Nora',     last: 'Lindqvist', email: 'nora.lindqvist@hotmail.com',        role: 'member', status: 'approved', level: 'Full',      monthsAgo: 5,  paid: true  },
  { first: 'Kai',      last: 'Nakamura',  email: 'kai.nakamura@gmail.com',            role: 'member', status: 'approved', level: 'Corporate', monthsAgo: 17, paid: true  },
  { first: 'Elena',    last: 'Popov',     email: 'elena.popov@yahoo.com',             role: 'member', status: 'approved', level: 'Full',      monthsAgo: 4,  paid: true  },

  // Honorary
  { first: 'Pat',      last: 'Founders',  email: 'pat.founders@gmail.com',            role: 'member', status: 'approved', level: 'Honorary',  monthsAgo: 36, paid: false },
]

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('🌱 Seeding demo org...\n')

  // 1. Delete existing demo org if any
  const { data: existingOrg } = await db
    .from('organizations')
    .select('id')
    .eq('slug', ORG_SLUG)
    .maybeSingle()

  if (existingOrg) {
    console.log('⚠️  Existing demo org found — deleting...')
    await db.from('organizations').delete().eq('id', existingOrg.id)
    console.log('   Deleted.\n')
  }

  // 2. Create org
  const { data: org, error: orgErr } = await db
    .from('organizations')
    .insert({
      name: ORG_NAME,
      slug: ORG_SLUG,
      subdomain: ORG_SLUG,
      plan: 'community',
    })
    .select()
    .single()

  if (orgErr || !org) {
    console.error('Failed to create org:', orgErr)
    process.exit(1)
  }
  console.log(`✅ Created org: ${org.name} (${org.id})\n`)

  // Seed default settings
  await db.rpc('create_default_org_settings', { p_org_id: org.id })

  // Update settings
  const settingsUpdates = [
    { key: 'club_display_name',    value: ORG_NAME },
    { key: 'contact_email',        value: 'hello@lakesidesportsclub.ca' },
    { key: 'club_description',     value: 'A welcoming community for outdoor sports enthusiasts on the water and beyond.' },
    { key: 'membership_fee_full',  value: '120' },
    { key: 'membership_fee_associate', value: '60' },
    { key: 'feature_discussions',  value: 'true' },
    { key: 'feature_events',       value: 'true' },
    { key: 'feature_resources',    value: 'true' },
    { key: 'require_member_approval', value: 'true' },
    { key: 'public_access',           value: 'true' },
  ]
  for (const s of settingsUpdates) {
    await db.from('settings').upsert({ org_id: org.id, ...s }, { onConflict: 'key,org_id' })
  }

  // 3. Create auth users + profiles + memberships
  console.log(`👥 Creating ${MEMBERS.length} members...`)
  const createdUsers: { userId: string; member: typeof MEMBERS[0] }[] = []

  for (const m of MEMBERS) {
    const isAdmin = m.role === 'admin' && m.email === ADMIN_EMAIL
    const password = isAdmin ? ADMIN_PASSWORD : `Member${Math.floor(Math.random() * 9000) + 1000}!`
    const fullName = `${m.first} ${m.last}`

    // Create or reuse auth user
    let userId: string
    const { data: existing } = await db.auth.admin.listUsers()
    const found = existing?.users?.find(u => u.email === m.email)

    if (found) {
      userId = found.id
    } else {
      const { data: created, error } = await db.auth.admin.createUser({
        email: m.email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName, first_name: m.first, last_name: m.last },
      })
      if (error || !created.user) {
        console.warn(`  ⚠️  Skipping ${m.email}: ${error?.message}`)
        continue
      }
      userId = created.user.id
    }

    // Upsert user_profiles
    await db.from('user_profiles').upsert({
      user_id: userId,
      email: m.email,
      full_name: fullName,
      first_name: m.first,
      last_name: m.last,
      profile_picture_url: avatar(fullName),
      city: ['Toronto', 'Oakville', 'Mississauga', 'Burlington', 'Hamilton'][Math.floor(Math.random() * 5)],
      country: 'Canada',
      province_state: 'Ontario',
    }, { onConflict: 'user_id' })

    // Upsert org_memberships
    const joinedAt = m.monthsAgo > 0 ? monthsAgo(m.monthsAgo) : daysAgo(Math.floor(Math.random() * 7))
    const expiresAt = m.status === 'expired'
      ? daysAgo(30 + Math.floor(Math.random() * 60))
      : m.paid
        ? daysFromNow(300 + Math.floor(Math.random() * 65))
        : null

    await db.from('org_memberships').upsert({
      user_id: userId,
      org_id: org.id,
      role: m.role,
      status: m.status,
      membership_level: m.level,
      membership_expires_at: expiresAt,
      stripe_subscription_id: m.paid ? `sub_demo_${userId.slice(0, 8)}` : null,
      created_at: joinedAt,
    }, { onConflict: 'user_id,org_id' })

    createdUsers.push({ userId, member: m })
    process.stdout.write('.')
  }
  console.log(`\n✅ Members created: ${createdUsers.length}\n`)

  // Helper: pick N random approved member userIds
  const approvedUsers = createdUsers.filter(u => u.member.status === 'approved')
  const pick = (n: number) =>
    [...approvedUsers].sort(() => Math.random() - 0.5).slice(0, n).map(u => u.userId)

  const adminUser = createdUsers.find(u => u.member.email === ADMIN_EMAIL)!
  const adminId = adminUser.userId

  // 4. Threads + comments
  console.log('💬 Creating discussion threads...')

  const threads = [
    {
      title: "Saturday morning meetup — who's in?",
      content: "Hey everyone! We're planning a casual Saturday morning session at the usual spot. Thinking 9am, weather permitting.\n\nWho's free this weekend? Drop a reply below and let's get a headcount going.",
      category: 'other',
      authorIdx: 2,
      daysAgo: 5,
      comments: [
        { text: "I'm in! Will it be on the water or land training this week?", authorIdx: 3, daysAgo: 5 },
        { text: "Count me in. Should I bring the extra gear?", authorIdx: 4, daysAgo: 4 },
        { text: "I'll be there! Bringing a friend who's thinking about joining 🙌", authorIdx: 5, daysAgo: 4 },
        { text: "Love this. See you all there!", authorIdx: 6, daysAgo: 3 },
        { text: "In! Can someone remind me of the exact meeting point?", authorIdx: 7, daysAgo: 3 },
        { text: "@Morgan — it's the usual north parking lot entrance. See the pinned map in Resources.", authorIdx: 2, daysAgo: 2 },
      ],
    },
    {
      title: 'New member introductions — say hello! 👋',
      content: "Welcome to all our new members who joined this season! This is your thread to introduce yourself — tell us your name, where you're from, and what brought you to the club.\n\nDon't be shy, we're a friendly bunch!",
      category: 'introduce_yourself',
      authorIdx: 0,
      daysAgo: 14,
      comments: [
        { text: "Hi everyone! I'm River, just moved to the area from Vancouver. Excited to find such an active community here!", authorIdx: 25, daysAgo: 13 },
        { text: "Hey! Elliot here. I've been wanting to join a club like this for years. Finally took the plunge!", authorIdx: 26, daysAgo: 13 },
        { text: "Hi all, I'm Nico. Lifelong outdoors enthusiast, brand new to structured club life. Looking forward to meeting everyone!", authorIdx: 27, daysAgo: 12 },
        { text: "Welcome all! Grab a buddy at the next meetup and we'll show you the ropes 🎉", authorIdx: 1, daysAgo: 12 },
        { text: "So good to see new faces. River, welcome from Vancouver — you'll find the lake here is a bit chillier but just as beautiful 😄", authorIdx: 3, daysAgo: 11 },
      ],
    },
    {
      title: 'AGM agenda — input welcome',
      content: "Our Annual General Meeting is coming up next month. Before we finalize the agenda I wanted to open it up for suggestions from members.\n\nItems already on the list:\n• Treasurer's report\n• Membership fee review for next year\n• Equipment fund update\n• Election of two committee positions\n\nAnything else you'd like added? Reply below.",
      category: 'other',
      authorIdx: 0,
      daysAgo: 21,
      comments: [
        { text: "Can we add a discussion about the clubhouse booking system? It's been a pain point all season.", authorIdx: 4, daysAgo: 20 },
        { text: "Seconded on the booking system. Also would love an update on the new equipment we voted on last year.", authorIdx: 8, daysAgo: 20 },
        { text: "Would be great to have a social committee update too — the end-of-season party planning needs to start!", authorIdx: 9, daysAgo: 19 },
        { text: "Thanks everyone — noted. I'll circulate the final agenda by end of next week.", authorIdx: 0, daysAgo: 18 },
      ],
    },
    {
      title: 'Gear swap & classifieds — post your listings here',
      content: "Looking to clear out some kit, or hunting for something specific? Post your listings in this thread.\n\nPlease include: item, condition, asking price, and how to reach you.\n\nKeep it club-members-only — no commercial dealers please.",
      category: 'other',
      authorIdx: 1,
      daysAgo: 30,
      comments: [
        { text: "Selling: barely-used dry bag set (3-pack), excellent condition. $45 for the lot. Message me!", authorIdx: 10, daysAgo: 29 },
        { text: "Looking for a spare paddle rack if anyone has one they're not using.", authorIdx: 11, daysAgo: 28 },
        { text: "I have an extra rack, Charlie — I'll message you.", authorIdx: 12, daysAgo: 27 },
        { text: "Dry bags still available?", authorIdx: 13, daysAgo: 25 },
        { text: "Just sold! Thanks everyone 🙌", authorIdx: 10, daysAgo: 24 },
      ],
    },
  ]

  for (const t of threads) {
    const author = createdUsers[t.authorIdx]
    const { data: thread, error: tErr } = await db.from('threads').insert({
      org_id: org.id,
      title: t.title,
      content: t.content,
      category: t.category,
      created_by: author.userId,
      author_email: author.member.email,
      created_at: daysAgo(t.daysAgo),
      updated_at: daysAgo(t.daysAgo),
    }).select().single()

    if (tErr || !thread) { console.warn('Thread error:', tErr); continue }

    // Add reactions to thread
    const reactors = pick(Math.floor(Math.random() * 8) + 3)
    for (const uid of reactors) {
      await db.from('reactions').insert({
        org_id: org.id,
        thread_id: thread.id,
        user_id: uid,
        reaction_type: 'like',
      }).then(() => {})
    }

    for (const c of t.comments) {
      const commentAuthor = createdUsers[c.authorIdx]
      const { data: comment } = await db.from('comments').insert({
        org_id: org.id,
        thread_id: thread.id,
        content: c.text,
        created_by: commentAuthor.userId,
        author_email: commentAuthor.member.email,
        created_at: daysAgo(c.daysAgo),
      }).select().single()

      if (comment) {
        const commentReactors = pick(Math.floor(Math.random() * 4) + 1)
        for (const uid of commentReactors) {
          await db.from('reactions').insert({
            org_id: org.id,
            comment_id: comment.id,
            user_id: uid,
            reaction_type: 'like',
          }).then(() => {})
        }
      }
    }
    process.stdout.write('.')
  }
  console.log('\n✅ Threads + comments created\n')

  // 5. Events
  console.log('📅 Creating events...')

  const events = [
    {
      title: 'Saturday Morning Paddle & Social',
      description: 'Our weekly Saturday morning session — all levels welcome. We paddle for about 90 minutes then head to the boathouse for coffee and snacks. Great way to meet other members!',
      location: 'Lakeside Club Dock, North Entrance',
      start: daysFromNow(8),
      end: daysFromNow(8),
      rsvpCount: 14,
    },
    {
      title: 'End-of-Season Banquet & Awards Night',
      description: 'Join us to celebrate another great season! We\'ll be announcing club awards, sharing highlights from the year, and enjoying a catered dinner together. Tickets include a two-course meal and two drink tickets. Additional guests welcome.',
      location: 'Lakeside Pavilion, 200 Club Road',
      start: daysFromNow(22),
      end: daysFromNow(22),
      rsvpCount: 28,
    },
    {
      title: 'Skills Clinic — Intermediate Level',
      description: 'A focused half-day clinic for members looking to sharpen their technique. Led by our certified instructors. Limited to 12 participants — register early!',
      location: 'Club Training Area',
      start: daysFromNow(35),
      end: daysFromNow(35),
      rsvpCount: 9,
    },
    {
      // Past event
      title: 'Opening Day Social',
      description: 'Season kick-off celebration! First time on the water together this year, followed by a BBQ at the clubhouse.',
      location: 'Lakeside Club Main Dock',
      start: monthsAgo(3),
      end: monthsAgo(3),
      rsvpCount: 31,
      past: true,
    },
  ]

  for (const ev of events) {
    const startDate = new Date(ev.start)
    const endDate = new Date(ev.end)
    if (!ev.past) {
      startDate.setHours(9, 0, 0, 0)
      endDate.setHours(12, 0, 0, 0)
    } else {
      startDate.setHours(11, 0, 0, 0)
      endDate.setHours(15, 0, 0, 0)
    }

    const { data: event, error: evErr } = await db.from('events').insert({
      org_id: org.id,
      title: ev.title,
      description: ev.description,
      location: ev.location,
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
      created_by: adminId,
    }).select().single()

    if (evErr || !event) { console.warn('Event error:', evErr); continue }

    // RSVPs
    const rsvpUsers = pick(ev.rsvpCount)
    for (const uid of rsvpUsers) {
      const up = createdUsers.find(u => u.userId === uid)
      await db.from('event_rsvps').insert({
        org_id: org.id,
        event_id: event.id,
        user_id: uid,
        display_name: up ? `${up.member.first} ${up.member.last}` : null,
        profile_picture_url: up ? avatar(`${up.member.first} ${up.member.last}`) : null,
      }).then(() => {})
    }
    process.stdout.write('.')
  }
  console.log('\n✅ Events + RSVPs created\n')

  // 6. Resources
  console.log('📁 Creating resources...')

  const resources = [
    {
      title: '📌 Member Handbook 2024',
      description: 'Everything you need to know as a member — rules, facilities, contacts, and how to get involved.',
      resource_type: 'document',
      category: 'other',
      file_name: 'Member_Handbook_2024.pdf',
      url: 'https://example.com/handbook.pdf',
    },
    {
      title: 'Clubhouse Booking Guide',
      description: 'How to book the clubhouse, pavilion, and equipment for private use. Includes pricing and availability calendar.',
      resource_type: 'link',
      category: 'reminder',
      url: 'https://example.com/booking',
    },
    {
      title: '📣 AGM Notice — Save the Date',
      description: 'Our Annual General Meeting is scheduled for next month. All members are encouraged to attend. Voting members must be in good standing.',
      resource_type: 'other',
      category: 'reminder',
      url: null,
      content: 'The Annual General Meeting of Lakeside Sports Club will be held on the last Saturday of next month. Location: Main Pavilion. All active members welcome.',
    },
    {
      title: 'Safety Guidelines & Emergency Contacts',
      description: 'Required reading for all members. Includes on-water safety rules, emergency procedures, and key contact numbers.',
      resource_type: 'document',
      category: 'other',
      file_name: 'Safety_Guidelines.pdf',
      url: 'https://example.com/safety.pdf',
    },
    {
      title: 'Season Schedule 2024',
      description: 'Full calendar of events, clinics, races, and socials for the current season.',
      resource_type: 'document',
      category: 'other',
      file_name: 'Season_Schedule_2024.pdf',
      url: 'https://example.com/schedule.pdf',
    },
  ]

  for (const r of resources) {
    await db.from('resources').insert({
      org_id: org.id,
      title: r.title,
      description: r.description,
      resource_type: r.resource_type,
      category: r.category,
      url: r.url ?? null,
      file_name: (r as any).file_name ?? null,
      file_url: (r as any).file_name ? (r as any).url : null,
      content: (r as any).content ?? null,
    })
    process.stdout.write('.')
  }
  console.log('\n✅ Resources created\n')

  // 7. Payment records — spread across 3 months for analytics
  console.log('💳 Creating payment records...')

  const paidMembers = createdUsers.filter(u => u.member.paid && u.member.level !== 'Honorary')
  const feeByLevel: Record<string, number> = { Full: 120, Associate: 60, Student: 60, Corporate: 200 }

  for (const u of paidMembers) {
    const fee = feeByLevel[u.member.level] ?? 120
    const joinedMo = u.member.monthsAgo
    // Primary payment at join time
    await db.from('payments').insert({
      org_id: org.id,
      user_id: u.userId,
      payment_method: Math.random() > 0.3 ? 'stripe' : 'cash',
      amount: fee,
      currency: 'CAD',
      payment_date: monthsAgo(joinedMo),
      membership_expires_at: daysFromNow(300),
      stripe_subscription_id: `sub_demo_${u.userId.slice(0, 8)}`,
      status: 'completed',
    })
  }
  console.log('\n✅ Payment records created\n')

  // 8. Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`✅ Demo org seeded successfully!`)
  console.log(`   Org:     ${ORG_NAME}`)
  console.log(`   URL:     https://demo.clublounge.app`)
  console.log(`   Members: ${createdUsers.length}`)
  console.log(`   Admin:   ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main().catch(err => {
  console.error('Seed failed:', err)
  process.exit(1)
})
