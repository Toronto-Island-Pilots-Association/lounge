export type MembershipLevel = 'basic' | 'cadet' | 'captain'
export type UserRole = 'member' | 'admin'

export interface UserProfile {
  id: string
  email: string
  full_name: string | null
  first_name: string | null
  last_name: string | null
  phone: string | null
  pilot_license_type: string | null
  aircraft_type: string | null
  call_sign: string | null
  how_often_fly_from_ytz: string | null
  how_did_you_hear: string | null
  role: UserRole
  membership_level: MembershipLevel
  membership_expires_at: string | null
  paypal_subscription_id: string | null
  profile_picture_url: string | null
  created_at: string
  updated_at: string
}

export interface Resource {
  id: string
  title: string
  description: string | null // HTML content from rich text editor
  created_at: string
  updated_at: string
}

export interface Event {
  id: string
  title: string
  description: string | null
  location: string | null
  start_time: string
  end_time: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Thread {
  id: string
  title: string
  content: string
  created_by: string
  created_at: string
  updated_at: string
  author?: UserProfile
  comment_count?: number
}

export interface Comment {
  id: string
  thread_id: string
  content: string
  created_by: string
  created_at: string
  updated_at: string
  author?: UserProfile
}

export type ReactionType = 'like' | 'upvote' | 'downvote'

export interface Reaction {
  id: string
  thread_id: string | null
  comment_id: string | null
  user_id: string
  reaction_type: ReactionType
  created_at: string
}

