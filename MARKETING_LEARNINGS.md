# ClubLounge Pricing & Positioning Strategy (v1)

## 🧠 Core Insight

ClubLounge is **not just SaaS**.

It is:
> **A system of record for membership + dues**

This changes everything about pricing.

---

## 🎯 Product Wedge

> **“Know who’s in. Get paid automatically.”**

NOT:
- community platform
- chat replacement
- generic membership tool

---

## ⚠️ Key Principle

> **Do NOT gate your wedge behind pricing tiers**

- Dues collection = core feature
- Must exist in all paid plans

---

## 🧩 Pricing Philosophy

### 1. Features ≠ pricing

- ❌ Don’t charge for features (bad UX, weak positioning)
- ✅ Charge for **scale + usage**

---

### 2. Core vs Scale

| Layer | Strategy |
|------|--------|
| Core (dues, membership) | Always included |
| Scale (members, emails, admins) | Tiered |
| Advanced features | Higher tiers |

---

### 3. Avoid “growth tax”

- ❌ No per-member pricing like WildApricot
- ❌ No punishing success

- ✅ Use **soft limits instead**
- ✅ Keep perception: “unlimited / fair use”

---

## 💰 Stripe Strategy

### Rule:
> **Never absorb Stripe fees**

- Pass through directly to clubs
- Keep clean separation

---

### Messaging:

**DO:**
> Payments go directly to your club — no middleman  
> Powered by Stripe

**DON’T:**
> Built on Stripe (as main pitch)

---

### Future (optional):

Introduce:
- 0.5%–1% platform fee OR
- hybrid pricing (low SaaS + % fee)

ONLY after traction.

---

## 📊 Recommended Pricing Structure

### 🟢 Hobby ($0–$9)
- Up to ~20–25 members
- 1 admin
- Dues included ✅
- Basic events, discussions

Purpose:
- acquisition funnel

---

### 💰 Core ($39–$49) ← MAIN PLAN
- 100–200 members
- 2–3 admins
- Dues included ✅
- Custom domain
- Payment tracking

Positioning:
> “Run your club without chasing payments”

---

### ⚡ Growth ($79–$99)
- 500+ members
- More admins
- Higher email limits
- Digest emails
- Analytics

---

### 🏛️ Pro ($149–$199+)
- Large orgs
- API, SSO, exports
- Priority support

---

## 📦 What to Meter (Cost Alignment)

Map pricing to infra costs:

### Infra stack:
- Vercel → bandwidth / requests
- Supabase → DB + storage
- Resend → emails
- Stripe → pass-through

---

### Meter:
- Members (soft caps)
- Admin seats
- Email volume
- Storage (later)

---

### Don’t meter:
- Dues
- Core workflows
- Basic usage

---

## 🧠 Competitive Positioning

### WildApricot
- ❌ per-contact pricing
- ❌ punishes growth

### Join It
- ❌ SaaS + transaction fees
- ❌ weaker product depth

### Circle / Memberful
- ❌ not built for real-world org ops

---

### ClubLounge position:

> **Simple pricing. Dues included. No per-contact tax.**

---

## 🔥 Messaging Framework

### Hero:
> Run your club without chasing payments.

### Sub:
> Membership, dues, and communication — all in one place.

---

### Key bullets:
- No more e-transfers  
- No more spreadsheets  
- No more “who paid?” confusion  

---

### Trust:
> Powered by Stripe  
> Payments go directly to your club

---

## ⚠️ Strategic Risks

### 1. Over-indexing on “community”
→ becomes nice-to-have

### 2. Replacing WhatsApp
→ losing battle

### 3. Absorbing Stripe fees
→ destroys margins

### 4. Overcomplicating pricing early
→ hurts conversion

---

## 🧠 Product Strategy Alignment

### ClubLounge = System of Record

| Layer | Tool |
|------|------|
| Chat | WhatsApp |
| Storage | Google Drive |
| Payments | Stripe |
| System of record | ClubLounge |

---

## 🚀 Future Monetization

### Phase 1
- Flat SaaS tiers

### Phase 2
- Usage add-ons (emails, SMS)

### Phase 3
- Optional platform fee on dues

---

## 🧠 Final Takeaway

> **Don’t optimize pricing for scale yet.  
Optimize for adoption + trust.**

---

> Win with:
- simplicity  
- fairness  
- clear value (dues solved)

---


---- 

### More research:


