export type MembershipLevel = 'free' | 'paid'
export type UserRole = 'member' | 'admin'

export interface UserProfile {
  id: string
  email: string
  full_name: string | null
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
  description: string | null
  url: string | null
  content: string | null
  resource_type: 'link' | 'document' | 'video' | 'other'
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

