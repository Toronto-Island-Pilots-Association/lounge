export type MembershipLevel = 'Full' | 'Student' | 'Associate' | 'Corporate' | 'Honorary'

// Helper function to get display name for membership level (now just returns the value)
export function getMembershipLevelLabel(level: MembershipLevel): string {
  return level
}
export type UserRole = 'member' | 'admin'
export type UserStatus = 'pending' | 'approved' | 'rejected' | 'expired'

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
  status: UserStatus
  membership_expires_at: string | null
  paypal_subscription_id: string | null
  profile_picture_url: string | null
  member_number: string | null
  is_student_pilot: boolean
  flight_school: string | null
  instructor_name: string | null
  created_at: string
  updated_at: string
}

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
}

export type DiscussionCategory = 'aircraft_shares' | 'instructor_availability' | 'gear_for_sale' | 'other'

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