ClubLounge Deep Research Report: Category Design, Early Profitability, and a Defensible Wedge
Executive summary
Your current pricing page is structurally coherent (four tiers, an entry price, a “most popular” middle tier), but the unlimited-member promise on paid plans creates uncapped cost exposure when you account for email volume, support load, and high‑MAU usage (your own stack + the clubs’ usage patterns). The right move is not to mimic incumbents feature-for-feature; it’s to launch a narrower category (“membership ops layer”) that plugs into the club’s existing website + channels, then expand.

Incumbents in your target audience largely position as all‑in‑one “club website + admin portal” platforms. For example, ClubExpress markets deep website tooling (templates, custom pages, document library, photo pages, e‑commerce storefront) plus membership database and event calendar capabilities. 
 Real customer sites running on ClubExpress show the same pattern: prominent “Member Login,” “Shopping Cart,” and “Powered By ClubExpress,” with a public site and a member-only layer. 
 Join It positions around keeping “member data, payments, and communication” in one organized system with imports, renewals automation, and member portals, and it layers a monthly fee plus a service fee on transactions. 
 Memberful charges a monthly fee plus a sizable transaction fee, and it explicitly includes a “Website & newsletter builder.” 

This creates a clear opening for ClubLounge to become the modern “membership + dues layer” that doesn’t force a site rebuild, doesn’t require nine-step join flows, and doesn’t impose a contact-tax. On at least one ClubExpress-powered parent-group site, the membership sign-up experience is explicitly a multi-step wizard (“Step 1 of 9”). 
 That’s the kind of friction your product can credibly beat early.

What to do next
Positioning (category creation): “Membership Ops Layer” (or “DuesOps”)—the software that runs dues, renewals, member access, and event registration without replacing your website.
Minimum public-facing feature set: public club page + join/pay flow + public events listing + “subscribe to updates” capture + embeddable widgets.
Pricing architecture: keep “simple,” but move from “unlimited everything” to soft limits on the real cost drivers: active members, admins, email sends, storage, and “integrations that imply real vendor limits” (e.g., custom email domains).
Payments strategy: do not absorb Stripe processing fees by default; provide a choice (club absorbs, member pays “processing fee,” or blended), because the market already expects layered fees. 
Early profitability: follow incumbent norms and add a paid onboarding / migration package (optional), because competitors already charge setup and training services. 
Market segmentation and who will switch
Think in three segments, each with a different switching trigger and sales motion.

Locked-in and satisfied
These are clubs already deep on an “all-in-one, website-first” platform and are not feeling acute pain. They’ve built a public + member site, loaded documents, adopted the events calendar, and trained volunteers.

Why they’re locked: they’ve committed to a single system that covers website content, membership database, events, emailing, and more. 
Switching friction: data migration + leadership buy-in + retraining + re-implementing public site pages.
Reality check: you generally won’t win these customers first unless you offer a “drop-in membership layer” that can coexist, or you target a specific pain (e.g., member experience, mobile-first join, easier renewals).
Tolerating pain
These organizations make it work, but resent the costs, complexity, or licensing model.

Two primary pain patterns are visible in the market:

Contact-based pricing pain: WildApricot users explicitly complain that prospect/newsletter contacts count against pricing and become “prohibitive,” pushing them to evaluate alternatives. 
Transaction fee layering and “who pays fees” pain: platforms like Join It directly add a 1.5%–3.0% service fee on top of Stripe processing fees. 
 This tends to be tolerated until dues volume grows.
These are your best early converters because they already pay for software, but they’re emotionally ready to switch if you make it low-risk and faster.

Not-yet-formalized
These clubs don’t have “a system.” They run on:

spreadsheets for membership lists,
group chats for updates,
a website/CMS for the public face,
manual payments (cash, e-transfer, checks), and
Google Forms or email threads for events.
They are “new logo friendly” and cheaper to win if your onboarding is smooth. But they also churn faster if leadership changes or the club remains casual.

Practical switching scorecard
Prioritize prospects with:

recurring dues (annual or monthly) and renewals anxiety,
volunteer-run admin with low capacity for complex tools,
an existing website they do not want to rebuild,
visible event activity,
frustration with contact tiers or transaction add-on fees. 
Competitor audit and what the example sites show
Competitor comparison table
Vendor	Primary value promise	Website posture	Payments posture	Pricing posture	Notable “why switch” signal
ClubExpress	All‑in‑one: membership database + website + events + comms	Strong website builder & content modules are core. 
Built-in payments with “Basic” vs “Premium” processing; Premium pays out 3x/month; example rates shown. 
Per active member + minimum monthly hosting fee. 
Member experience and admin UX can be heavy; join flows can be multi-step on real sites. 
WildApricot	All‑in‑one membership platform (market perception)	Website builder is part of value (often criticized in reviews)	Payment handling varies; users cite surcharges if not using the offered provider (review) 
Pricing pressure tied to contact limits (explicit user complaints). 
“Contacts vs members” pricing creates growth tax and prospect capture disincentives. 
Join It	“Organized, automated memberships” (import, renewals, portal) 
Positioned as membership system with optional website builder; integrates with other tools. 
Monthly fee + service fee; Stripe fees applied separately. 
Hybrid: SaaS fee + % rake, decreasing at higher tiers. 
As dues volume grows, blended % fee becomes noticeable (switch trigger). 
Memberful	Creator-style membership business tooling + checkout	Explicit website/newsletter builder included. 
Transaction-fee business model	$49/month + 4.9% transaction fee (Standard). 
Clubs may balk at high transaction rake compared to pure dues tools. 

