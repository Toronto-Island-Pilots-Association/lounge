export interface Organization {
  id: string
  name: string
  slug: string
  plan?: string
  custom_domain: string | null
  subdomain: string | null
  logo_url: string | null
  favicon_url?: string | null
  stripe_account_id?: string | null
  stripe_onboarding_complete?: boolean
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  created_at: string
  updated_at: string
}

export const TIPA_ORG_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

// Open string — orgs define their own levels via membership_levels_config setting.
// The defaults (Full, Student, Associate, Corporate, Honorary) are seeded for all orgs.
export type MembershipLevel = string

export function getMembershipLevelLabel(level: MembershipLevel): string {
  return level
}
export type UserRole = 'member' | 'admin'
export type UserStatus = 'pending' | 'approved' | 'rejected' | 'expired'

/** Global identity — one row per user across all orgs. */
export interface UserProfile {
  id: string        // surrogate UUID
  user_id: string   // auth.users.id
  email: string
  full_name: string | null
  first_name: string | null
  last_name: string | null
  phone: string | null
  // Mailing Address
  street: string | null
  city: string | null
  province_state: string | null
  postal_zip_code: string | null
  country: string | null
  profile_picture_url: string | null
  notify_replies: boolean
  created_at: string
  updated_at: string
}

/** Per-org membership — one row per (user, org) pair. */
export interface OrgMembership {
  id: string        // surrogate UUID
  user_id: string   // auth.users.id
  org_id: string    // organizations.id
  role: UserRole
  status: UserStatus
  membership_level: MembershipLevel
  membership_class: string | null
  member_number: string | null
  membership_expires_at: string | null
  invited_at: string | null
  last_reminder_sent_at: string | null
  reminder_count: number | null
  stripe_subscription_id: string | null
  stripe_customer_id: string | null
  paypal_subscription_id: string | null
  subscription_cancel_at_period_end: boolean | null
  // Application fields
  statement_of_interest: string | null
  interests: string | null
  how_did_you_hear: string | null
  // COPA Membership
  is_copa_member: string | null
  join_copa_flight_32: string | null
  copa_membership_number: string | null
  // Aviation Information (TIPA-specific; other orgs use custom_data)
  pilot_license_type: string | null
  aircraft_type: string | null
  call_sign: string | null
  how_often_fly_from_ytz: string | null
  is_student_pilot: boolean
  flight_school: string | null
  instructor_name: string | null
  // Org-defined custom signup fields
  custom_data: Record<string, unknown> | null
  created_at: string
  updated_at: string
  /** Server-computed trial end. Set by admin members API. */
  trial_end?: string | null
  /** Latest payment summary from admin members API. */
  payment_summary?: { amount: number; currency: string; payment_method: string } | null
}

/**
 * Flattened join of UserProfile + OrgMembership — mirrors the member_profiles view.
 * Use this everywhere a "full member record" is needed.
 * `id` refers to org_memberships.id (the org-scoped record).
 */
export type MemberProfile = OrgMembership & Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>

export type ResourceType = 'link' | 'document' | 'video' | 'other'
export type ResourceCategory = 'tipa_newsletters' | 'airport_updates' | 'reminder' | 'other'

export interface Resource {
  id: string
  title: string
  description: string | null // HTML content from rich text editor (preview/short description)
  content: string | null // Full blog post content (HTML)
  url: string | null // External link URL (if resource is an external link)
  resource_type: ResourceType
  category: ResourceCategory
  image_url: string | null
  file_url: string | null
  file_name: string | null
  created_at: string
  updated_at: string
}

export interface Event {
  id: string
  title: string
  description: string | null
  location: string | null
  image_url: string | null
  start_time: string
  end_time: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  /** Number of RSVPs (included from API) */
  rsvp_count?: number
  /** Whether the current user has RSVPed (included from API) */
  user_rsvped?: boolean
}

export interface EventRsvp {
  id: string
  user_id: string
  display_name: string
  profile_picture_url?: string | null
  created_at: string
}

export type DiscussionCategory = 'introduce_yourself' | 'aircraft_shares' | 'instructor_availability' | 'gear_for_sale' | 'flying_at_ytz' | 'general_aviation' | 'training_safety_proficiency' | 'wanted' | 'building_a_better_tipa' | 'other'

export interface Thread {
  id: string
  title: string
  content: string
  category: DiscussionCategory
  created_by: string | null
  author_email?: string | null
  image_urls?: string[] | null
  created_at: string
  updated_at: string
  author?: UserProfile
  comment_count?: number
}

// Partial author type for thread listings (only fields we select)
export type ThreadAuthor = {
  id: string
  full_name: string | null
  email: string
  profile_picture_url: string | null
}

// Extended thread type with additional computed fields
export type ThreadWithData = Omit<Thread, 'author' | 'comment_count'> & {
  comment_count: number
  latest_comment_at: Date | null
  author?: ThreadAuthor
}

export interface Comment {
  id: string
  thread_id: string
  content: string
  created_by: string | null
  author_email?: string | null
  image_urls?: string[] | null
  created_at: string
  updated_at: string
  author?: UserProfile
}

export type ReactionType = 'like'

export interface Reaction {
  id: string
  thread_id: string | null
  comment_id: string | null
  user_id: string
  reaction_type: ReactionType
  created_at: string
}


export type PaymentMethod = 'stripe' | 'paypal' | 'cash' | 'wire'
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded'

export interface Payment {
  id: string
  user_id: string
  payment_method: PaymentMethod
  amount: number
  currency: string
  payment_date: string
  membership_expires_at: string
  stripe_subscription_id: string | null
  stripe_payment_intent_id: string | null
  paypal_subscription_id: string | null
  paypal_transaction_id: string | null
  recorded_by: string | null
  notes: string | null
  status: PaymentStatus
  created_at: string
  updated_at: string
  // Joined fields
  user?: UserProfile
  recorded_by_user?: UserProfile
}