What your provided ClubExpress customer sites reveal
Across the sample pages:

There is a consistent public “front door” + member portal pattern (member login, mailing list signup, cart, event views), and explicit vendor branding in footers (“Powered By”). 
Event pages show detailed “Event View” patterns with calendar integration prompts and registration rules. 
Mailing list capture is a first-class concept (“Add Me To Your Mailing List”). 
At least one “Join” flow is explicitly a long multi-step wizard (9 steps). 
A parent-group site’s published membership terms explicitly state: the “Members Only Site is maintained and hosted by ClubExpress,” and payment fees may be passed to members. 
Implication for ClubLounge’s story
Your story is still convincing if you stop competing on “website richness” and instead compete on:

“drop-in membership layer” that attaches to an existing site,
faster join/pay/renew UX,
simpler admin model for volunteers,
pricing that avoids contact-tax and avoids heavy transaction rake.
If you try to out‑website the website-first incumbents early, you’ll lose time and margin.

Product positioning and the minimum public-facing layer
System-of-record vs system-of-engagement
Incumbents show two archetypes:

Website-first system-of-record: the website is the product center; membership database, events, documents, email are modules inside the same portal. This is visible in ClubExpress’s own product tour and in customer sites. 
Membership automation platform: emphasize renewals automation, import, dashboards, member portal; integrate out to other tools; monetize with SaaS + transaction rake. 
For ClubLounge’s first 50 customers, your highest-probability wedge is:

System-of-record for dues + membership access (must be reliable)
Light system-of-engagement (must be pleasant and fast)
No requirement to rebuild the website
Minimum public-facing feature set
To win against “solved problem” alternatives while staying lean, implement a public layer that is just enough to replace the membership parts of a website, not the entire website.

Minimum set:

Public club page: about, dues tiers, join button, contact info, basic SEO.
Public events listing: upcoming events (subset), “members-only events” gated.
Join/pay flow: 1–2 screens, mobile-first, receipts, renewal date.
Prospect capture: “Subscribe for updates” (mailing list), because incumbents treat it as core. 
Embeds: “Join” button and “Upcoming events” widget to paste into an existing site (the fastest path for clubs already on a CMS).
Why this matters: you can beat the long sign-up wizard pattern (9 steps) shown on a real customer site by delivering a dramatically simpler join flow. 

What you should not build in the first 90 days
Full drag‑and‑drop website builder
Full theme system
General CMS pages and complex navigation
E-commerce storefront
Those are expensive to build and already deeply commoditized by the incumbents you named.

Infrastructure cost drivers and unit economics
Your profitability risk is not Stripe card fees (those are pass-through); it’s usage you can’t cap (emails, domains, MAU, bandwidth) and support time.

Cost driver table mapped to your stack
Vendor	Meter that matters	Included quota (selected)	Overage pricing (selected)	ClubLounge driver	How to control it
Vercel	Hosted compute + edge requests + data transfer	Pro is $20/mo + usage credit; Edge Requests and Fast Data Transfer have included amounts by plan. 
Edge Requests billed after included; Fast Data Transfer overage starts at $0.15/GB. 
Public pages + API usage, especially assets and event pages	Cache public pages; minimize payload sizes; meter “public page views” only if abused
Supabase	MAU, egress, DB size, storage, function invocations	Pro/Team: 250GB egress included then $0.09/GB; 100k MAU included then $0.00325/MAU; 8GB DB included then $0.125/GB; 100GB storage included then $0.021/GB. 
As clubs scale member logins and store docs/media, you can hit MAU/storage	Design multi-tenant carefully; meter “active members” by plan; keep media off core DB; encourage external links for big files initially	
Resend	Email volume + domains	Pro: $20/mo for 50k emails; extra $0.90/1k; 10 domains. Scale: $90/mo for 100k; extra $0.90/1k; 1,000 domains. 
Announcement blasts + digests create sudden spikes	Enforce per-plan email quotas; offer paid email packs; delay “custom sending domains” until higher tier	
Stripe	Card processing + platform fees (if using Connect)	Canada pricing page shows 2.9% + CA$0.30 per domestic successful transaction. 
Your “payments layer” is the product, but fees generally aren’t your COGS unless you subsidize	Default to pass-through; optionally charge a platform fee; avoid absorbing fees early	
Stripe Connect (if you use it)	Per connected account + per payout (depending on model)	If “Stripe handles pricing,” no fees for your platform; if “you handle pricing,” CA$2 per monthly active account and 0.25% + CA$0.25 per payout. 
Multi-tenant payout routing can become costly if you choose a priced Connect mode	Use Standard accounts / “Stripe handles pricing” when possible; only move to priced Connect mode for high-tier customers	

Key unit economics insight
Your core infra costs (hosting + DB + email) can remain low at low-to-mid scale if you meter emails and limit premium domain features.
The biggest non-obvious profitability trap is “unlimited” promises that map directly to vendor limits: unlimited digest emails and unlimited branded domains can push you into higher tiers fast. 
If you implement a marketplace-like payout model using priced Connect, your marginal cost includes per active account and per payout. 

Design so that most clubs can use a cheaper payments configuration, and reserve complex payout routing for higher tiers.
Simple revenue model (illustrative)
Assumptions (explicitly unspecified by you today): average plan mix = 10% low tier, 60% mid tier, 30% growth tier; minimal email usage; single sending domain in early stage.

Clubs	Example MRR (mix-based)	Example annual run-rate	Notes
50	~$3,000	~$36,000	Profitable on infra very early; the real constraint is founder support time
200	~$12,000	~$144,000	You must have migration tooling + strict onboarding to avoid service-heavy churn
1,000	~$60,000	~$720,000	At this scale, MAU and email domains become real constraints; enterprise tiers matter

These numbers are directional and should be replaced with your real plan mix + churn + usage once you have 10–20 paying clubs.

Pricing architecture, migration GTM, and a 90-day plan
What your current pricing gets right and where it risks you
Your current structure (Hobby $5 up to 20 members; Starter $49 unlimited members; Community $99; Club Pro $199) is easy to understand, and it tracks feature sophistication. The risk is that it offers unlimited members starting at $49, while also adding weekly digest emails and analytics in the $99 tier—both can scale usage quickly. (Your own page copy also promises “No per-contact fees” and “Grow all you want,” which sets an expectation you’ll need to manage.)

The market shows why limits exist:

ClubExpress charges by active members and even frames it as an advantage vs per-contact pricing. 
Join It explicitly uses a monthly + % service fee model to keep packages accessible and align incentives. 
Memberful uses a monthly + transaction fee model. 
So it’s normal for this category to meter either “size” or “transaction volume.” Your opportunity is to do it more transparently and with a better default member experience.

Recommended pricing architecture
Use a hybrid approach:

Tier by club size (active members) and admin seats
This matches the mental model of club operators and is consistent with incumbents. 
Meter email volume as a usage add-on
Email is your most obvious variable cost. 
Offer an optional “Flex / $0 monthly + small platform fee” plan
This is your category-creation lever: it makes adoption frictionless for informal clubs, while still paying you when the club succeeds. It is also familiar: competitors already add transaction fees. 
A concrete tier set to replace “unlimited everything”
This keeps your current 4-tier simplicity, but adds soft limits aligned to cost and value.

Plan	Target club	Price (monthly)	Included active members	Admin seats	Emails included	Key features
Hobby	tiny / informal	CA$9	25	1	300	directory, events RSVP, announcements, discussions, basic join link (no payments)
Core	most small clubs	CA$39	150	3	1,500	dues via Stripe, renewals, member directory + approvals, member-only posts, basic reports
Community	active clubs	CA$79	400	7	5,000	digest emails, calendar sync, invites, simple analytics, priority support
Pro	large / complex	CA$149	1,500	unlimited	20,000	multi-tier memberships, API/export, SSO/custom auth option, white-label + onboarding

Add-ons:

Email packs: CA$10 per additional 5,000 emails (priced above your marginal email cost, but easy)
Custom sending domain: available only on Pro (because of vendor domain limits) 
Concierge onboarding: CA$299–CA$999 depending on data complexity (migration + setup)
This is “tiered by size,” not “per-member billing,” but it preserves the headline simplicity while protecting your margins.

Flex plan for category creation (optional but powerful)
Flex: CA$0/month + 1.0% platform fee on dues collected (club chooses whether to pass this to members)
Keep it capped (e.g., max CA$250/month) so it doesn’t feel punitive
This directly counters the “contact tax” complaint dynamics: clubs can capture leads and prospects without fearing they’ll be billed for every email address. 

Payments and fee handling guidance
Do not absorb payment processing fees by default.

Evidence that the market already expects layered fees:

Join It clearly states Stripe processing fees are separate from its service fee. 
ClubExpress has multiple processing configurations and even adds a non-member “technology convenience fee” schedule in some cases. 
The SMMC membership terms acknowledge third-party fees may be passed to members. 
Recommended defaults:

Club pays Stripe processing fees (simple, less member friction)
Optional toggle: member pays a “processing fee” line item (only with policy/legal review by jurisdiction; this is operationally common but rules vary)
Migration and GTM tactics
ICP for the first 50 paying clubs
Focus on clubs that:

have 50–300 members,
collect dues annually or semi-annually,
run frequent events,
already have a website they want to keep,
have a volunteer admin team,
complain about either (a) contact-based pricing or (b) layered service fees at scale. 
Concrete vertical starting points (mirrors what incumbents target, proving demand density):

parent groups, cycling clubs, skiing/sports clubs, hobbyist groups. 
Outreach script (email / DM)
Subject: “Quick question about dues + renewals for [Club Name]”

Body:

Hi [Name] — I’m building ClubLounge to make dues, renewals, and member access painless without rebuilding your website.
I noticed your club runs events and memberships.
Could I ask 5 quick questions about how you handle renewals + payments today? If it’s relevant, I’ll share a 2‑minute demo at the end.
Either way, I’ll send back a short summary of what I’m seeing across clubs like yours.

Customer interview questions
Keep it structured around switching signals:

How do you collect dues today? What breaks at renewal time?
What % of members renew late? Why?
What happens when leadership changes?
Where is the “source of truth” for membership status?
What’s your current site stack? Would you rebuild it? Why/not?
What do you pay today (software + transaction fees + volunteer hours)?
If you could fix one thing this month, what would it be?
Onboarding flow
Borrow the “guided setup” expectations that Join It markets (setup → import → automate renewals → empower members). 

Create club → connect payments → create membership tier(s) → import members → send invites → embed join + events on existing site → schedule renewals reminders → publish basic public page
Customer journey flowchart
mermaid
Copy
flowchart TD
  A[Prospect discovers ClubLounge] --> B[Admin creates club workspace]
  B --> C[Connect payments]
  C --> D[Create membership tier(s)]
  D --> E[Publish join link / embed on existing site]
  E --> F[Member joins & pays]
  F --> G[Member gets access to member area]
  G --> H[Events RSVP / announcements / discussions]
  H --> I[Automated renewal reminders]
  I --> J[Renewal payment succeeds]
  I --> K[Failed payment -> admin alert + member prompt]
Risks and mitigations
Risk: “Solved problem” skepticism
Mitigation: narrow your promise to “drop-in membership ops layer,” not “full club website.” Your differentiation is integration + UX + speed, not breadth.

Risk: unlimited usage wrecks margins
Mitigation: replace “unlimited” with soft limits + add-ons, especially for emails and domains. 

Risk: payments configuration costs (Connect fees)
Mitigation: architect around the lower-cost mode where possible (“Stripe handles pricing” / Standard accounts), and reserve priced payout routing for Pro. 

Risk: migration pain / churn after leadership turnover
Mitigation: invest early in import tooling + clean handoff docs; offer paid concierge onboarding; keep admin UX minimal.

Prioritized roadmap and next 90-day plan
Time window	Focus	Owner	Deliverable	Success metric
Weeks 1–2	Category + ICP validation	Founder	15 interviews, 5 recorded demos, finalized positioning page	5 clubs agree to pilot with real dues collection
Weeks 3–6	Public front door MVP	Founder/Engineering	Public club page + join/pay + public events + embed widgets	30%+ visit→join conversion on pilot clubs’ join pages
Weeks 7–10	Migration + activation	Founder/Engineering	CSV import, invite flows, renewal schedule, basic analytics	70% of pilots complete setup without founder touching data
Weeks 11–13	Pricing + packaging + launch	Founder	New tiered plans + email add-ons + Flex option + comparison page	10 paying clubs; <2 hrs/week support per club cohort

Core metrics to track from day one:

Club activation rate (payments connected + membership tier created + first member paid)
Join conversion (public page view → payment)
Renewal success rate
Emails sent per club per month (by type: transactional vs announcements)
Support load (tickets per active club per week)
Gross margin proxy (MRR – variable infra costs)